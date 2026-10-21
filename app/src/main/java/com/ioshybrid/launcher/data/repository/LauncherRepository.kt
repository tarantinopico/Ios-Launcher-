package com.ioshybrid.launcher.data.repository

import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ApplicationInfo
import android.content.pm.LauncherApps
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.media.AudioManager
import android.net.Uri
import android.os.BatteryManager
import android.os.Build
import android.os.Environment
import android.os.Process
import android.os.StatFs
import android.util.LruCache
import com.ioshybrid.launcher.data.model.AppItem
import com.ioshybrid.launcher.data.model.BatteryInfo
import com.ioshybrid.launcher.data.model.DeviceFileItem
import com.ioshybrid.launcher.data.model.SystemMetricsInfo
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.text.Collator
import java.util.Locale
import kotlin.math.roundToInt
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext

class LauncherRepository(private val context: Context) {

    private val appContext = context.applicationContext
    private val packageManager: PackageManager = appContext.packageManager
    private val stateMutex = Mutex()
    val fileSearchHelper = FileSearchHelper(appContext)

    private val stateFileV3: File
        get() = File(appContext.filesDir, STATE_FILE_NAME_V3)

    private val tempStateFileV3: File
        get() = File(appContext.filesDir, "$STATE_FILE_NAME_V3.tmp")

    private val stateFileV2: File
        get() = File(appContext.filesDir, STATE_FILE_NAME_V2)

    private val stateFileV1: File
        get() = File(appContext.filesDir, STATE_FILE_NAME_V1)

    val customWallpaperFile: File
        get() = File(appContext.filesDir, CUSTOM_WALLPAPER_FILE_NAME)

    private val iconCache = object : LruCache<String, ByteArray>(ICON_CACHE_MAX_BYTES) {
        override fun sizeOf(key: String, value: ByteArray): Int = value.size
    }

    @Volatile
    private var cachedApps: List<AppItem> = emptyList()

    suspend fun loadInstalledApps(forceRefresh: Boolean = false): List<AppItem> =
        withContext(Dispatchers.IO) {
            if (!forceRefresh && cachedApps.isNotEmpty()) {
                return@withContext cachedApps
            }
            val apps = queryInstalledAppsInternal()
            cachedApps = apps
            apps
        }

    fun getInstalledAppsBlocking(): List<AppItem> {
        val current = cachedApps
        if (current.isNotEmpty()) return current
        val queried = queryInstalledAppsInternal()
        cachedApps = queried
        return queried
    }

    private fun queryInstalledAppsInternal(): List<AppItem> {
        val result = mutableMapOf<String, AppItem>()
        val myPackageName = appContext.packageName

        try {
            val launcherApps = appContext.getSystemService(Context.LAUNCHER_APPS_SERVICE) as? LauncherApps
            val activityList = launcherApps?.getActivityList(null, Process.myUserHandle()).orEmpty()

            if (activityList.isNotEmpty()) {
                for (info in activityList) {
                    val pkg = info.applicationInfo.packageName
                    if (pkg == myPackageName) continue

                    val label = info.label?.toString()?.trim().takeUnless { it.isNullOrEmpty() } ?: pkg
                    val className = info.componentName?.className ?: ""
                    val flags = info.applicationInfo.flags
                    val isSystem = (flags and ApplicationInfo.FLAG_SYSTEM) != 0 &&
                        (flags and ApplicationInfo.FLAG_UPDATED_SYSTEM_APP) == 0
                    val installTime = readPackageFirstInstallTime(pkg)

                    result[pkg] = AppItem(
                        label = label,
                        packageName = pkg,
                        className = className,
                        isSystemApp = isSystem,
                        firstInstallTime = installTime
                    )
                }
            }
        } catch (_: Exception) {
            // Fallback to PackageManager queryIntentActivities below
        }

        if (result.isEmpty()) {
            try {
                val mainIntent = Intent(Intent.ACTION_MAIN, null).apply {
                    addCategory(Intent.CATEGORY_LAUNCHER)
                }
                val resolveInfos = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    packageManager.queryIntentActivities(
                        mainIntent,
                        PackageManager.ResolveInfoFlags.of(0L)
                    )
                } else {
                    @Suppress("DEPRECATION")
                    packageManager.queryIntentActivities(mainIntent, 0)
                }

                for (resolveInfo in resolveInfos) {
                    val activityInfo = resolveInfo.activityInfo ?: continue
                    val pkg = activityInfo.packageName ?: continue
                    if (pkg == myPackageName) continue

                    val label = resolveInfo.loadLabel(packageManager)?.toString()?.trim()
                        .takeUnless { it.isNullOrEmpty() } ?: pkg
                    val className = activityInfo.name ?: ""
                    val appInfo = activityInfo.applicationInfo
                    val isSystem = appInfo != null &&
                        (appInfo.flags and ApplicationInfo.FLAG_SYSTEM) != 0 &&
                        (appInfo.flags and ApplicationInfo.FLAG_UPDATED_SYSTEM_APP) == 0
                    val installTime = readPackageFirstInstallTime(pkg)

                    result[pkg] = AppItem(
                        label = label,
                        packageName = pkg,
                        className = className,
                        isSystemApp = isSystem,
                        firstInstallTime = installTime
                    )
                }
            } catch (_: Exception) {
                // Return safe fallback list if restricted
            }
        }

        val collator = Collator.getInstance(Locale.getDefault()).apply {
            strength = Collator.PRIMARY
        }
        return result.values.sortedWith { a, b ->
            collator.compare(a.label, b.label)
        }
    }

    private fun readPackageFirstInstallTime(packageName: String): Long {
        return try {
            val pkgInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                packageManager.getPackageInfo(
                    packageName,
                    PackageManager.PackageInfoFlags.of(0L)
                )
            } else {
                @Suppress("DEPRECATION")
                packageManager.getPackageInfo(packageName, 0)
            }
            pkgInfo.firstInstallTime
        } catch (_: Exception) {
            0L
        }
    }

    fun getAppIconPngBytes(packageName: String): ByteArray {
        val cleanPkg = packageName.trim()
        if (cleanPkg.isEmpty()) {
            return renderFallbackIconPng("?")
        }

        iconCache.get(cleanPkg)?.let { return it }

        val drawable: Drawable? = try {
            val launcherApps = appContext.getSystemService(Context.LAUNCHER_APPS_SERVICE) as? LauncherApps
            val activityList = launcherApps?.getActivityList(cleanPkg, Process.myUserHandle()).orEmpty()
            if (activityList.isNotEmpty()) {
                activityList.first().getBadgedIcon(0)
            } else {
                packageManager.getApplicationIcon(cleanPkg)
            }
        } catch (_: Exception) {
            null
        }

        val pngBytes = if (drawable != null) {
            drawableToPngBytes(drawable)
        } else {
            val label = cachedApps.firstOrNull { it.packageName == cleanPkg }?.label ?: cleanPkg
            renderFallbackIconPng(label)
        }

        iconCache.put(cleanPkg, pngBytes)
        return pngBytes
    }

    fun invalidateIconCache(packageName: String? = null) {
        if (packageName.isNullOrBlank()) {
            iconCache.evictAll()
        } else {
            iconCache.remove(packageName)
        }
    }

    private fun drawableToPngBytes(drawable: Drawable): ByteArray {
        if (drawable is BitmapDrawable && drawable.bitmap != null && !drawable.bitmap.isRecycled) {
            val scaled = Bitmap.createScaledBitmap(
                drawable.bitmap,
                ICON_RENDER_SIZE_PX,
                ICON_RENDER_SIZE_PX,
                true
            )
            val out = ByteArrayOutputStream()
            scaled.compress(Bitmap.CompressFormat.PNG, 100, out)
            return out.toByteArray()
        }

        val bitmap = Bitmap.createBitmap(
            ICON_RENDER_SIZE_PX,
            ICON_RENDER_SIZE_PX,
            Bitmap.Config.ARGB_8888
        )
        val canvas = Canvas(bitmap)
        drawable.setBounds(0, 0, canvas.width, canvas.height)
        drawable.draw(canvas)

        val out = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
        return out.toByteArray()
    }

    private fun renderFallbackIconPng(label: String): ByteArray {
        val bitmap = Bitmap.createBitmap(
            ICON_RENDER_SIZE_PX,
            ICON_RENDER_SIZE_PX,
            Bitmap.Config.ARGB_8888
        )
        val canvas = Canvas(bitmap)

        val bgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#1C2536")
            style = Paint.Style.FILL
        }
        canvas.drawRoundRect(
            RectF(0f, 0f, ICON_RENDER_SIZE_PX.toFloat(), ICON_RENDER_SIZE_PX.toFloat()),
            44f,
            44f,
            bgPaint
        )

        val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#0A84FF")
            textSize = 84f
            textAlign = Paint.Align.CENTER
            isFakeBoldText = true
        }
        val initial = label.trim().firstOrNull()?.uppercaseChar()?.toString() ?: "A"
        val yPos = (canvas.height / 2f) - ((textPaint.descent() + textPaint.ascent()) / 2f)
        canvas.drawText(initial, canvas.width / 2f, yPos, textPaint)

        val out = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
        return out.toByteArray()
    }

    fun readCurrentBatteryInfo(): BatteryInfo {
        return try {
            val sticky = appContext.registerReceiver(
                null,
                IntentFilter(Intent.ACTION_BATTERY_CHANGED)
            )
            parseBatteryIntent(sticky)
        } catch (_: Exception) {
            BatteryInfo(level = 85, isCharging = false, temperature = 26.5f)
        }
    }

    fun parseBatteryIntent(intent: Intent?): BatteryInfo {
        if (intent == null) {
            return BatteryInfo(level = 85, isCharging = false, temperature = 26.5f)
        }
        val level = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
        val scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, -1)
        val pct = if (level >= 0 && scale > 0) {
            ((level.toFloat() / scale.toFloat()) * 100f).toInt().coerceIn(0, 100)
        } else {
            85
        }

        val status = intent.getIntExtra(BatteryManager.EXTRA_STATUS, -1)
        val plugged = intent.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0)
        val isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING ||
            status == BatteryManager.BATTERY_STATUS_FULL ||
            plugged != 0

        val tempTenths = intent.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, 265)
        val tempCelsius = (tempTenths / 10f).coerceIn(-20f, 80f)

        return BatteryInfo(
            level = pct,
            isCharging = isCharging,
            temperature = tempCelsius
        )
    }

    fun readSystemMetrics(): SystemMetricsInfo {
        var ramUsedPercent = 48
        var ramUsedGb = 3.8f
        var ramTotalGb = 8.0f

        try {
            val activityManager = appContext.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
            if (activityManager != null) {
                val memInfo = ActivityManager.MemoryInfo()
                activityManager.getMemoryInfo(memInfo)
                val totalBytes = memInfo.totalMem.coerceAtLeast(1L)
                val availBytes = memInfo.availMem.coerceIn(0L, totalBytes)
                val usedBytes = (totalBytes - availBytes).coerceAtLeast(0L)

                ramUsedPercent = ((usedBytes.toDouble() / totalBytes.toDouble()) * 100.0)
                    .roundToInt()
                    .coerceIn(1, 99)
                ramTotalGb = ((totalBytes.toDouble() / (1024.0 * 1024.0 * 1024.0)) * 10.0)
                    .roundToInt() / 10f
                ramUsedGb = ((usedBytes.toDouble() / (1024.0 * 1024.0 * 1024.0)) * 10.0)
                    .roundToInt() / 10f
            }
        } catch (_: Exception) {
            // Keep safe defaults
        }

        var storageUsedPercent = 42
        var storageFreeGb = 74.2f
        var storageTotalGb = 128.0f

        try {
            val dataDir = Environment.getDataDirectory()
            val statFs = StatFs(dataDir.path)
            val totalBytes = statFs.totalBytes.coerceAtLeast(1L)
            val freeBytes = statFs.availableBytes.coerceIn(0L, totalBytes)
            val usedBytes = (totalBytes - freeBytes).coerceAtLeast(0L)

            storageUsedPercent = ((usedBytes.toDouble() / totalBytes.toDouble()) * 100.0)
                .roundToInt()
                .coerceIn(1, 99)
            storageTotalGb = ((totalBytes.toDouble() / (1024.0 * 1024.0 * 1024.0)) * 10.0)
                .roundToInt() / 10f
            storageFreeGb = ((freeBytes.toDouble() / (1024.0 * 1024.0 * 1024.0)) * 10.0)
                .roundToInt() / 10f
        } catch (_: Exception) {
            // Keep safe defaults
        }

        return SystemMetricsInfo(
            ramUsedPercent = ramUsedPercent,
            ramUsedGb = ramUsedGb,
            ramTotalGb = ramTotalGb,
            storageUsedPercent = storageUsedPercent,
            storageFreeGb = storageFreeGb,
            storageTotalGb = storageTotalGb
        )
    }

    fun isMusicCurrentlyActive(): Boolean {
        return try {
            val audioManager = appContext.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
            audioManager?.isMusicActive == true
        } catch (_: Exception) {
            false
        }
    }

    /**
     * Načte uložený stav Launcheru.
     * Preferuje V3 (`launcher_state_v3.json`), případně automaticky migruje z V2 (`launcher_state_v2.json`)
     * nebo V1 (`launcher_state_v1.json`).
     */
    fun loadLauncherStateBlocking(): String {
        return try {
            when {
                stateFileV3.exists() && stateFileV3.length() > 0L -> {
                    stateFileV3.readText(Charsets.UTF_8)
                }
                stateFileV2.exists() && stateFileV2.length() > 0L -> {
                    stateFileV2.readText(Charsets.UTF_8)
                }
                stateFileV1.exists() && stateFileV1.length() > 0L -> {
                    stateFileV1.readText(Charsets.UTF_8)
                }
                else -> ""
            }
        } catch (_: Exception) {
            ""
        }
    }

    /**
     * Atomický zápis stavu Launcheru do `launcher_state_v3.json` (a synchronizace do `launcher_state_v2.json`).
     */
    suspend fun saveLauncherState(jsonContent: String): Boolean =
        withContext(Dispatchers.IO) {
            stateMutex.withLock {
                saveLauncherStateInternal(jsonContent)
            }
        }

    fun saveLauncherStateBlocking(jsonContent: String): Boolean {
        return saveLauncherStateInternal(jsonContent)
    }

    private fun saveLauncherStateInternal(jsonContent: String): Boolean {
        if (jsonContent.isBlank()) return false
        return try {
            tempStateFileV3.writeText(jsonContent, Charsets.UTF_8)
            if (stateFileV3.exists()) {
                stateFileV3.delete()
            }
            val renamed = tempStateFileV3.renameTo(stateFileV3)
            if (!renamed) {
                stateFileV3.writeText(jsonContent, Charsets.UTF_8)
                tempStateFileV3.delete()
            }
            // Zároveň udržujeme kompatibilní kopii ve V2 souboru
            try {
                stateFileV2.writeText(jsonContent, Charsets.UTF_8)
            } catch (_: Exception) {
            }
            true
        } catch (_: Exception) {
            false
        }
    }

    suspend fun saveCustomWallpaperFromUri(uri: Uri): Boolean =
        withContext(Dispatchers.IO) {
            try {
                appContext.contentResolver.openInputStream(uri)?.use { input ->
                    val tempWallpaper = File(appContext.filesDir, "$CUSTOM_WALLPAPER_FILE_NAME.tmp")
                    FileOutputStream(tempWallpaper).use { output ->
                        input.copyTo(output)
                    }
                    if (customWallpaperFile.exists()) {
                        customWallpaperFile.delete()
                    }
                    if (!tempWallpaper.renameTo(customWallpaperFile)) {
                        tempWallpaper.copyTo(customWallpaperFile, overwrite = true)
                        tempWallpaper.delete()
                    }
                    true
                } ?: false
            } catch (_: Exception) {
                false
            }
        }

    fun hasCustomWallpaper(): Boolean {
        return customWallpaperFile.exists() && customWallpaperFile.length() > 0L
    }

    fun hasFilePermissions(): Boolean {
        return fileSearchHelper.hasFilePermissions()
    }

    fun searchDeviceFiles(
        query: String,
        allowedCategoriesJson: String,
        limit: Int = 45
    ): List<DeviceFileItem> {
        return fileSearchHelper.searchDeviceFiles(query, allowedCategoriesJson, limit)
    }

    companion object {
        private const val ICON_RENDER_SIZE_PX = 192
        private const val ICON_CACHE_MAX_BYTES = 16 * 1024 * 1024 // 16 MB LruCache
        private const val STATE_FILE_NAME_V1 = "launcher_state_v1.json"
        private const val STATE_FILE_NAME_V2 = "launcher_state_v2.json"
        private const val STATE_FILE_NAME_V3 = "launcher_state_v3.json"
        const val CUSTOM_WALLPAPER_FILE_NAME = "custom_wallpaper.jpg"
    }
}

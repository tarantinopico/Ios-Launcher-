package com.ioshybrid.launcher.bridge

import android.annotation.SuppressLint
import android.app.ActivityOptions
import android.app.SearchManager
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.net.Uri
import android.os.Build
import android.os.SystemClock
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.Settings
import android.view.KeyEvent
import android.webkit.JavascriptInterface
import com.ioshybrid.launcher.data.model.SystemStatusPayload
import com.ioshybrid.launcher.data.repository.LauncherRepository
import com.ioshybrid.launcher.service.BadgeNotificationService
import com.ioshybrid.launcher.ui.LauncherViewModel
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class AndroidWebBridge(
    private val context: Context,
    private val repository: LauncherRepository,
    private val viewModel: LauncherViewModel,
    private val onPickWallpaperRequested: () -> Unit,
    private val onRequestFilePermissions: () -> Unit
) {

    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    @JavascriptInterface
    fun getInstalledAppsJson(): String {
        val apps = viewModel.installedApps.value.ifEmpty {
            repository.getInstalledAppsBlocking()
        }
        return json.encodeToString(apps)
    }

    @JavascriptInterface
    fun loadLauncherState(): String {
        return repository.loadLauncherStateBlocking()
    }

    @JavascriptInterface
    fun saveLauncherState(stateJson: String) {
        viewModel.saveLauncherState(stateJson)
    }

    @JavascriptInterface
    fun launchApp(packageName: String): Boolean {
        val cleanPkg = packageName.trim()
        if (cleanPkg.isEmpty()) return false
        return try {
            val launchIntent = context.packageManager.getLaunchIntentForPackage(cleanPkg)?.apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
            } ?: return false

            val options = ActivityOptions.makeCustomAnimation(
                context,
                android.R.anim.fade_in,
                android.R.anim.fade_out
            ).toBundle()

            context.startActivity(launchIntent, options)
            true
        } catch (_: Exception) {
            false
        }
    }

    @JavascriptInterface
    fun uninstallApp(packageName: String) {
        val cleanPkg = packageName.trim()
        if (cleanPkg.isEmpty()) return
        try {
            val intent = Intent(Intent.ACTION_DELETE).apply {
                data = Uri.fromParts("package", cleanPkg, null)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        } catch (_: Exception) {
            openAppInfo(cleanPkg)
        }
    }

    @JavascriptInterface
    fun openAppInfo(packageName: String) {
        val cleanPkg = packageName.trim()
        if (cleanPkg.isEmpty()) return
        try {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.fromParts("package", cleanPkg, null)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        } catch (_: Exception) {
            openSystemSettings()
        }
    }

    @JavascriptInterface
    fun getSystemStatusJson(): String {
        val payload = SystemStatusPayload(
            battery = viewModel.batteryInfo.value,
            metrics = repository.readSystemMetrics(),
            badges = BadgeNotificationService.badgesFlow.value,
            notificationAccessGranted = BadgeNotificationService.isNotificationAccessGranted(context),
            hasCustomWallpaper = repository.hasCustomWallpaper(),
            fileAccessGranted = repository.hasFilePermissions(),
            isMusicActive = repository.isMusicCurrentlyActive()
        )
        return json.encodeToString(payload)
    }

    @JavascriptInterface
    fun dispatchMediaKey(action: String): Boolean {
        return try {
            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
                ?: return false
            val keyCode = when (action.trim().lowercase()) {
                "prev", "previous" -> KeyEvent.KEYCODE_MEDIA_PREVIOUS
                "next" -> KeyEvent.KEYCODE_MEDIA_NEXT
                "play" -> KeyEvent.KEYCODE_MEDIA_PLAY
                "pause" -> KeyEvent.KEYCODE_MEDIA_PAUSE
                else -> KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE
            }
            val eventTime = SystemClock.uptimeMillis()
            val downEvent = KeyEvent(
                eventTime,
                eventTime,
                KeyEvent.ACTION_DOWN,
                keyCode,
                0
            )
            val upEvent = KeyEvent(
                eventTime,
                eventTime,
                KeyEvent.ACTION_UP,
                keyCode,
                0
            )
            audioManager.dispatchMediaKeyEvent(downEvent)
            audioManager.dispatchMediaKeyEvent(upEvent)
            true
        } catch (_: Exception) {
            false
        }
    }

    @JavascriptInterface
    fun searchWeb(query: String): Boolean {
        val cleanQuery = query.trim()
        if (cleanQuery.isEmpty()) return false
        return try {
            val webSearchIntent = Intent(Intent.ACTION_WEB_SEARCH).apply {
                putExtra(SearchManager.QUERY, cleanQuery)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(webSearchIntent)
            true
        } catch (_: Exception) {
            try {
                val encoded = Uri.encode(cleanQuery)
                val browserIntent = Intent(
                    Intent.ACTION_VIEW,
                    Uri.parse("https://www.google.com/search?q=$encoded")
                ).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(browserIntent)
                true
            } catch (_: Exception) {
                false
            }
        }
    }

    @JavascriptInterface
    fun openNotificationSettings() {
        try {
            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        } catch (_: Exception) {
            openSystemSettings()
        }
    }

    @SuppressLint("WrongConstant", "PrivateApi")
    @JavascriptInterface
    fun expandStatusBar() {
        try {
            val statusBarService = context.getSystemService("statusbar") ?: return
            val statusBarManagerClass = Class.forName("android.app.StatusBarManager")
            val expandMethod = statusBarManagerClass.getMethod("expandNotificationsPanel")
            expandMethod.invoke(statusBarService)
        } catch (_: Exception) {
            // Ignored on restricted OEM builds if StatusBarManager reflection fails
        }
    }

    @JavascriptInterface
    fun openWallpaperPicker() {
        onPickWallpaperRequested()
    }

    @JavascriptInterface
    fun hapticFeedback(type: String) {
        try {
            val vibrator: Vibrator? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val manager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                manager?.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
            }

            if (vibrator == null || !vibrator.hasVibrator()) return

            val (durationMs, amplitude) = when (type.lowercase()) {
                "heavy" -> 28L to 220
                "medium" -> 18L to 150
                else -> 10L to 90
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createOneShot(durationMs, amplitude))
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(durationMs)
            }
        } catch (_: Exception) {
            // Ignore if vibration is disabled
        }
    }

    @JavascriptInterface
    fun openSystemSettings() {
        try {
            val intent = Intent(Settings.ACTION_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        } catch (_: Exception) {
            // Ignore if unavailable
        }
    }

    @JavascriptInterface
    fun hasFilePermissions(): Boolean {
        return repository.hasFilePermissions()
    }

    @JavascriptInterface
    fun requestFilePermissions() {
        onRequestFilePermissions()
    }

    @JavascriptInterface
    fun searchFilesJson(query: String, categoriesJson: String): String {
        val files = repository.searchDeviceFiles(
            query = query,
            allowedCategoriesJson = categoriesJson,
            limit = 45
        )
        return json.encodeToString(files)
    }

    @JavascriptInterface
    fun openFile(uriString: String, mimeType: String): Boolean {
        return repository.fileSearchHelper.openFile(uriString, mimeType)
    }

    @JavascriptInterface
    fun shareFile(uriString: String, mimeType: String): Boolean {
        return repository.fileSearchHelper.shareFile(uriString, mimeType)
    }

    companion object {
        const val JS_INTERFACE_NAME = "AndroidBridge"
    }
}

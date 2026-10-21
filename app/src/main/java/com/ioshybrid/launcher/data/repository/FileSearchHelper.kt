package com.ioshybrid.launcher.data.repository

import android.Manifest
import android.content.ContentUris
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import android.webkit.MimeTypeMap
import androidx.core.content.ContextCompat
import com.ioshybrid.launcher.data.model.DeviceFileItem
import com.ioshybrid.launcher.data.model.FileSearchCategories
import java.util.Locale
import kotlinx.serialization.json.Json

class FileSearchHelper(context: Context) {

    private val appContext = context.applicationContext

    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    fun hasFilePermissions(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val img = ContextCompat.checkSelfPermission(
                appContext,
                Manifest.permission.READ_MEDIA_IMAGES
            ) == PackageManager.PERMISSION_GRANTED
            val vid = ContextCompat.checkSelfPermission(
                appContext,
                Manifest.permission.READ_MEDIA_VIDEO
            ) == PackageManager.PERMISSION_GRANTED
            val aud = ContextCompat.checkSelfPermission(
                appContext,
                Manifest.permission.READ_MEDIA_AUDIO
            ) == PackageManager.PERMISSION_GRANTED
            img || vid || aud
        } else {
            ContextCompat.checkSelfPermission(
                appContext,
                Manifest.permission.READ_EXTERNAL_STORAGE
            ) == PackageManager.PERMISSION_GRANTED
        }
    }

    fun parseCategoriesFilter(filterOrJson: String): FileSearchCategories {
        val trimmed = filterOrJson.trim()
        if (trimmed.isEmpty() || trimmed.equals("all", ignoreCase = true)) {
            return FileSearchCategories()
        }
        if (!trimmed.startsWith("{")) {
            return when (trimmed.lowercase(Locale.ROOT)) {
                "docs", "documents" -> FileSearchCategories(
                    docs = true,
                    images = false,
                    videos = false,
                    audio = false,
                    archives = false
                )
                "images", "photos" -> FileSearchCategories(
                    docs = false,
                    images = true,
                    videos = false,
                    audio = false,
                    archives = false
                )
                "videos" -> FileSearchCategories(
                    docs = false,
                    images = false,
                    videos = true,
                    audio = false,
                    archives = false
                )
                "audio", "music" -> FileSearchCategories(
                    docs = false,
                    images = false,
                    videos = false,
                    audio = true,
                    archives = false
                )
                "archives", "apk" -> FileSearchCategories(
                    docs = false,
                    images = false,
                    videos = false,
                    audio = false,
                    archives = true
                )
                else -> FileSearchCategories()
            }
        }
        return try {
            json.decodeFromString<FileSearchCategories>(trimmed)
        } catch (_: Exception) {
            FileSearchCategories()
        }
    }

    fun searchDeviceFiles(
        query: String,
        allowedCategoriesJson: String,
        limit: Int = 45
    ): List<DeviceFileItem> {
        val categories = parseCategoriesFilter(allowedCategoriesJson)
        if (!categories.docs && !categories.images && !categories.videos && !categories.audio && !categories.archives) {
            return emptyList()
        }

        val cleanQuery = query.trim()
        val results = mutableListOf<DeviceFileItem>()

        try {
            val collectionUri: Uri = MediaStore.Files.getContentUri("external")
            val projection = arrayOf(
                MediaStore.Files.FileColumns._ID,
                MediaStore.Files.FileColumns.DISPLAY_NAME,
                MediaStore.Files.FileColumns.DATA,
                MediaStore.Files.FileColumns.MIME_TYPE,
                MediaStore.Files.FileColumns.SIZE,
                MediaStore.Files.FileColumns.DATE_MODIFIED
            )

            val selectionBuilder = StringBuilder()
            val selectionArgs = mutableListOf<String>()

            selectionBuilder.append("${MediaStore.Files.FileColumns.SIZE} > 0")
            selectionBuilder.append(" AND ${MediaStore.Files.FileColumns.DISPLAY_NAME} IS NOT NULL")

            if (cleanQuery.isNotEmpty()) {
                selectionBuilder.append(" AND ${MediaStore.Files.FileColumns.DISPLAY_NAME} LIKE ?")
                selectionArgs.add("%$cleanQuery%")
            }

            val sortOrder = "${MediaStore.Files.FileColumns.DATE_MODIFIED} DESC"

            appContext.contentResolver.query(
                collectionUri,
                projection,
                selectionBuilder.toString(),
                selectionArgs.toTypedArray(),
                sortOrder
            )?.use { cursor ->
                val idCol = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns._ID)
                val nameCol = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns.DISPLAY_NAME)
                val dataCol = cursor.getColumnIndex(MediaStore.Files.FileColumns.DATA)
                val mimeCol = cursor.getColumnIndex(MediaStore.Files.FileColumns.MIME_TYPE)
                val sizeCol = cursor.getColumnIndex(MediaStore.Files.FileColumns.SIZE)
                val dateCol = cursor.getColumnIndex(MediaStore.Files.FileColumns.DATE_MODIFIED)

                while (cursor.moveToNext() && results.size < limit) {
                    val id = cursor.getLong(idCol)
                    val rawName = cursor.getString(nameCol)?.trim().orEmpty()
                    if (rawName.isEmpty() || rawName.startsWith(".")) continue

                    val rawPath = if (dataCol >= 0) cursor.getString(dataCol).orEmpty() else ""
                    val rawMime = if (mimeCol >= 0) cursor.getString(mimeCol).orEmpty() else ""
                    val sizeBytes = if (sizeCol >= 0) cursor.getLong(sizeCol) else 0L
                    val dateModifiedSec = if (dateCol >= 0) cursor.getLong(dateCol) else 0L

                    val ext = rawName.substringAfterLast('.', "").lowercase(Locale.ROOT)
                    val resolvedMime = rawMime.ifEmpty {
                        if (ext.isNotEmpty()) {
                            MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext).orEmpty()
                        } else {
                            ""
                        }
                    }.ifEmpty { "application/octet-stream" }

                    val category = classifyFileCategory(ext, resolvedMime) ?: continue
                    val isAllowed = when (category) {
                        "docs" -> categories.docs
                        "images" -> categories.images
                        "videos" -> categories.videos
                        "audio" -> categories.audio
                        "archives" -> categories.archives
                        else -> false
                    }
                    if (!isAllowed) continue

                    val contentUri = ContentUris.withAppendedId(collectionUri, id)
                    val friendlyPath = extractFriendlyFolderPath(rawPath, rawName)

                    results.add(
                        DeviceFileItem(
                            name = rawName,
                            path = friendlyPath,
                            uriString = contentUri.toString(),
                            mimeType = resolvedMime,
                            sizeBytes = sizeBytes,
                            dateModified = dateModifiedSec * 1000L,
                            category = category
                        )
                    )
                }
            }
        } catch (_: SecurityException) {
            return emptyList()
        } catch (_: Exception) {
            return emptyList()
        }

        return results
    }

    fun openFile(uriString: String, mimeType: String): Boolean {
        val cleanUri = uriString.trim()
        if (cleanUri.isEmpty()) return false
        return try {
            val uri = Uri.parse(cleanUri)
            val resolvedMime = mimeType.trim().ifEmpty { "*/*" }
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, resolvedMime)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            appContext.startActivity(intent)
            true
        } catch (_: Exception) {
            try {
                val fallbackIntent = Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(Uri.parse(cleanUri), "*/*")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                appContext.startActivity(fallbackIntent)
                true
            } catch (_: Exception) {
                false
            }
        }
    }

    fun shareFile(uriString: String, mimeType: String): Boolean {
        val cleanUri = uriString.trim()
        if (cleanUri.isEmpty()) return false
        return try {
            val uri = Uri.parse(cleanUri)
            val resolvedMime = mimeType.trim().ifEmpty { "*/*" }
            val sendIntent = Intent(Intent.ACTION_SEND).apply {
                type = resolvedMime
                putExtra(Intent.EXTRA_STREAM, uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            val chooser = Intent.createChooser(sendIntent, "Sdílet soubor").apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            appContext.startActivity(chooser)
            true
        } catch (_: Exception) {
            false
        }
    }

    private fun classifyFileCategory(ext: String, mime: String): String? {
        val lowerMime = mime.lowercase(Locale.ROOT)
        return when {
            lowerMime.startsWith("image/") || ext in IMAGE_EXTENSIONS -> "images"
            lowerMime.startsWith("video/") || ext in VIDEO_EXTENSIONS -> "videos"
            lowerMime.startsWith("audio/") || ext in AUDIO_EXTENSIONS -> "audio"
            ext in ARCHIVE_EXTENSIONS ||
                lowerMime.contains("zip") ||
                lowerMime.contains("rar") ||
                lowerMime.contains("tar") ||
                lowerMime.contains("7z") ||
                lowerMime.contains("android.package-archive") -> "archives"
            ext in DOC_EXTENSIONS ||
                lowerMime.startsWith("text/") ||
                lowerMime.contains("pdf") ||
                lowerMime.contains("msword") ||
                lowerMime.contains("officedocument") ||
                lowerMime.contains("ms-excel") ||
                lowerMime.contains("ms-powerpoint") ||
                lowerMime.contains("epub") ||
                lowerMime.contains("json") ||
                lowerMime.contains("xml") -> "docs"
            else -> null
        }
    }

    private fun extractFriendlyFolderPath(fullPath: String, fileName: String): String {
        if (fullPath.isBlank()) return "Úložiště zařízení"
        val withoutFile = fullPath.removeSuffix(fileName).trimEnd('/', '\\')
        val normalized = withoutFile
            .replace("/storage/emulated/0/", "")
            .replace("/sdcard/", "")
            .trim('/')
        return if (normalized.isEmpty()) "Interní úložiště" else normalized
    }

    companion object {
        private val DOC_EXTENSIONS = setOf(
            "pdf", "doc", "docx", "txt", "md", "rtf", "odt",
            "xls", "xlsx", "csv", "ods", "ppt", "pptx", "epub", "json", "xml", "log"
        )
        private val IMAGE_EXTENSIONS = setOf(
            "jpg", "jpeg", "png", "webp", "gif", "heic", "heif", "bmp", "svg", "raw", "dng"
        )
        private val VIDEO_EXTENSIONS = setOf(
            "mp4", "mkv", "mov", "avi", "webm", "3gp", "m4v", "ts"
        )
        private val AUDIO_EXTENSIONS = setOf(
            "mp3", "m4a", "wav", "flac", "ogg", "opus", "aac", "wma"
        )
        private val ARCHIVE_EXTENSIONS = setOf(
            "zip", "rar", "7z", "tar", "gz", "bz2", "xz", "apk", "apks", "xapk", "iso"
        )
    }
}

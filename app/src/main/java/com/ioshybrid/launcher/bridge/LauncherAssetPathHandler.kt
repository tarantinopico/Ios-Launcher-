package com.ioshybrid.launcher.bridge

import android.content.Context
import android.webkit.WebResourceResponse
import androidx.webkit.WebViewAssetLoader
import com.ioshybrid.launcher.data.repository.LauncherRepository
import java.io.ByteArrayInputStream
import java.io.FileInputStream
import java.net.URLDecoder

class LauncherAssetPathHandler(
    context: Context,
    private val repository: LauncherRepository
) {
    private val assetsPathHandler = WebViewAssetLoader.AssetsPathHandler(context.applicationContext)

    val assetLoader: WebViewAssetLoader = WebViewAssetLoader.Builder()
        .setDomain(DOMAIN)
        .setHttpAllowed(false)
        .addPathHandler("/assets/", assetsPathHandler)
        .addPathHandler("/icon/") { path ->
            handleIconRequest(path)
        }
        .addPathHandler("/wallpaper/") { path ->
            handleWallpaperRequest(path)
        }
        .build()

    private fun handleIconRequest(rawPath: String): WebResourceResponse? {
        val packageName = try {
            URLDecoder.decode(rawPath.substringBefore("?").trim('/'), "UTF-8")
        } catch (_: Exception) {
            rawPath.substringBefore("?").trim('/')
        }
        if (packageName.isBlank()) return null

        val pngBytes = repository.getAppIconPngBytes(packageName)
        val headers = mapOf(
            "Access-Control-Allow-Origin" to "*",
            "Cache-Control" to "public, max-age=3600"
        )
        return WebResourceResponse(
            "image/png",
            "UTF-8",
            200,
            "OK",
            headers,
            ByteArrayInputStream(pngBytes)
        )
    }

    private fun handleWallpaperRequest(rawPath: String): WebResourceResponse? {
        val cleanPath = rawPath.substringBefore("?").trim('/')
        if (cleanPath != "custom" && cleanPath != "custom.jpg" && !cleanPath.startsWith("custom.")) {
            return null
        }

        val file = repository.customWallpaperFile
        if (!file.exists() || !file.isFile) return null

        val headers = mapOf(
            "Access-Control-Allow-Origin" to "*",
            "Cache-Control" to "no-store, no-cache, must-revalidate"
        )
        return try {
            WebResourceResponse(
                "image/jpeg",
                "UTF-8",
                200,
                "OK",
                headers,
                FileInputStream(file)
            )
        } catch (_: Exception) {
            null
        }
    }

    companion object {
        const val DOMAIN = "launcher.local"
        const val INDEX_URL = "https://launcher.local/assets/index.html"
    }
}

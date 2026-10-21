package com.ioshybrid.launcher.ui

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.statusBars
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color as ComposeColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.viewinterop.AndroidView
import com.ioshybrid.launcher.bridge.AndroidWebBridge
import com.ioshybrid.launcher.bridge.LauncherAssetPathHandler
import com.ioshybrid.launcher.service.SystemBroadcastReceiver
import org.json.JSONObject

class MainActivity : ComponentActivity() {

    private val viewModel: LauncherViewModel by viewModels()
    private var webViewRef: WebView? = null
    private var receivers: Pair<SystemBroadcastReceiver, SystemBroadcastReceiver>? = null

    private val pickWallpaperLauncher = registerForActivityResult(
        ActivityResultContracts.PickVisualMedia()
    ) { uri ->
        if (uri != null) {
            viewModel.handleSelectedWallpaperUri(uri)
        }
    }

    private val fallbackGetContentLauncher = registerForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri ->
        if (uri != null) {
            viewModel.handleSelectedWallpaperUri(uri)
        }
    }

    private val filePermissionsLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { resultMap ->
        val granted = resultMap.values.any { it } || viewModel.repository.hasFilePermissions()
        viewModel.notifyFilePermissionResult(granted)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(Color.TRANSPARENT)
        )
        super.onCreate(savedInstanceState)

        sanitizeWebViewVariationsSeed()

        receivers = SystemBroadcastReceiver.register(
            context = this,
            onPackagesChanged = { pkg ->
                viewModel.refreshInstalledApps(changedPackage = pkg, forceRefresh = true, notifyJs = true)
            },
            onBatteryChanged = { intent ->
                viewModel.onBatteryIntentReceived(intent)
            }
        )

        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    evaluateJsSafely("window.onAndroidBackPressed && window.onAndroidBackPressed();")
                }
            }
        )

        setContent {
            LauncherWebViewScreen(
                viewModel = viewModel,
                onPickWallpaper = { launchWallpaperPicker() },
                onRequestFilePermissions = { launchFilePermissionsRequest() },
                onWebViewReady = { webView -> webViewRef = webView },
                evaluateJs = { script -> evaluateJsSafely(script) }
            )
        }
    }

    private fun sanitizeWebViewVariationsSeed() {
        try {
            val webViewDir = applicationContext.getDir("webview", MODE_PRIVATE)
            listOf(
                "variations_seed",
                "variations_seed_new",
                "variations_stamp"
            ).forEach { fileName ->
                val seedFile = java.io.File(webViewDir, fileName)
                if (seedFile.exists()) {
                    seedFile.delete()
                }
            }
        } catch (_: Exception) {
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        if (intent.action == Intent.ACTION_MAIN &&
            (intent.hasCategory(Intent.CATEGORY_HOME) || intent.hasCategory(Intent.CATEGORY_DEFAULT))
        ) {
            evaluateJsSafely("window.onAndroidHomePressed && window.onAndroidHomePressed();")
        }
    }

    override fun onResume() {
        super.onResume()
        viewModel.refreshSystemStatusForResume()
        evaluateJsSafely("window.onLauncherResumed && window.onLauncherResumed();")
    }

    override fun onDestroy() {
        receivers?.let { (pkgReceiver, batReceiver) ->
            try {
                unregisterReceiver(pkgReceiver)
            } catch (_: Exception) {
            }
            try {
                unregisterReceiver(batReceiver)
            } catch (_: Exception) {
            }
        }
        receivers = null
        webViewRef?.destroy()
        webViewRef = null
        super.onDestroy()
    }

    private fun launchWallpaperPicker() {
        runOnUiThread {
            try {
                pickWallpaperLauncher.launch(
                    PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                )
            } catch (_: Exception) {
                try {
                    fallbackGetContentLauncher.launch("image/*")
                } catch (_: Exception) {
                    // Ignore if no picker available
                }
            }
        }
    }

    private fun launchFilePermissionsRequest() {
        runOnUiThread {
            try {
                val perms = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    arrayOf(
                        Manifest.permission.READ_MEDIA_IMAGES,
                        Manifest.permission.READ_MEDIA_VIDEO,
                        Manifest.permission.READ_MEDIA_AUDIO
                    )
                } else {
                    arrayOf(Manifest.permission.READ_EXTERNAL_STORAGE)
                }
                filePermissionsLauncher.launch(perms)
            } catch (_: Exception) {
                viewModel.notifyFilePermissionResult(viewModel.repository.hasFilePermissions())
            }
        }
    }

    private fun evaluateJsSafely(script: String) {
        val wv = webViewRef ?: return
        wv.post {
            try {
                wv.evaluateJavascript(script, null)
            } catch (_: Exception) {
            }
        }
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun LauncherWebViewScreen(
    viewModel: LauncherViewModel,
    onPickWallpaper: () -> Unit,
    onRequestFilePermissions: () -> Unit,
    onWebViewReady: (WebView) -> Unit,
    evaluateJs: (String) -> Unit
) {
    val context = LocalContext.current
    val statusBarTopDp = WindowInsets.statusBars.asPaddingValues().calculateTopPadding().value
    val navBarBottomDp = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding().value

    val assetPathHandler = remember(context) {
        LauncherAssetPathHandler(context, viewModel.repository)
    }

    val webBridge = remember(context) {
        AndroidWebBridge(
            context = context,
            repository = viewModel.repository,
            viewModel = viewModel,
            onPickWallpaperRequested = onPickWallpaper,
            onRequestFilePermissions = onRequestFilePermissions
        )
    }

    var pageFinished by remember { mutableStateOf(false) }

    LaunchedEffect(statusBarTopDp, navBarBottomDp, pageFinished) {
        if (pageFinished) {
            val safeTopPx = statusBarTopDp.coerceAtLeast(24f).toInt()
            val safeBottomPx = navBarBottomDp.coerceAtLeast(16f).toInt()
            evaluateJs(
                """
                (function() {
                    document.documentElement.style.setProperty('--safe-top', '${safeTopPx}px');
                    document.documentElement.style.setProperty('--safe-bottom', '${safeBottomPx}px');
                    if (window.onSafeInsetsUpdated) {
                        window.onSafeInsetsUpdated($safeTopPx, $safeBottomPx);
                    }
                })();
                """.trimIndent()
            )
        }
    }

    LaunchedEffect(viewModel, pageFinished) {
        viewModel.jsEvents.collect { event ->
            if (!pageFinished) return@collect
            when (event) {
                is JsDispatchEvent.AppsUpdated -> {
                    val quoted = JSONObject.quote(event.appsJson)
                    evaluateJs("window.onNativeAppsUpdated && window.onNativeAppsUpdated(JSON.parse($quoted));")
                }
                is JsDispatchEvent.BatteryUpdated -> {
                    val quoted = JSONObject.quote(event.batteryJson)
                    evaluateJs("window.onNativeBatteryUpdated && window.onNativeBatteryUpdated(JSON.parse($quoted));")
                }
                is JsDispatchEvent.BadgesUpdated -> {
                    val quoted = JSONObject.quote(event.badgesJson)
                    evaluateJs(
                        "window.onNativeBadgesUpdated && window.onNativeBadgesUpdated(JSON.parse($quoted), ${event.accessGranted});"
                    )
                }
                is JsDispatchEvent.CustomWallpaperSelected -> {
                    evaluateJs("window.onCustomWallpaperSelected && window.onCustomWallpaperSelected();")
                }
                is JsDispatchEvent.FilePermissionResult -> {
                    evaluateJs("window.onFilePermissionResult && window.onFilePermissionResult(${event.granted});")
                }
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(ComposeColor(0xFF06080E))
            .testTag("launcher_root_container")
            .semantics { contentDescription = "iOS Hybrid Launcher Pro V3 Home Screen" }
    ) {
        AndroidView(
            modifier = Modifier
                .fillMaxSize()
                .testTag("launcher_webview"),
            factory = { ctx ->
                WebView(ctx).apply {
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                    setBackgroundColor(Color.TRANSPARENT)
                    overScrollMode = View.OVER_SCROLL_NEVER
                    isVerticalScrollBarEnabled = false
                    isHorizontalScrollBarEnabled = false

                    settings.apply {
                        javaScriptEnabled = true
                        domStorageEnabled = true
                        databaseEnabled = true
                        allowFileAccess = false
                        allowContentAccess = false
                        mediaPlaybackRequiresUserGesture = false
                        cacheMode = WebSettings.LOAD_DEFAULT
                        textZoom = 100
                        setSupportZoom(false)
                        builtInZoomControls = false
                        displayZoomControls = false
                    }

                    addJavascriptInterface(webBridge, AndroidWebBridge.JS_INTERFACE_NAME)

                    webChromeClient = object : WebChromeClient() {
                        override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                            return true
                        }
                    }

                    webViewClient = object : WebViewClient() {
                        override fun shouldInterceptRequest(
                            view: WebView?,
                            request: WebResourceRequest?
                        ): WebResourceResponse? {
                            val url = request?.url ?: return null
                            return assetPathHandler.assetLoader.shouldInterceptRequest(url)
                        }

                        override fun onPageFinished(view: WebView?, url: String?) {
                            super.onPageFinished(view, url)
                            pageFinished = true
                            val safeTopPx = statusBarTopDp.coerceAtLeast(24f).toInt()
                            val safeBottomPx = navBarBottomDp.coerceAtLeast(16f).toInt()
                            view?.evaluateJavascript(
                                """
                                (function() {
                                    document.documentElement.style.setProperty('--safe-top', '${safeTopPx}px');
                                    document.documentElement.style.setProperty('--safe-bottom', '${safeBottomPx}px');
                                    if (window.onSafeInsetsUpdated) {
                                        window.onSafeInsetsUpdated($safeTopPx, $safeBottomPx);
                                    }
                                })();
                                """.trimIndent(),
                                null
                            )
                        }
                    }

                    onWebViewReady(this)
                    loadUrl(LauncherAssetPathHandler.INDEX_URL)
                }
            }
        )
    }

    DisposableEffect(Unit) {
        onDispose { }
    }
}

package com.example

import android.content.Context
import android.net.Uri
import androidx.test.core.app.ApplicationProvider
import com.ioshybrid.launcher.bridge.LauncherAssetPathHandler
import com.ioshybrid.launcher.data.repository.LauncherRepository
import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class ExampleRobolectricTest {

    @Test
    fun `read app_name and verify LauncherRepository V1 V2 to V3 migration, metrics, and wallpaper handler`() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val appName = context.getString(R.string.app_name)
        assertEquals("iOS Hybrid Launcher", appName)

        val v1File = File(context.filesDir, "launcher_state_v1.json")
        val v2File = File(context.filesDir, "launcher_state_v2.json")
        val v3File = File(context.filesDir, "launcher_state_v3.json")
        v1File.delete()
        v2File.delete()
        v3File.delete()

        val repository = LauncherRepository(context)

        // Verify V1 fallback migration read when V2/V3 files do not exist yet
        val v1SampleJson = """{"version":1,"activePage":0}"""
        v1File.writeText(v1SampleJson, Charsets.UTF_8)
        assertEquals(v1SampleJson, repository.loadLauncherStateBlocking())

        // Verify V3 save and priority over V1/V2
        val v3SampleJson = """{"version":3,"activePage":1,"focusMode":"personal"}"""
        repository.saveLauncherStateBlocking(v3SampleJson)
        assertTrue(v3File.exists())
        assertEquals(v3SampleJson, repository.loadLauncherStateBlocking())

        // Verify RAM and Storage metrics reading
        val metrics = repository.readSystemMetrics()
        assertTrue(metrics.ramUsedPercent in 1..99)
        assertTrue(metrics.storageUsedPercent in 1..99)

        // Verify fallback icon generation
        val fallbackIcon = repository.getAppIconPngBytes("com.nonexistent.testapp")
        assertTrue(fallbackIcon.isNotEmpty())

        // Verify custom wallpaper serving for both /wallpaper/custom and /wallpaper/custom.jpg
        repository.customWallpaperFile.writeBytes(byteArrayOf(0xFF.toByte(), 0xD8.toByte(), 0xFF.toByte()))
        val pathHandler = LauncherAssetPathHandler(context, repository)
        val respCustom = pathHandler.assetLoader.shouldInterceptRequest(
            Uri.parse("https://launcher.local/wallpaper/custom?t=123")
        )
        val respCustomJpg = pathHandler.assetLoader.shouldInterceptRequest(
            Uri.parse("https://launcher.local/wallpaper/custom.jpg?t=456")
        )
        assertNotNull(respCustom)
        assertNotNull(respCustomJpg)
    }
}

package com.ioshybrid.launcher.data.model

import kotlinx.serialization.Serializable

@Serializable
data class AppItem(
    val label: String,
    val packageName: String,
    val className: String,
    val isSystemApp: Boolean,
    val firstInstallTime: Long = 0L
)

@Serializable
data class BatteryInfo(
    val level: Int,
    val isCharging: Boolean,
    val temperature: Float
)

@Serializable
data class SystemMetricsInfo(
    val ramUsedPercent: Int = 48,
    val ramUsedGb: Float = 3.8f,
    val ramTotalGb: Float = 8.0f,
    val storageUsedPercent: Int = 42,
    val storageFreeGb: Float = 74.2f,
    val storageTotalGb: Float = 128.0f
)

@Serializable
data class DeviceFileItem(
    val name: String,
    val path: String,
    val uriString: String,
    val mimeType: String,
    val sizeBytes: Long,
    val dateModified: Long,
    val category: String
)

@Serializable
data class FileSearchCategories(
    val docs: Boolean = true,
    val images: Boolean = true,
    val videos: Boolean = true,
    val audio: Boolean = true,
    val archives: Boolean = true
)

@Serializable
data class SystemStatusPayload(
    val battery: BatteryInfo,
    val metrics: SystemMetricsInfo = SystemMetricsInfo(),
    val badges: Map<String, Int>,
    val notificationAccessGranted: Boolean,
    val hasCustomWallpaper: Boolean,
    val fileAccessGranted: Boolean = false,
    val isMusicActive: Boolean = false
)

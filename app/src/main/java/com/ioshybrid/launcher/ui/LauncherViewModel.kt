package com.ioshybrid.launcher.ui

import android.app.Application
import android.content.Intent
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.ioshybrid.launcher.data.model.AppItem
import com.ioshybrid.launcher.data.model.BatteryInfo
import com.ioshybrid.launcher.data.repository.LauncherRepository
import com.ioshybrid.launcher.service.BadgeNotificationService
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

sealed class JsDispatchEvent {
    data class AppsUpdated(val appsJson: String) : JsDispatchEvent()
    data class BatteryUpdated(val batteryJson: String) : JsDispatchEvent()
    data class BadgesUpdated(val badgesJson: String, val accessGranted: Boolean) : JsDispatchEvent()
    data object CustomWallpaperSelected : JsDispatchEvent()
    data class FilePermissionResult(val granted: Boolean) : JsDispatchEvent()
}

class LauncherViewModel(application: Application) : AndroidViewModel(application) {

    val repository = LauncherRepository(application.applicationContext)

    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    private val _installedApps = MutableStateFlow<List<AppItem>>(emptyList())
    val installedApps: StateFlow<List<AppItem>> = _installedApps.asStateFlow()

    private val _batteryInfo = MutableStateFlow(repository.readCurrentBatteryInfo())
    val batteryInfo: StateFlow<BatteryInfo> = _batteryInfo.asStateFlow()

    private val _jsEvents = MutableSharedFlow<JsDispatchEvent>(extraBufferCapacity = 16)
    val jsEvents: SharedFlow<JsDispatchEvent> = _jsEvents.asSharedFlow()

    init {
        refreshInstalledApps(forceRefresh = true, notifyJs = false)
        observeNotificationBadges()
    }

    private fun observeNotificationBadges() {
        viewModelScope.launch {
            BadgeNotificationService.badgesFlow.collect { badgeMap ->
                val accessGranted = BadgeNotificationService.isNotificationAccessGranted(
                    getApplication<Application>().applicationContext
                )
                val badgesJson = json.encodeToString(badgeMap)
                _jsEvents.tryEmit(JsDispatchEvent.BadgesUpdated(badgesJson, accessGranted))
            }
        }
    }

    fun refreshInstalledApps(
        changedPackage: String? = null,
        forceRefresh: Boolean = true,
        notifyJs: Boolean = true
    ) {
        viewModelScope.launch {
            if (changedPackage != null) {
                repository.invalidateIconCache(changedPackage)
            }
            val apps = repository.loadInstalledApps(forceRefresh = forceRefresh)
            _installedApps.value = apps
            if (notifyJs) {
                val appsJson = json.encodeToString(apps)
                _jsEvents.emit(JsDispatchEvent.AppsUpdated(appsJson))
            }
        }
    }

    fun onBatteryIntentReceived(intent: Intent) {
        val updated = repository.parseBatteryIntent(intent)
        if (_batteryInfo.value != updated) {
            _batteryInfo.value = updated
            val batteryJson = json.encodeToString(updated)
            _jsEvents.tryEmit(JsDispatchEvent.BatteryUpdated(batteryJson))
        }
    }

    fun refreshSystemStatusForResume() {
        val currentBattery = repository.readCurrentBatteryInfo()
        _batteryInfo.value = currentBattery
        val batteryJson = json.encodeToString(currentBattery)
        _jsEvents.tryEmit(JsDispatchEvent.BatteryUpdated(batteryJson))

        val accessGranted = BadgeNotificationService.isNotificationAccessGranted(
            getApplication<Application>().applicationContext
        )
        val badgesJson = json.encodeToString(BadgeNotificationService.badgesFlow.value)
        _jsEvents.tryEmit(JsDispatchEvent.BadgesUpdated(badgesJson, accessGranted))
    }

    fun saveLauncherState(stateJson: String) {
        viewModelScope.launch {
            repository.saveLauncherState(stateJson)
        }
    }

    fun handleSelectedWallpaperUri(uri: Uri) {
        viewModelScope.launch {
            val saved = repository.saveCustomWallpaperFromUri(uri)
            if (saved) {
                _jsEvents.emit(JsDispatchEvent.CustomWallpaperSelected)
            }
        }
    }

    fun notifyFilePermissionResult(granted: Boolean) {
        viewModelScope.launch {
            _jsEvents.emit(JsDispatchEvent.FilePermissionResult(granted))
        }
    }
}

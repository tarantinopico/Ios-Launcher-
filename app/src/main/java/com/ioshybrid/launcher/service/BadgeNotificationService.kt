package com.ioshybrid.launcher.service

import android.app.Notification
import android.content.Context
import android.provider.Settings
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class BadgeNotificationService : NotificationListenerService() {

    override fun onListenerConnected() {
        super.onListenerConnected()
        _isConnected.value = true
        recalculateBadges()
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        _isConnected.value = false
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        recalculateBadges()
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        super.onNotificationRemoved(sbn)
        recalculateBadges()
    }

    private fun recalculateBadges() {
        try {
            val activeList = activeNotifications ?: emptyArray()
            val counts = mutableMapOf<String, Int>()

            for (sbn in activeList) {
                val pkg = sbn.packageName ?: continue
                if (pkg == applicationContext.packageName) continue
                if (sbn.isOngoing) continue

                val notification = sbn.notification
                if (notification != null) {
                    val isGroupSummary =
                        (notification.flags and Notification.FLAG_GROUP_SUMMARY) != 0
                    if (isGroupSummary) continue
                }

                val number = (notification?.number ?: 0).coerceAtLeast(1)
                counts[pkg] = (counts[pkg] ?: 0) + number
            }

            _badgesFlow.value = counts
        } catch (_: SecurityException) {
            _badgesFlow.value = emptyMap()
        } catch (_: Exception) {
            // Keep existing map if transient system state occurs
        }
    }

    companion object {
        private val _badgesFlow = MutableStateFlow<Map<String, Int>>(emptyMap())
        val badgesFlow: StateFlow<Map<String, Int>> = _badgesFlow.asStateFlow()

        private val _isConnected = MutableStateFlow(false)
        val isConnected: StateFlow<Boolean> = _isConnected.asStateFlow()

        fun isNotificationAccessGranted(context: Context): Boolean {
            return try {
                val enabledListeners = Settings.Secure.getString(
                    context.contentResolver,
                    "enabled_notification_listeners"
                ) ?: return false
                val myPackage = context.packageName
                enabledListeners.split(":").any { component ->
                    component.startsWith("$myPackage/") || component.contains(myPackage)
                }
            } catch (_: Exception) {
                false
            }
        }
    }
}

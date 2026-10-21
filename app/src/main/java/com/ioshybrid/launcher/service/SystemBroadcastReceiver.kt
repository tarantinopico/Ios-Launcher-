package com.ioshybrid.launcher.service

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build

class SystemBroadcastReceiver(
    private val onPackagesChanged: (String?) -> Unit,
    private val onBatteryChanged: (Intent) -> Unit
) : BroadcastReceiver() {

    override fun onReceive(context: Context?, intent: Intent?) {
        val action = intent?.action ?: return
        when (action) {
            Intent.ACTION_PACKAGE_ADDED,
            Intent.ACTION_PACKAGE_REMOVED,
            Intent.ACTION_PACKAGE_REPLACED,
            Intent.ACTION_PACKAGE_CHANGED -> {
                val pkg = intent.data?.schemeSpecificPart
                onPackagesChanged(pkg)
            }
            Intent.ACTION_BATTERY_CHANGED -> {
                onBatteryChanged(intent)
            }
        }
    }

    companion object {
        fun register(
            context: Context,
            onPackagesChanged: (String?) -> Unit,
            onBatteryChanged: (Intent) -> Unit
        ): Pair<SystemBroadcastReceiver, SystemBroadcastReceiver> {
            val packageReceiver = SystemBroadcastReceiver(onPackagesChanged, onBatteryChanged)
            val packageFilter = IntentFilter().apply {
                addAction(Intent.ACTION_PACKAGE_ADDED)
                addAction(Intent.ACTION_PACKAGE_REMOVED)
                addAction(Intent.ACTION_PACKAGE_REPLACED)
                addAction(Intent.ACTION_PACKAGE_CHANGED)
                addDataScheme("package")
            }

            val batteryReceiver = SystemBroadcastReceiver(onPackagesChanged, onBatteryChanged)
            val batteryFilter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.registerReceiver(
                    packageReceiver,
                    packageFilter,
                    Context.RECEIVER_EXPORTED
                )
                context.registerReceiver(
                    batteryReceiver,
                    batteryFilter,
                    Context.RECEIVER_NOT_EXPORTED
                )
            } else {
                context.registerReceiver(packageReceiver, packageFilter)
                context.registerReceiver(batteryReceiver, batteryFilter)
            }

            return Pair(packageReceiver, batteryReceiver)
        }
    }
}

package com.logismart.mobile

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import com.logismart.mobile.core.navigation.AppNavGraph
import com.logismart.mobile.core.notifications.NotificationHelper
import com.logismart.mobile.core.ui.theme.LogiSmartTheme

class MainActivity : ComponentActivity() {
    private lateinit var notificationHelper: NotificationHelper

    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) notificationHelper.showLogisticsAlert()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        notificationHelper = NotificationHelper(this)
        val app = application as LogiSmartApplication
        setContent {
            LogiSmartTheme {
                AppNavGraph(
                    sessionManager = app.sessionManager,
                    authRepository = app.authRepository,
                    dashboardRepository = app.dashboardRepository,
                    onTestNotification = ::requestOrShowNotification,
                )
            }
        }
    }

    private fun requestOrShowNotification() {
        if (
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.POST_NOTIFICATIONS,
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        } else {
            notificationHelper.showLogisticsAlert()
        }
    }
}

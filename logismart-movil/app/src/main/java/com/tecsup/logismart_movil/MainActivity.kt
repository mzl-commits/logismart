package com.tecsup.logismart_movil

import android.os.Bundle
import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import com.tecsup.logismart_movil.data.local.SessionManager
import com.tecsup.logismart_movil.data.local.UserPreferences
import com.tecsup.logismart_movil.ui.navigation.AppNavGraph
import com.tecsup.logismart_movil.ui.theme.LogismartmovilTheme
import com.tecsup.logismart_movil.utils.NotificationHelper
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject
import androidx.core.content.ContextCompat

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var sessionManager: SessionManager

    private var pendingNotificationCount = 0
    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) NotificationHelper(this).showLogisticsAlert(pendingNotificationCount)
    }

    private fun showOperationalNotification(pendingBoxes: Int) {
        pendingNotificationCount = pendingBoxes
        if (
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        } else {
            NotificationHelper(this).showLogisticsAlert(pendingBoxes)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            val darkMode by UserPreferences(applicationContext).darkModeEnabled.collectAsState(initial = false)
            LogismartmovilTheme(darkTheme = darkMode) {
                AppNavGraph(
                    sessionManager = sessionManager,
                    onTestNotification = ::showOperationalNotification
                )
            }
        }
    }
}

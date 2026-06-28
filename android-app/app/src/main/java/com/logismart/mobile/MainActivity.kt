package com.logismart.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.logismart.mobile.core.navigation.AppNavGraph
import com.logismart.mobile.core.ui.theme.LogiSmartTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val app = application as LogiSmartApplication
        setContent {
            LogiSmartTheme {
                AppNavGraph(
                    sessionManager = app.sessionManager,
                    authRepository = app.authRepository,
                    dashboardRepository = app.dashboardRepository,
                    onTestNotification = {},
                )
            }
        }
    }
}

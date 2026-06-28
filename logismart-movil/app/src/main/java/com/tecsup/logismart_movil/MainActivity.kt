package com.tecsup.logismart_movil

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.tecsup.logismart_movil.data.local.SessionManager
import com.tecsup.logismart_movil.ui.navigation.AppNavGraph
import com.tecsup.logismart_movil.ui.theme.LogismartmovilTheme
import com.tecsup.logismart_movil.utils.NotificationHelper
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var sessionManager: SessionManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            LogismartmovilTheme {
                AppNavGraph(
                    sessionManager = sessionManager,
                    onTestNotification = {
                        NotificationHelper(this).showLogisticsAlert()
                    }
                )
            }
        }
    }
}

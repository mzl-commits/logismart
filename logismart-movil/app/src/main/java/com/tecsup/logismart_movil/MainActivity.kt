package com.tecsup.logismart_movil

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.tecsup.logismart_movil.ui.shelves.ShelvesScreen
import com.tecsup.logismart_movil.ui.theme.LogismartmovilTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            LogismartmovilTheme {
                ShelvesScreen()
            }
        }
    }
}

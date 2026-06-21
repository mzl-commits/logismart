package com.tecsup.logismart_movil

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tecsup.logismart_movil.ui.screens.CarCommandsScreen
import com.tecsup.logismart_movil.ui.screens.CarParamsScreen
import com.tecsup.logismart_movil.ui.theme.DarkBackground
import com.tecsup.logismart_movil.ui.theme.LogismartmovilTheme
import com.tecsup.logismart_movil.ui.theme.TextPrimary
import com.tecsup.logismart_movil.ui.theme.TextSecondary
import com.tecsup.logismart_movil.ui.viewmodel.CarViewModel
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    private val viewModel: CarViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            LogismartmovilTheme {
                var selectedTab by remember { mutableStateOf(0) }
                val tabs = listOf("Telemetría", "Controles")

                val connectionState by viewModel.connectionState.collectAsState()
                val telemetry by viewModel.telemetryFlow.collectAsState()
                val carState by viewModel.carState.collectAsState()
                val uiState by viewModel.uiState.collectAsState()

                Scaffold(
                    modifier = Modifier.fillMaxSize(),
                    topBar = {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(DarkBackground)
                                .padding(top = 40.dp, start = 16.dp, end = 16.dp, bottom = 8.dp)
                        ) {
                            Text(
                                text = "LogiSmart AGV",
                                fontSize = 24.sp,
                                fontWeight = FontWeight.Black,
                                color = TextPrimary
                            )
                            Text(
                                text = "Panel de Control Yuri",
                                fontSize = 14.sp,
                                color = TextSecondary
                            )
                            
                            Spacer(modifier = Modifier.height(12.dp))
                            
                            TabRow(
                                selectedTabIndex = selectedTab,
                                containerColor = DarkBackground,
                                contentColor = TextPrimary,
                                divider = {}
                            ) {
                                tabs.forEachIndexed { index, title ->
                                    Tab(
                                        selected = selectedTab == index,
                                        onClick = { selectedTab = index },
                                        text = {
                                            Text(
                                                text = title,
                                                fontWeight = if (selectedTab == index) FontWeight.Bold else FontWeight.Normal,
                                                fontSize = 15.sp
                                            )
                                        }
                                    )
                                }
                            }
                        }
                    }
                ) { innerPadding ->
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(innerPadding)
                    ) {
                        when (selectedTab) {
                            0 -> CarParamsScreen(
                                connectionState = connectionState,
                                telemetry = telemetry,
                                carState = carState,
                                onRefresh = { viewModel.refreshState() }
                            )
                            1 -> CarCommandsScreen(
                                carState = carState,
                                uiState = uiState,
                                onMover = { x, y, caja -> viewModel.moverCarro(x, y, caja) },
                                onAvanzar = { viewModel.avanzar() },
                                onConfirmarParada = { usrId -> viewModel.confirmarParada(usrId) },
                                onReset = { viewModel.reset() }
                            )
                        }
                    }
                }
            }
        }
    }
}
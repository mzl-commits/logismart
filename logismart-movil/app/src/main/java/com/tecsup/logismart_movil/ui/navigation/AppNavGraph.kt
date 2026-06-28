package com.tecsup.logismart_movil.ui.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.tecsup.logismart_movil.data.local.SessionManager
import com.tecsup.logismart_movil.ui.auth.AuthViewModel
import com.tecsup.logismart_movil.ui.auth.LoginScreen
import com.tecsup.logismart_movil.ui.boxes.BoxesScreen
import com.tecsup.logismart_movil.ui.boxes.BoxesViewModel
import com.tecsup.logismart_movil.ui.dashboard.DashboardScreen
import com.tecsup.logismart_movil.ui.dashboard.DashboardViewModel
import com.tecsup.logismart_movil.ui.history.HistoryScreen
import com.tecsup.logismart_movil.ui.history.HistoryViewModel
import com.tecsup.logismart_movil.ui.history.TripDetailScreen
import com.tecsup.logismart_movil.ui.history.TripDetailViewModel
import com.tecsup.logismart_movil.ui.screens.CarCommandsScreen
import com.tecsup.logismart_movil.ui.screens.CarParamsScreen
import com.tecsup.logismart_movil.ui.settings.SettingsScreen
import com.tecsup.logismart_movil.ui.shelves.ShelvesScreen
import com.tecsup.logismart_movil.ui.shelves.ShelvesViewModel
import com.tecsup.logismart_movil.ui.viewmodel.CarViewModel
import kotlinx.coroutines.flow.first

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppNavGraph(
    sessionManager: SessionManager,
    onTestNotification: () -> Unit,
) {
    val navController = rememberNavController()
    val session by sessionManager.session.collectAsState(initial = null)
    var sessionLoaded by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        sessionManager.session.first()
        sessionLoaded = true
    }

    if (!sessionLoaded) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }

    val authViewModel: AuthViewModel = hiltViewModel()
    val authState by authViewModel.uiState.collectAsState()
    val targetRoute = if (session == null) Routes.Login.route else Routes.Dashboard.route

    NavHost(
        navController = navController,
        startDestination = targetRoute,
    ) {
        composable(Routes.Login.route) {
            LoginScreen(
                state = authState,
                onUsernameChange = authViewModel::onUsernameChange,
                onPasswordChange = authViewModel::onPasswordChange,
                onLogin = authViewModel::login,
            )
        }
        composable(Routes.Dashboard.route) {
            val dashboardViewModel: DashboardViewModel = hiltViewModel()
            val dashboardState by dashboardViewModel.uiState.collectAsState()
            DashboardScreen(
                state = dashboardState,
                userName = session?.fullName.orEmpty(),
                onRefresh = dashboardViewModel::refresh,
                onLogout = authViewModel::logout,
                onTestNotification = onTestNotification,
                onNavigateToCarControl = { navController.navigate(Routes.CarControl.route) },
                onNavigateToHistory = { navController.navigate(Routes.History.route) },
                onNavigateToBoxes = { navController.navigate(Routes.Boxes.route) },
                onNavigateToShelves = { navController.navigate(Routes.Shelves.route) },
                onNavigateToSettings = { navController.navigate(Routes.Settings.route) },
            )
        }
        composable(Routes.CarControl.route) {
            val carViewModel: CarViewModel = hiltViewModel()
            val connectionState by carViewModel.connectionState.collectAsState()
            val telemetry by carViewModel.telemetryFlow.collectAsState()
            val carState by carViewModel.carState.collectAsState()
            val uiState by carViewModel.uiState.collectAsState()

            var selectedTab by remember { mutableStateOf(0) }
            val tabs = listOf("Telemetría", "Controles")

            Scaffold(
                topBar = {
                    TopAppBar(
                        title = { Text("LogiSmart AGV Telemetría") },
                        navigationIcon = {
                            IconButton(onClick = { navController.popBackStack() }) {
                                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Atrás")
                            }
                        },
                        actions = {
                            IconButton(onClick = { carViewModel.refreshState() }) {
                                Icon(Icons.Default.Refresh, contentDescription = "Actualizar")
                            }
                        }
                    )
                }
            ) { innerPadding ->
                Column(Modifier.padding(innerPadding)) {
                    TabRow(selectedTabIndex = selectedTab) {
                        tabs.forEachIndexed { index, title ->
                            Tab(
                                selected = selectedTab == index,
                                onClick = { selectedTab = index },
                                text = { Text(title) }
                            )
                        }
                    }
                    Box(Modifier.fillMaxSize()) {
                        when (selectedTab) {
                            0 -> CarParamsScreen(
                                connectionState = connectionState,
                                telemetry = telemetry,
                                carState = carState,
                                onRefresh = { carViewModel.refreshState() }
                            )
                            1 -> CarCommandsScreen(
                                carState = carState,
                                uiState = uiState,
                                onMover = { x, y, caja -> carViewModel.moverCarro(x, y, caja) },
                                onAvanzar = { carViewModel.avanzar() },
                                onConfirmarParada = { usrId -> carViewModel.confirmarParada(usrId) },
                                onReset = { carViewModel.reset() }
                            )
                        }
                    }
                }
            }
        }
        composable(Routes.History.route) {
            val historyViewModel: HistoryViewModel = hiltViewModel()
            Scaffold(
                topBar = {
                    TopAppBar(
                        title = { Text("Historial de Viajes") },
                        navigationIcon = {
                            IconButton(onClick = { navController.popBackStack() }) {
                                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Atrás")
                            }
                        }
                    )
                }
            ) { innerPadding ->
                Box(Modifier.padding(innerPadding)) {
                    HistoryScreen(
                        viewModel = historyViewModel,
                        onTripClick = { tripId ->
                            navController.navigate(Routes.TripDetail.createRoute(tripId))
                        }
                    )
                }
            }
        }
        composable(
            route = Routes.TripDetail.route,
            arguments = listOf(navArgument("tripId") { type = NavType.IntType })
        ) { backStackEntry ->
            val tripId = backStackEntry.arguments?.getInt("tripId") ?: 0
            val tripViewModel: TripDetailViewModel = hiltViewModel()
            
            TripDetailScreen(
                tripId = tripId,
                viewModel = tripViewModel,
                onBack = { navController.popBackStack() }
            )
        }
        composable(Routes.Boxes.route) {
            val boxesViewModel: BoxesViewModel = hiltViewModel()
            Scaffold(
                topBar = {
                    TopAppBar(
                        title = { Text("Cajas Activas") },
                        navigationIcon = {
                            IconButton(onClick = { navController.popBackStack() }) {
                                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Atrás")
                            }
                        }
                    )
                }
            ) { innerPadding ->
                Box(Modifier.padding(innerPadding)) {
                    BoxesScreen(viewModel = boxesViewModel)
                }
            }
        }
        composable(Routes.Shelves.route) {
            val shelvesViewModel: ShelvesViewModel = hiltViewModel()
            Scaffold(
                topBar = {
                    TopAppBar(
                        title = { Text("Estantería de Almacén") },
                        navigationIcon = {
                            IconButton(onClick = { navController.popBackStack() }) {
                                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Atrás")
                            }
                        }
                    )
                }
            ) { innerPadding ->
                Box(Modifier.padding(innerPadding)) {
                    ShelvesScreen(viewModel = shelvesViewModel)
                }
            }
        }
        composable(Routes.Settings.route) {
            Scaffold(
                topBar = {
                    TopAppBar(
                        title = { Text("Ajustes del Sistema") },
                        navigationIcon = {
                            IconButton(onClick = { navController.popBackStack() }) {
                                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Atrás")
                            }
                        }
                    )
                }
            ) { innerPadding ->
                Box(Modifier.padding(innerPadding)) {
                    SettingsScreen()
                }
            }
        }
    }

    LaunchedEffect(targetRoute) {
        if (navController.currentDestination?.route != targetRoute) {
            navController.navigate(targetRoute) {
                popUpTo(navController.graph.startDestinationId) { inclusive = true }
                launchSingleTop = true
            }
        }
    }
}

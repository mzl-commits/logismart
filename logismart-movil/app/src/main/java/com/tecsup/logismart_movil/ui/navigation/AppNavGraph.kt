package com.tecsup.logismart_movil.ui.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.Warehouse
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.navArgument
import com.tecsup.logismart_movil.data.local.SessionManager
import com.tecsup.logismart_movil.ui.auth.AuthViewModel
import com.tecsup.logismart_movil.ui.auth.LoginScreen
import com.tecsup.logismart_movil.ui.boxes.BoxesScreen
import com.tecsup.logismart_movil.ui.boxes.BoxesViewModel
import com.tecsup.logismart_movil.ui.boxes.BoxDetailScreen
import com.tecsup.logismart_movil.ui.dashboard.DashboardScreen
import com.tecsup.logismart_movil.ui.dashboard.DashboardViewModel
import com.tecsup.logismart_movil.ui.dashboard.NotificationCenterScreen
import com.tecsup.logismart_movil.ui.history.HistoryScreen
import com.tecsup.logismart_movil.ui.history.HistoryViewModel
import com.tecsup.logismart_movil.ui.history.TripDetailScreen
import com.tecsup.logismart_movil.ui.history.TripDetailViewModel
import com.tecsup.logismart_movil.ui.planillas.PlanillasScreen
import com.tecsup.logismart_movil.ui.planillas.PlanillasViewModel
import com.tecsup.logismart_movil.ui.planillas.PdfViewerScreen
import com.tecsup.logismart_movil.ui.settings.SettingsScreen
import com.tecsup.logismart_movil.ui.shelves.ShelvesScreen
import com.tecsup.logismart_movil.ui.shelves.ShelvesViewModel
import com.tecsup.logismart_movil.ui.profile.ProfileScreen
import kotlinx.coroutines.flow.first

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppNavGraph(
    sessionManager: SessionManager,
    onTestNotification: (Int) -> Unit,
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
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route
    val bottomDestinations = listOf(
        Triple(Routes.Dashboard.route, "Inicio", Icons.Default.Home),
        Triple(Routes.Boxes.route, "Cajas", Icons.Default.Inventory2),
        Triple(Routes.Shelves.route, "Estantes", Icons.Default.Warehouse),
        Triple(Routes.History.route, "Historial", Icons.Default.History),
        Triple(Routes.Profile.route, "Perfil", Icons.Default.Person),
    )

    Scaffold(
        bottomBar = {
            if (session != null && bottomDestinations.any { it.first == currentRoute }) {
                NavigationBar(containerColor = MaterialTheme.colorScheme.surface, tonalElevation = 5.dp) {
                    bottomDestinations.forEach { (route, label, icon) ->
                        NavigationBarItem(
                            selected = currentRoute == route,
                            onClick = {
                                navController.navigate(route) {
                                    popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = { Icon(icon, contentDescription = label) },
                            label = { Text(label) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = MaterialTheme.colorScheme.onPrimaryContainer,
                                selectedTextColor = MaterialTheme.colorScheme.primary,
                                indicatorColor = MaterialTheme.colorScheme.primaryContainer,
                                unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                            ),
                        )
                    }
                }
            }
        }
    ) { appPadding ->
        Box(Modifier.fillMaxSize().padding(appPadding)) {
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
                onNavigateToPlanillas = { navController.navigate(Routes.Planillas.route) },
                onNavigateToHistory = { navController.navigate(Routes.History.route) },
                onNavigateToBoxes = { navController.navigate(Routes.Boxes.route) },
                onNavigateToShelves = { navController.navigate(Routes.Shelves.route) },
                onNavigateToSettings = { navController.navigate(Routes.Settings.route) },
                onNavigateToNotifications = { navController.navigate(Routes.Notifications.route) },
            )
        }
        composable(Routes.Notifications.route) {
            val vm: DashboardViewModel = hiltViewModel()
            val state by vm.uiState.collectAsState()
            NotificationCenterScreen(
                state = state,
                onBack = { navController.popBackStack() },
                onBoxes = { navController.navigate(Routes.Boxes.route) },
                onPlanillas = { navController.navigate(Routes.Planillas.route) },
                onHistory = { navController.navigate(Routes.History.route) },
            )
        }
        composable(Routes.Profile.route) {
            ProfileScreen(
                name = session?.fullName.orEmpty(),
                username = session?.username.orEmpty(),
                role = session?.role ?: "operator",
                onSettings = { navController.navigate(Routes.Settings.route) },
                onNotifications = { navController.navigate(Routes.Notifications.route) },
                onLogout = authViewModel::logout,
            )
        }
        composable(Routes.Planillas.route) {
            val planillasViewModel: PlanillasViewModel = hiltViewModel()
            val planillasState by planillasViewModel.uiState.collectAsState()

            PlanillasScreen(
                state = planillasState,
                onRefresh = planillasViewModel::loadPlanillas,
                onComplete = planillasViewModel::completarPlanilla,
                onBack = { navController.popBackStack() },
                onViewPdf = { cajas, userId ->
                    navController.navigate(Routes.PdfViewer.createRoute(cajas, userId))
                }
            )
        }
        composable(
            route = Routes.PdfViewer.route,
            arguments = listOf(
                navArgument("cajas") { type = NavType.StringType },
                navArgument("userId") { type = NavType.IntType }
            )
        ) { backStackEntry ->
            val cajas = backStackEntry.arguments?.getString("cajas") ?: ""
            val userId = backStackEntry.arguments?.getInt("userId") ?: 0
            PdfViewerScreen(
                cajas = cajas,
                userId = userId,
                sessionManager = sessionManager,
                onBack = { navController.popBackStack() }
            )
        }
        composable(Routes.History.route) {
            val historyViewModel: HistoryViewModel = hiltViewModel()
            Scaffold(
                topBar = {
                    TopAppBar(
                        title = {
                            Text(
                                "Historial de viajes",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = androidx.compose.ui.text.font.FontWeight.Bold,
                            )
                        },
                        colors = TopAppBarDefaults.topAppBarColors(
                            containerColor = MaterialTheme.colorScheme.surface,
                            scrolledContainerColor = MaterialTheme.colorScheme.surface,
                        ),
                    )
                }
            ) { innerPadding ->
                Box(Modifier.padding(innerPadding)) {
                    HistoryScreen(
                        viewModel = historyViewModel,
                        onTripClick = { tripId ->
                            navController.navigate(Routes.TripDetail.createRoute(tripId))
                        },
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
                        colors = TopAppBarDefaults.topAppBarColors(
                            containerColor = MaterialTheme.colorScheme.surface,
                            scrolledContainerColor = MaterialTheme.colorScheme.surface,
                        ),
                    )
                }
            ) { innerPadding ->
                Box(Modifier.padding(innerPadding)) {
                    BoxesScreen(viewModel = boxesViewModel, onBoxClick = { navController.navigate(Routes.BoxDetail.createRoute(it)) })
                }
            }
        }
        composable(
            route = Routes.BoxDetail.route,
            arguments = listOf(navArgument("boxId") { type = NavType.StringType })
        ) { entry ->
            val vm: BoxesViewModel = hiltViewModel()
            val boxState by vm.uiState.collectAsState()
            val box = boxState.allBoxes.firstOrNull { it.id == entry.arguments?.getString("boxId") }
            BoxDetailScreen(box = box, onBack = { navController.popBackStack() })
        }
        composable(Routes.Shelves.route) {
            val shelvesViewModel: ShelvesViewModel = hiltViewModel()
            ShelvesScreen(
                viewModel = shelvesViewModel,
                onBack = { navController.popBackStack() },
                showBack = false,
            )
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
                        },
                        colors = TopAppBarDefaults.topAppBarColors(
                            containerColor = MaterialTheme.colorScheme.surface,
                            scrolledContainerColor = MaterialTheme.colorScheme.surface,
                        ),
                    )
                }
            ) { innerPadding ->
                Box(Modifier.padding(innerPadding)) {
                    SettingsScreen()
                }
            }
        }
            }
        }
    }

    LaunchedEffect(targetRoute) {
        val currentDest = navController.currentDestination
        if (currentDest != null && currentDest.route != targetRoute) {
            try {
                val startDestId = navController.graph.startDestinationId
                navController.navigate(targetRoute) {
                    popUpTo(startDestId) { inclusive = true }
                    launchSingleTop = true
                }
            } catch (e: IllegalStateException) {
                navController.navigate(targetRoute) {
                    launchSingleTop = true
                }
            }
        }
    }
}

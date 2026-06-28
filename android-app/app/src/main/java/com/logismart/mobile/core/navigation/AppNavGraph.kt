package com.logismart.mobile.core.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.logismart.mobile.core.session.SessionManager
import com.logismart.mobile.feature.auth.AuthRepository
import com.logismart.mobile.feature.auth.AuthViewModel
import com.logismart.mobile.feature.auth.LoginScreen
import kotlinx.coroutines.flow.first

@Composable
fun AppNavGraph(
    sessionManager: SessionManager,
    authRepository: AuthRepository,
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

    val authViewModel: AuthViewModel = viewModel(
        factory = AuthViewModel.factory(authRepository)
    )
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
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("Dashboard LogiSmart")
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

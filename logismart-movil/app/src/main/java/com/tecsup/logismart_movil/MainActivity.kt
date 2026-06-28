package com.tecsup.logismart_movil

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.tecsup.logismart_movil.ui.boxes.BoxesScreen
import com.tecsup.logismart_movil.ui.history.HistoryScreen
import com.tecsup.logismart_movil.ui.history.TripDetailScreen
import com.tecsup.logismart_movil.ui.theme.LogismartmovilTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            LogismartmovilTheme {
                val navController = rememberNavController()
                val backStackEntry by navController.currentBackStackEntryAsState()
                val currentRoute = backStackEntry?.destination?.route

                Scaffold(
                    bottomBar = {
                        NavigationBar {
                            NavigationBarItem(
                                selected = currentRoute == "history",
                                onClick = {
                                    navController.navigate("history") {
                                        launchSingleTop = true
                                    }
                                },
                                label = { Text("Historial") },
                                icon = {}
                            )

                            NavigationBarItem(
                                selected = currentRoute == "boxes",
                                onClick = {
                                    navController.navigate("boxes") {
                                        launchSingleTop = true
                                    }
                                },
                                label = { Text("Cajas") },
                                icon = {}
                            )
                        }
                    }
                ) { innerPadding ->
                    NavHost(
                        navController = navController,
                        startDestination = "history",
                        modifier = Modifier.padding(innerPadding)
                    ) {
                        composable("history") {
                            HistoryScreen(
                                onTripClick = { tripId ->
                                    navController.navigate("trip/$tripId")
                                }
                            )
                        }

                        composable(
                            route = "trip/{tripId}",
                            arguments = listOf(
                                navArgument("tripId") {
                                    type = NavType.IntType
                                }
                            )
                        ) { backStackEntry ->
                            val tripId = backStackEntry.arguments?.getInt("tripId") ?: 0

                            TripDetailScreen(
                                tripId = tripId,
                                onBack = {
                                    navController.popBackStack()
                                }
                            )
                        }

                        composable("boxes") {
                            BoxesScreen()
                        }
                    }
                }
            }
        }
    }
}
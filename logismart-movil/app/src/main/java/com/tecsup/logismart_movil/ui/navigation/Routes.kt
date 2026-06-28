package com.tecsup.logismart_movil.ui.navigation

sealed class Routes(val route: String) {
    object Login : Routes("login")
    object Dashboard : Routes("dashboard")
    object CarControl : Routes("car_control")
    object History : Routes("history")
    object TripDetail : Routes("trip/{tripId}") {
        fun createRoute(tripId: Int) = "trip/$tripId"
    }
    object Boxes : Routes("boxes")
    object Shelves : Routes("shelves")
    object Settings : Routes("settings")
}

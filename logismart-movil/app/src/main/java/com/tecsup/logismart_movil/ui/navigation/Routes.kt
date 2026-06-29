package com.tecsup.logismart_movil.ui.navigation

sealed class Routes(val route: String) {
    object Login : Routes("login")
    object Dashboard : Routes("dashboard")
    object Planillas : Routes("planillas")
    object History : Routes("history")
    object TripDetail : Routes("trip/{tripId}") {
        fun createRoute(tripId: Int) = "trip/$tripId"
    }
    object Boxes : Routes("boxes")
    object Shelves : Routes("shelves")
    object Settings : Routes("settings")
    object Notifications : Routes("notifications")
    object Profile : Routes("profile")
    object BoxDetail : Routes("box/{boxId}") { fun createRoute(boxId: String) = "box/$boxId" }
    object PdfViewer : Routes("pdf_viewer/{cajas}/{userId}") {
        fun createRoute(cajas: String, userId: Int) = "pdf_viewer/$cajas/$userId"
    }
}

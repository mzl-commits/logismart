package com.logismart.mobile.core.navigation

sealed class Routes(val route: String) {
    data object Login : Routes("login")
    data object Dashboard : Routes("dashboard")
}

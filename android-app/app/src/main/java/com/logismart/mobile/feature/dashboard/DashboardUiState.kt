package com.logismart.mobile.feature.dashboard

data class DashboardSummary(
    val carStatus: String = "Sin información",
    val activeAlerts: Int = 0,
    val pendingBoxes: Int = 0,
    val completedDispatches: Int = 0,
    val quickActions: List<String> = emptyList(),
)

data class DashboardUiState(
    val summary: DashboardSummary = DashboardSummary(),
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val errorMessage: String? = null,
)

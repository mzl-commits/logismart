package com.tecsup.logismart_movil.ui.dashboard

data class DashboardSummary(
    val pendingBoxes: Int = 0,
    val completedDispatches: Int = 0,
    val planillasCount: Int = 0,
    val quickActions: List<String> = emptyList(),
)

data class DashboardUiState(
    val summary: DashboardSummary = DashboardSummary(),
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val errorMessage: String? = null,
)

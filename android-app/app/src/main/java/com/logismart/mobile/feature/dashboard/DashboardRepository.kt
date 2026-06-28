package com.logismart.mobile.feature.dashboard

import com.logismart.mobile.core.network.ApiResult

class DashboardRepository {
    suspend fun loadDashboard(): ApiResult<DashboardSummary> =
        ApiResult.Success(
            DashboardSummary(
                carStatus = "Consultando",
                quickActions = listOf("Ver estado", "Alertas", "Cerrar sesión"),
            )
        )
}

package com.logismart.mobile.feature.dashboard

import com.logismart.mobile.core.network.ApiClient
import com.logismart.mobile.core.network.ApiResult
import com.logismart.mobile.core.network.LogiSmartApi

class DashboardRepository(private val api: LogiSmartApi) {
    suspend fun loadDashboard(): ApiResult<DashboardSummary> =
        runCatching { api.dashboard() }.fold(
            onSuccess = { response ->
                when {
                    response.isSuccessful && response.body() != null -> {
                        val body = response.body()!!
                        ApiResult.Success(
                            DashboardSummary(
                                carStatus = body.carStatus,
                                activeAlerts = body.activeAlerts,
                                pendingBoxes = body.pendingBoxes,
                                completedDispatches = body.completedDispatches,
                                quickActions = body.quickActions,
                            )
                        )
                    }
                    response.code() == 401 -> ApiResult.Unauthorized
                    else -> ApiResult.Error(
                        ApiClient.errorMessage(
                            response.errorBody()?.string(),
                            "No fue posible cargar el resumen.",
                        )
                    )
                }
            },
            onFailure = {
                ApiResult.Error("No se pudo conectar con el servidor LogiSmart.")
            },
        )
}

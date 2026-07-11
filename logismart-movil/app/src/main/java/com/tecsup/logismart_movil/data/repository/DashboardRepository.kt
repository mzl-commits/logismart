package com.tecsup.logismart_movil.data.repository

import com.google.gson.Gson
import com.tecsup.logismart_movil.data.model.ApiResult
import com.tecsup.logismart_movil.data.remote.ApiError
import com.tecsup.logismart_movil.data.remote.LogiSmartApi
import com.tecsup.logismart_movil.ui.dashboard.DashboardSummary
import com.tecsup.logismart_movil.data.demo.DemoDataSource

class DashboardRepository(private val api: LogiSmartApi) {
    private val gson = Gson()

    private fun errorMessage(rawBody: String?, fallback: String): String =
        runCatching { gson.fromJson(rawBody, ApiError::class.java).detail }
            .getOrNull()
            ?.takeIf { it.isNotBlank() }
            ?: fallback

    suspend fun loadDashboard(): ApiResult<DashboardSummary> =
        if (DemoDataSource.offlineMode) ApiResult.Success(DemoDataSource.dashboard()) else runCatching { api.dashboard() }.fold(
            onSuccess = { response ->
                when {
                    response.isSuccessful && response.body() != null -> {
                        val body = response.body()!!
                        ApiResult.Success(
                            DashboardSummary(
                                pendingBoxes = body.pendingBoxes,
                                completedDispatches = body.completedDispatches,
                                planillasCount = body.planillasCount,
                                completedPlanillas = body.completedPlanillas,
                                isAdmin = body.isAdmin,
                                quickActions = body.quickActions,
                            )
                        )
                    }
                    response.code() == 401 -> ApiResult.Unauthorized
                    else -> ApiResult.Error(
                        errorMessage(
                            response.errorBody()?.string(),
                            "No fue posible cargar el resumen.",
                        )
                    )
                }
            },
            onFailure = {
                ApiResult.Success(DemoDataSource.dashboard())
            },
        )
}

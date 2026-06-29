package com.tecsup.logismart_movil.data.repository

import com.google.gson.Gson
import com.tecsup.logismart_movil.data.model.ApiResult
import com.tecsup.logismart_movil.data.remote.ApiError
import com.tecsup.logismart_movil.data.remote.LogiSmartApi
import com.tecsup.logismart_movil.data.remote.PlanillaDto

class PlanillaRepository(private val api: LogiSmartApi) {
    private val gson = Gson()

    private fun errorMessage(rawBody: String?, fallback: String): String =
        runCatching { gson.fromJson(rawBody, ApiError::class.java).detail }
            .getOrNull()
            ?.takeIf { it.isNotBlank() }
            ?: fallback

    suspend fun getPlanillas(): ApiResult<List<PlanillaDto>> =
        runCatching { api.getPlanillas() }.fold(
            onSuccess = { response ->
                when {
                    response.isSuccessful && response.body() != null -> {
                        ApiResult.Success(response.body()!!)
                    }
                    response.code() == 401 -> ApiResult.Unauthorized
                    else -> ApiResult.Error(
                        errorMessage(
                            response.errorBody()?.string(),
                            "No fue posible cargar las planillas.",
                        )
                    )
                }
            },
            onFailure = {
                ApiResult.Error("No se pudo conectar con el servidor LogiSmart.")
            },
        )

    suspend fun completarPlanilla(id: Int): ApiResult<Unit> =
        runCatching { api.completarPlanilla(id) }.fold(
            onSuccess = { response ->
                if (response.isSuccessful) ApiResult.Success(Unit)
                else ApiResult.Error(errorMessage(response.errorBody()?.string(), "No fue posible completar la planilla."))
            },
            onFailure = { ApiResult.Error("No se pudo conectar con el servidor LogiSmart.") },
        )

    suspend fun downloadPdfLote(cajas: String, userId: Int, token: String): ApiResult<okhttp3.ResponseBody> =
        runCatching { api.descargarPdfLote(cajas, userId, token) }.fold(
            onSuccess = { response ->
                when {
                    response.isSuccessful && response.body() != null -> {
                        ApiResult.Success(response.body()!!)
                    }
                    response.code() == 401 -> ApiResult.Unauthorized
                    else -> ApiResult.Error(
                        errorMessage(
                            response.errorBody()?.string(),
                            "No fue posible descargar el PDF de la planilla.",
                        )
                    )
                }
            },
            onFailure = {
                ApiResult.Error("No se pudo conectar con el servidor LogiSmart para descargar el PDF.")
            }
        )
}

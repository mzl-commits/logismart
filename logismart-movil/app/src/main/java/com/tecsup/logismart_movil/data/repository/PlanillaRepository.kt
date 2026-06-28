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
}

package com.logismart.mobile.feature.auth

import com.logismart.mobile.core.network.ApiClient
import com.logismart.mobile.core.network.ApiResult
import com.logismart.mobile.core.network.LogiSmartApi
import com.logismart.mobile.core.network.LoginRequest
import com.logismart.mobile.core.network.LoginResponse

class AuthRepository(private val api: LogiSmartApi) {
    suspend fun login(username: String, password: String): ApiResult<LoginResponse> =
        runCatching { api.login(LoginRequest(username.trim(), password)) }
            .fold(
                onSuccess = { response ->
                    if (response.isSuccessful && response.body() != null) {
                        ApiResult.Success(response.body()!!)
                    } else {
                        ApiResult.Error(
                            ApiClient.errorMessage(
                                response.errorBody()?.string(),
                                "No fue posible iniciar sesión.",
                            )
                        )
                    }
                },
                onFailure = {
                    ApiResult.Error("No se pudo conectar con LogiSmart. Verifica la red y el servidor.")
                },
            )
}

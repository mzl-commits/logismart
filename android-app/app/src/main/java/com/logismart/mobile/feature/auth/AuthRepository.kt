package com.logismart.mobile.feature.auth

import com.logismart.mobile.core.network.ApiClient
import com.logismart.mobile.core.network.ApiResult
import com.logismart.mobile.core.network.LogiSmartApi
import com.logismart.mobile.core.network.LoginRequest
import com.logismart.mobile.core.network.LoginResponse
import com.logismart.mobile.core.session.SessionManager

class AuthRepository(
    private val api: LogiSmartApi,
    private val sessionManager: SessionManager,
) {
    suspend fun login(username: String, password: String): ApiResult<LoginResponse> =
        runCatching { api.login(LoginRequest(username.trim(), password)) }
            .fold(
                onSuccess = { response ->
                    if (response.isSuccessful && response.body() != null) {
                        val login = response.body()!!
                        sessionManager.save(login.token, login.username, login.fullName)
                        ApiResult.Success(login)
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

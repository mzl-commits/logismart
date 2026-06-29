package com.tecsup.logismart_movil.data.repository

import com.google.gson.Gson
import com.tecsup.logismart_movil.data.local.SessionManager
import com.tecsup.logismart_movil.data.model.ApiResult
import com.tecsup.logismart_movil.data.remote.ApiError
import com.tecsup.logismart_movil.data.remote.LogiSmartApi
import com.tecsup.logismart_movil.data.remote.LoginRequest
import com.tecsup.logismart_movil.data.remote.LoginResponse

class AuthRepository(
    private val api: LogiSmartApi,
    private val sessionManager: SessionManager,
) {
    private val gson = Gson()

    private fun errorMessage(rawBody: String?, fallback: String): String =
        runCatching { gson.fromJson(rawBody, ApiError::class.java).detail }
            .getOrNull()
            ?.takeIf { it.isNotBlank() }
            ?: fallback

    suspend fun login(username: String, password: String): ApiResult<LoginResponse> =
        runCatching { api.login(LoginRequest(username.trim(), password)) }
            .fold(
                onSuccess = { response ->
                    if (response.isSuccessful && response.body() != null) {
                        val login = response.body()!!
                        sessionManager.save(login.token, login.username, login.fullName, login.role)
                        ApiResult.Success(login)
                    } else {
                        ApiResult.Error(
                            errorMessage(
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

    suspend fun logout() {
        sessionManager.clear()
    }
}

package com.tecsup.logismart_movil.data.repository

import com.google.gson.Gson
import com.tecsup.logismart_movil.data.local.SessionManager
import com.tecsup.logismart_movil.data.model.ApiResult
import com.tecsup.logismart_movil.data.remote.ApiError
import com.tecsup.logismart_movil.data.remote.LogiSmartApi
import com.tecsup.logismart_movil.data.remote.LoginRequest
import com.tecsup.logismart_movil.data.remote.LoginResponse
import com.tecsup.logismart_movil.data.demo.DemoDataSource

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
                        DemoDataSource.offlineMode = false
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
                    DemoDataSource.offlineMode = true
                    val normalizedUser = username.trim().ifBlank { "operador" }
                    val demoLogin = LoginResponse(
                        token = "offline-demo-token",
                        username = normalizedUser,
                        fullName = if (normalizedUser.equals("admin", true)) "Administrador Demo" else "Operador Demo",
                        role = if (normalizedUser.equals("admin", true)) "admin" else "operador",
                    )
                    sessionManager.save(demoLogin.token, demoLogin.username, demoLogin.fullName, demoLogin.role)
                    ApiResult.Success(demoLogin)
                },
            )

    suspend fun logout() {
        sessionManager.clear()
    }

    suspend fun loginOffline(): LoginResponse {
        DemoDataSource.offlineMode = true
        return LoginResponse("offline-demo-token", "demo", "Operador Demo", "operador").also {
            sessionManager.save(it.token, it.username, it.fullName, it.role)
        }
    }
}

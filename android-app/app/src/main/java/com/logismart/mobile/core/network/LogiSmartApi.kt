package com.logismart.mobile.core.network

import com.google.gson.annotations.SerializedName
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

data class LoginRequest(
    val username: String,
    val password: String,
)

data class LoginResponse(
    val token: String,
    val username: String,
    @SerializedName("full_name") val fullName: String,
)

data class DashboardResponse(
    @SerializedName("car_status") val carStatus: String,
    @SerializedName("active_alerts") val activeAlerts: Int,
    @SerializedName("pending_boxes") val pendingBoxes: Int,
    @SerializedName("completed_dispatches") val completedDispatches: Int,
    @SerializedName("quick_actions") val quickActions: List<String>,
)

data class ApiError(val detail: String?)

interface LogiSmartApi {
    @POST("api/mobile/login/")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @GET("api/mobile/dashboard/")
    suspend fun dashboard(): Response<DashboardResponse>
}

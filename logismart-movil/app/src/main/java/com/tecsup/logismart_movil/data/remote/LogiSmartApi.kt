package com.tecsup.logismart_movil.data.remote

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
    @SerializedName("pending_boxes") val pendingBoxes: Int,
    @SerializedName("completed_dispatches") val completedDispatches: Int,
    @SerializedName("planillas_count") val planillasCount: Int,
    @SerializedName("quick_actions") val quickActions: List<String>,
)

data class BoxDto(
    val id: String,
    val producto: String,
    val estado: String,
    val prioridad: String,
    val categoria: String,
    val ubicacion: String,
)

data class PlanillaDto(
    @SerializedName("id_planilla") val idPlanilla: Int,
    @SerializedName("fecha_creacion") val fechaCreacion: String,
    @SerializedName("total_cajas") val totalCajas: Int,
    @SerializedName("operador_id") val operadorId: Int,
    @SerializedName("pdf_url") val pdfUrl: String,
    val cajas: List<BoxDto>,
)

data class ApiError(val detail: String?)

interface LogiSmartApi {
    @POST("api/mobile/login/")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @GET("api/mobile/dashboard/")
    suspend fun dashboard(): Response<DashboardResponse>

    @GET("api/mobile/planillas/")
    suspend fun getPlanillas(): Response<List<PlanillaDto>>

    @retrofit2.http.Streaming
    @GET("api/cajas/descargar_pdf_lote/")
    suspend fun descargarPdfLote(
        @retrofit2.http.Query("cajas") cajas: String,
        @retrofit2.http.Query("usuario_id") usuarioId: Int,
        @retrofit2.http.Query("token") token: String
    ): Response<okhttp3.ResponseBody>
}

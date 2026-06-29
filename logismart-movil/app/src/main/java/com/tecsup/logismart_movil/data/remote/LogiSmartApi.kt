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

    @GET("api/cajas/")
    suspend fun getCajas(): Response<List<com.tecsup.logismart_movil.data.model.CajaDto>>

    @GET("api/usuarios/")
    suspend fun getUsuarios(): Response<List<com.tecsup.logismart_movil.data.remote.UsuarioDto>>

    @GET("api/vehiculos/")
    suspend fun getVehiculos(): Response<List<com.tecsup.logismart_movil.data.remote.VehiculoDto>>

    @GET("api/destinos/")
    suspend fun getDestinos(): Response<List<com.tecsup.logismart_movil.data.remote.DestinoDto>>

    @POST("api/cajas/{id}/procesar/")
    suspend fun procesarCaja(
        @retrofit2.http.Path("id") id: String,
        @Body request: com.tecsup.logismart_movil.data.remote.UserActionRequest
    ): Response<Unit>

    @POST("api/cajas/{id}/confirmar_almacenada/")
    suspend fun confirmarAlmacenada(
        @retrofit2.http.Path("id") id: String,
        @Body request: com.tecsup.logismart_movil.data.remote.UserActionRequest
    ): Response<Unit>

    @POST("api/cajas/{id}/confirmar_despacho/")
    suspend fun confirmarDespacho(
        @retrofit2.http.Path("id") id: String,
        @Body request: com.tecsup.logismart_movil.data.remote.DespachoRequest
    ): Response<Unit>
}

data class UsuarioDto(
    @SerializedName("id_usuario") val idUsuario: Int,
    val nombre: String,
    val rol: String
)

data class VehiculoDto(
    val placa: String,
    val marca: String
)

data class DestinoDto(
    val id: Int,
    val nombre: String,
    val direccion: String
)

data class UserActionRequest(
    @SerializedName("id_usuario") val idUsuario: Int?
)

data class DespachoRequest(
    @SerializedName("id_usuario") val idUsuario: Int?,
    @SerializedName("transporte_placa") val transportePlaca: String,
    val destino: String
)

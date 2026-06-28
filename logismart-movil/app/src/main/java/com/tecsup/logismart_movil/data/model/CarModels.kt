package com.tecsup.logismart_movil.data.model

import com.google.gson.annotations.SerializedName

data class EstadoCarroDto(
    @SerializedName("id") val id: Int,
    @SerializedName("pos_x") val posX: Int,
    @SerializedName("pos_y") val posY: Int,
    @SerializedName("destino_x") val destinoX: Int,
    @SerializedName("destino_y") val destinoY: Int,
    @SerializedName("ruta") val ruta: List<CoordenadaDto>,
    @SerializedName("estado") val estado: String,
    @SerializedName("caja_id") val cajaId: String?,
    @SerializedName("paradas") val paradas: List<ParadaDto>?,
    @SerializedName("parada_actual") val paradaActual: Int,
    @SerializedName("actualizado_en") val actualizadoEn: String
)

data class CoordenadaDto(
    @SerializedName("x") val x: Int,
    @SerializedName("y") val y: Int
)

data class ParadaDto(
    @SerializedName("caja_id") val cajaId: String,
    @SerializedName("x") val x: Int,
    @SerializedName("y") val y: Int,
    @SerializedName("ubicacion_id") val ubicacionId: Int?,
    @SerializedName("ubicacion_nombre") val ubicacionNombre: String?
)

data class MoverCarroRequest(
    @SerializedName("destino_x") val destinoX: Int,
    @SerializedName("destino_y") val destinoY: Int,
    @SerializedName("caja_id") val cajaId: String? = null
)

data class MoverCarroResponse(
    @SerializedName("mensaje") val mensaje: String,
    @SerializedName("ruta") val ruta: List<CoordenadaDto>
)

data class ConfirmarParadaRequest(
    @SerializedName("id_usuario") val idUsuario: Int
)

data class ConfirmarParadaResponse(
    @SerializedName("mensaje") val mensaje: String,
    @SerializedName("finalizado") val finalizado: Boolean,
    @SerializedName("regresando") val regresando: Boolean? = false,
    @SerializedName("parada_actual") val paradaActual: Int? = null,
    @SerializedName("total_paradas") val totalParadas: Int? = null
)

data class ResetCarroResponse(
    @SerializedName("mensaje") val mensaje: String
)

data class RealTimeTelemetry(
    val velocidad: Double,      // m/s
    val temperatura: Double,    // °C
    val bateria: Int,           // %
    val senal: Int,             // dBm
    val isSimulated: Boolean = false
)

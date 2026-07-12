package com.tecsup.logismart_movil.data.model

import com.google.gson.annotations.SerializedName

data class DespachoDto(
    @SerializedName("id_despacho")
    val idDespacho: Int? = null,

    @SerializedName("id_caja")
    val idCaja: String? = null,

    @SerializedName("destino")
    val destino: String? = null,

    @SerializedName("transporte_placa")
    val transportePlaca: String? = null,

    @SerializedName("fecha_salida")
    val fechaSalida: String? = null
)

data class CajaDto(
    @SerializedName("id")
    val id: String? = null,

    @SerializedName("producto")
    val producto: String? = null,

    @SerializedName("cantidad")
    val cantidad: Int? = null,

    @SerializedName("peso_kg")
    val pesoKg: String? = null,

    @SerializedName("prioridad")
    val prioridad: String? = null,

    @SerializedName("categoria")
    val categoria: String? = null,

    @SerializedName("es_fragil")
    val esFragil: Boolean? = null,

    @SerializedName("estado")
    val estado: String? = null,

    @SerializedName("hora_llegada")
    val horaLlegada: String? = null,

    @SerializedName("id_ubicacion")
    val idUbicacion: Int? = null,

    @SerializedName("ubicacion_nombre")
    val ubicacionNombre: String? = null
)

data class Trip(
    val id: Int,
    val fecha: String,
    val origen: String,
    val destino: String,
    val estado: String,
    val ruta: String,
    val tiempo: String,
    val cargaTransportada: String,
    val transporte: String
)

data class LogisticBox(
    val id: String,
    val producto: String,
    val cantidad: Int,
    val pesoKg: String,
    val categoria: String,
    val estado: String,
    val ubicacion: String,
    val esFragil: Boolean
)

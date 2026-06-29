package com.tecsup.logismart_movil.data.remote.dto

import com.google.gson.annotations.SerializedName
import com.tecsup.logismart_movil.domain.model.Shelf
import com.tecsup.logismart_movil.domain.model.Slot

data class SlotDto(
    @SerializedName("id_ubicacion")
    val idUbicacion: Int? = null,
    
    @SerializedName("nivel")
    val nivel: Int? = null,
    
    @SerializedName("lado")
    val lado: String? = null,
    
    @SerializedName("casillero")
    val casillero: Int? = null,
    
    @SerializedName("estado_ocupacion")
    val estadoOcupacion: Boolean? = null,
    
    @SerializedName("producto")
    val producto: String? = null
) {
    fun toDomain(): Slot {
        return Slot(
            idUbicacion = idUbicacion ?: 0,
            nivel = nivel ?: 1,
            lado = lado ?: "adelante",
            casillero = casillero ?: 1,
            estadoOcupacion = estadoOcupacion ?: false,
            producto = producto
        )
    }
}

data class ShelfDto(
    val id: Int? = null,
    val name: String? = null,

    @SerializedName("capacity")
    val capacity: Int? = null,

    @SerializedName("current_occupation")
    val currentOccupation: Int? = null,

    @SerializedName("assigned_boxes")
    val assignedBoxes: Int? = null,

    @SerializedName("occupation_pct")
    val occupationPct: Int? = null,

    @SerializedName("status")
    val status: String? = null,

    @SerializedName("tipo_estante")
    val tipoEstante: String? = null,

    @SerializedName("slots")
    val slots: List<SlotDto>? = null,
) {
    fun toDomain(): Shelf {
        return Shelf(
            id = id ?: 0,
            name = name ?: "Estante sin nombre",
            capacity = capacity ?: 0,
            currentOccupation = currentOccupation ?: 0,
            assignedBoxes = assignedBoxes ?: 0,
            occupationPct = occupationPct ?: 0,
            status = status ?: "Disponible",
            tipoEstante = tipoEstante ?: "General",
            slots = slots?.map { it.toDomain() } ?: emptyList()
        )
    }
}



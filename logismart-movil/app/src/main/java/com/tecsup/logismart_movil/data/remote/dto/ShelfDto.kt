package com.tecsup.logismart_movil.data.remote.dto

import com.google.gson.annotations.SerializedName
import com.tecsup.logismart_movil.domain.model.Shelf

data class ShelfDto(
    val id: Int? = null,
    val name: String? = null,

    @SerializedName("capacity")
    val capacity: Int? = null,

    @SerializedName("current_occupation")
    val currentOccupation: Int? = null,

    @SerializedName("assigned_boxes")
    val assignedBoxes: Int? = null
) {
    fun toDomain(): Shelf {
        return Shelf(
            id = id ?: 0,
            name = name ?: "Estante sin nombre",
            capacity = capacity ?: 0,
            currentOccupation = currentOccupation ?: 0,
            assignedBoxes = assignedBoxes ?: 0
        )
    }
}

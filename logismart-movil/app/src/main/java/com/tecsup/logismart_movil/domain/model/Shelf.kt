package com.tecsup.logismart_movil.domain.model

data class Shelf(
    val id: Int,
    val name: String,
    val capacity: Int,
    val currentOccupation: Int,
    val assignedBoxes: Int
) {
    val occupationPercentage: Float
        get() = if (capacity == 0) 0f else (currentOccupation.toFloat() / capacity.toFloat()) * 100f

    val status: String
        get() = when {
            occupationPercentage >= 90f -> "Alerta"
            occupationPercentage >= 70f -> "Ocupado"
            else -> "Disponible"
        }
}

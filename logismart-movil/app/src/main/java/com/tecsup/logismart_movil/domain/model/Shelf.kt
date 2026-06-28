package com.tecsup.logismart_movil.domain.model

data class Shelf(
    val id: Int,
    val name: String,
    val capacity: Int,
    val currentOccupation: Int,
    val assignedBoxes: Int,
    val occupationPct: Int = 0,
    val status: String = "Disponible",
    val tipoEstante: String = "General",
) {
    val occupationPercentage: Float
        get() = occupationPct.toFloat()
}

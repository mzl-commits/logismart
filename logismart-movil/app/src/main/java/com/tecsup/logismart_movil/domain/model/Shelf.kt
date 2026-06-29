package com.tecsup.logismart_movil.domain.model

data class Slot(
    val idUbicacion: Int,
    val nivel: Int,
    val lado: String,
    val casillero: Int,
    val estadoOcupacion: Boolean,
    val producto: String?
)

data class Shelf(
    val id: Int,
    val name: String,
    val capacity: Int,
    val currentOccupation: Int,
    val assignedBoxes: Int,
    val occupationPct: Int = 0,
    val status: String = "Disponible",
    val tipoEstante: String = "General",
    val slots: List<Slot> = emptyList(),
) {
    val occupationPercentage: Float
        get() = occupationPct.toFloat()
}


package com.tecsup.logismart_movil.utils

object StatusUtils {

    fun getShelfStatus(occupationPercentage: Float): String {
        return when {
            occupationPercentage >= 90f -> "Alerta"
            occupationPercentage >= 70f -> "Ocupado"
            occupationPercentage > 0f -> "Disponible"
            else -> "Vacío"
        }
    }

    fun getStatusDescription(status: String): String {
        return when (status.lowercase()) {
            "alerta" -> "El estante está cerca de su capacidad máxima."
            "ocupado" -> "El estante tiene una ocupación alta."
            "disponible" -> "El estante aún tiene espacio disponible."
            "vacío" -> "El estante no tiene cajas asignadas."
            else -> "Estado no reconocido."
        }
    }

    fun isCriticalStatus(status: String): Boolean {
        return status.equals("Alerta", ignoreCase = true)
    }
}

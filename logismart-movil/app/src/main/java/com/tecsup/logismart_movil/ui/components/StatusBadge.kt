package com.tecsup.logismart_movil.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

enum class BadgeStatus {
    ACTIVO,
    INACTIVO,
    ALERTA,
    DISPONIBLE,
    OCUPADO
}

@Composable
fun StatusBadge(
    status: BadgeStatus,
    modifier: Modifier = Modifier
) {
    val backgroundColor = when (status) {
        BadgeStatus.ACTIVO -> Color(0xFFDFF5E1)
        BadgeStatus.INACTIVO -> Color(0xFFE0E0E0)
        BadgeStatus.ALERTA -> Color(0xFFFFE0B2)
        BadgeStatus.DISPONIBLE -> Color(0xFFD6EAF8)
        BadgeStatus.OCUPADO -> Color(0xFFFFCDD2)
    }

    val textColor = when (status) {
        BadgeStatus.ACTIVO -> Color(0xFF2E7D32)
        BadgeStatus.INACTIVO -> Color(0xFF424242)
        BadgeStatus.ALERTA -> Color(0xFFE65100)
        BadgeStatus.DISPONIBLE -> Color(0xFF1565C0)
        BadgeStatus.OCUPADO -> Color(0xFFC62828)
    }

    val label = when (status) {
        BadgeStatus.ACTIVO -> "Activo"
        BadgeStatus.INACTIVO -> "Inactivo"
        BadgeStatus.ALERTA -> "Alerta"
        BadgeStatus.DISPONIBLE -> "Disponible"
        BadgeStatus.OCUPADO -> "Ocupado"
    }

    Box(
        modifier = modifier
            .background(backgroundColor, RoundedCornerShape(50))
            .padding(horizontal = 12.dp, vertical = 6.dp)
    ) {
        Text(
            text = label,
            color = textColor,
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.Bold
        )
    }
}

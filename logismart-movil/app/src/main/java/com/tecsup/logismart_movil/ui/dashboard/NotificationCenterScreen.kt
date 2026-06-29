package com.tecsup.logismart_movil.ui.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Assignment
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationCenterScreen(
    state: DashboardUiState,
    onBack: () -> Unit,
    onBoxes: () -> Unit,
    onPlanillas: () -> Unit,
    onHistory: () -> Unit,
) {
    Scaffold(topBar = { TopAppBar(title = { Text("Notificaciones", fontWeight = FontWeight.Bold) }, navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Atrás") } }) }) { padding ->
        LazyColumn(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background).padding(padding), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item { Text("Actividad operativa", style = MaterialTheme.typography.headlineSmall); Text("Eventos calculados con el estado actual del almacén.", color = MaterialTheme.colorScheme.onSurfaceVariant) }
            item { NotificationCard(Icons.Default.WarningAmber, "Cajas pendientes", "${state.summary.pendingBoxes} cajas requieren procesamiento", Color(0xFFF59E0B), onBoxes) }
            item { NotificationCard(Icons.AutoMirrored.Filled.Assignment, "Planillas", if (state.summary.isAdmin) "${state.summary.completedPlanillas} de ${state.summary.planillasCount} completadas" else "${state.summary.planillasCount} asignadas", MaterialTheme.colorScheme.primary, onPlanillas) }
            item { NotificationCard(Icons.Default.TaskAlt, "Despachos", "${state.summary.completedDispatches} despachos registrados", Color(0xFF10B981), onHistory) }
        }
    }
}

@Composable private fun NotificationCard(icon: ImageVector, title: String, body: String, color: Color, onClick: () -> Unit) {
    Card(Modifier.fillMaxWidth().clickable(onClick = onClick), shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), border = CardDefaults.outlinedCardBorder()) {
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(color = color.copy(alpha=.12f), shape = RoundedCornerShape(12.dp)) { Icon(icon, null, Modifier.padding(11.dp).size(24.dp), tint=color) }
            Spacer(Modifier.width(12.dp)); Column(Modifier.weight(1f)) { Text(title, fontWeight=FontWeight.SemiBold); Text(body, style=MaterialTheme.typography.bodySmall, color=MaterialTheme.colorScheme.onSurfaceVariant) }
            Icon(Icons.Default.ChevronRight, null, tint=MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

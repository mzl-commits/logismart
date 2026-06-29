package com.tecsup.logismart_movil.ui.history

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Route
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.FilledTonalIconButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel

@Composable
fun TripDetailScreen(
    tripId: Int,
    onBack: () -> Unit,
    viewModel: TripDetailViewModel = viewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    LaunchedEffect(tripId) { viewModel.loadTrip(tripId) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            FilledTonalIconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver")
            }
            Spacer(Modifier.width(12.dp))
            Column {
                Text("Detalle de viaje", style = MaterialTheme.typography.headlineSmall)
                Text("Seguimiento completo del movimiento", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }

        when {
            state.loading -> Box(Modifier.fillMaxWidth().padding(vertical = 80.dp), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(strokeWidth = 3.dp)
            }
            state.trip == null -> EmptyDetailState()
            else -> {
                val trip = state.trip!!
                ElevatedCard(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.elevatedCardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.elevatedCardElevation(defaultElevation = 1.dp),
                ) {
                    Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Surface(color = MaterialTheme.colorScheme.primaryContainer, shape = RoundedCornerShape(14.dp)) {
                                Icon(Icons.Default.Route, null, Modifier.padding(12.dp).size(26.dp))
                            }
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text("Viaje #${trip.id}", style = MaterialTheme.typography.titleLarge)
                                Text(trip.estado, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
                            }
                        }
                        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                        DetailRow(Icons.Default.CalendarToday, "Fecha", trip.fecha)
                        DetailRow(Icons.Default.Inventory2, "Origen", trip.origen)
                        DetailRow(Icons.Default.LocationOn, "Destino", trip.destino)
                        DetailRow(Icons.Default.Route, "Ruta", trip.ruta)
                    }
                }

                Text("INFORMACIÓN OPERATIVA", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    MetricCard(Icons.Default.Schedule, "Tiempo", trip.tiempo, Modifier.weight(1f))
                    MetricCard(Icons.Default.Inventory2, "Carga", trip.cargaTransportada, Modifier.weight(1f))
                }
                MetricCard(Icons.Default.LocalShipping, "Transporte asignado", trip.transporte, Modifier.fillMaxWidth())
            }
        }
    }
}

@Composable
private fun DetailRow(icon: ImageVector, label: String, value: String) {
    Row(verticalAlignment = Alignment.Top) {
        Icon(icon, null, Modifier.size(19.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.width(12.dp))
        Column {
            Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(value, style = MaterialTheme.typography.bodyLarge)
        }
    }
}

@Composable
private fun MetricCard(icon: ImageVector, label: String, value: String, modifier: Modifier) {
    Surface(modifier = modifier, color = MaterialTheme.colorScheme.surface, shape = RoundedCornerShape(16.dp), tonalElevation = 1.dp) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Icon(icon, null, tint = MaterialTheme.colorScheme.primary)
            Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(value, style = MaterialTheme.typography.titleSmall)
        }
    }
}

@Composable
private fun EmptyDetailState() {
    Column(Modifier.fillMaxWidth().padding(vertical = 64.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Surface(shape = CircleShape, color = MaterialTheme.colorScheme.errorContainer) {
            Icon(Icons.Default.ErrorOutline, null, Modifier.padding(18.dp).size(32.dp), tint = MaterialTheme.colorScheme.onErrorContainer)
        }
        Spacer(Modifier.size(14.dp))
        Text("No se encontró el viaje", style = MaterialTheme.typography.titleMedium)
        Text("La información solicitada ya no está disponible.", color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

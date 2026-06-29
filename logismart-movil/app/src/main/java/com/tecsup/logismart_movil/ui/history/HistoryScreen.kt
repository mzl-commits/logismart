package com.tecsup.logismart_movil.ui.history

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Route
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.tecsup.logismart_movil.data.model.Trip
import com.tecsup.logismart_movil.ui.theme.AmberWarning
import com.tecsup.logismart_movil.ui.theme.EmeraldGreen
import com.tecsup.logismart_movil.ui.theme.InfoBlue
import com.tecsup.logismart_movil.ui.theme.RoseDanger
import com.tecsup.logismart_movil.ui.components.LoadingSkeleton

@Composable
fun HistoryScreen(
    onTripClick: (Int) -> Unit,
    viewModel: HistoryViewModel = viewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val filteredTrips = state.trips.filter { trip ->
        trip.fecha.contains(state.filter, ignoreCase = true) ||
            trip.destino.contains(state.filter, ignoreCase = true) ||
            trip.estado.contains(state.filter, ignoreCase = true)
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = "Historial de rutas",
                    style = MaterialTheme.typography.headlineSmall,
                )
                Text(
                    text = "Consulta los movimientos y entregas del almacén.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        item {
            OutlinedTextField(
                value = state.filter,
                onValueChange = viewModel::updateFilter,
                placeholder = { Text("Fecha, destino o estado") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                trailingIcon = {
                    if (state.filter.isNotEmpty()) {
                        IconButton(onClick = { viewModel.updateFilter("") }) {
                            Icon(Icons.Default.Clear, contentDescription = "Limpiar búsqueda")
                        }
                    }
                },
                singleLine = true,
                shape = RoundedCornerShape(14.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = MaterialTheme.colorScheme.surface,
                    unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                    unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant,
                ),
                modifier = Modifier.fillMaxWidth(),
            )
        }

        if (state.loading) {
            item {
                LoadingSkeleton(modifier = Modifier.fillMaxWidth(), rows = 3)
            }
        } else if (filteredTrips.isEmpty()) {
            item { EmptyHistoryState(hasFilter = state.filter.isNotBlank()) }
        } else {
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("MOVIMIENTOS", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Surface(
                        color = MaterialTheme.colorScheme.secondaryContainer,
                        shape = CircleShape,
                    ) {
                        Text(
                            text = filteredTrips.size.toString(),
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                            style = MaterialTheme.typography.labelMedium,
                        )
                    }
                }
            }
            items(filteredTrips, key = { it.id }) { trip ->
                TripCard(trip = trip, onClick = { onTripClick(trip.id) })
            }
        }
    }
}

@Composable
private fun TripCard(trip: Trip, onClick: () -> Unit) {
    ElevatedCard(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.elevatedCardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.elevatedCardElevation(defaultElevation = 1.dp, pressedElevation = 0.dp),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .background(MaterialTheme.colorScheme.primaryContainer, RoundedCornerShape(13.dp)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Default.Route, contentDescription = null, tint = MaterialTheme.colorScheme.onPrimaryContainer)
                }
                Spacer(Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text("Viaje #${trip.id}", style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(2.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.CalendarToday, contentDescription = null, modifier = Modifier.size(14.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.width(6.dp))
                        Text(trip.fecha, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                StatusChip(trip.estado)
                Spacer(Modifier.width(2.dp))
                Icon(Icons.Default.ChevronRight, contentDescription = "Ver detalle", tint = MaterialTheme.colorScheme.onSurfaceVariant)
            }

            HorizontalDivider(modifier = Modifier.padding(vertical = 14.dp), color = MaterialTheme.colorScheme.outlineVariant)
            TripInfoRow(Icons.Default.Inventory2, "Origen", trip.origen)
            Spacer(Modifier.height(10.dp))
            TripInfoRow(Icons.Default.LocationOn, "Destino", trip.destino)
        }
    }
}

@Composable
private fun TripInfoRow(icon: ImageVector, label: String, value: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, contentDescription = null, modifier = Modifier.size(18.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.width(10.dp))
        Text("$label:", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.width(6.dp))
        Text(value, style = MaterialTheme.typography.bodyMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

@Composable
private fun StatusChip(status: String) {
    val normalized = status.lowercase()
    val color: Color = when {
        "complet" in normalized || "entreg" in normalized -> EmeraldGreen
        "tránsito" in normalized || "transito" in normalized || "curso" in normalized -> InfoBlue
        "pendiente" in normalized || "espera" in normalized -> AmberWarning
        "cancel" in normalized || "error" in normalized -> RoseDanger
        else -> MaterialTheme.colorScheme.onSurfaceVariant
    }
    Surface(color = color.copy(alpha = .12f), contentColor = color, shape = RoundedCornerShape(8.dp)) {
        Text(
            text = status,
            modifier = Modifier.padding(horizontal = 9.dp, vertical = 5.dp),
            style = MaterialTheme.typography.labelSmall,
            maxLines = 1,
        )
    }
}

@Composable
private fun EmptyHistoryState(hasFilter: Boolean) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 64.dp, horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Surface(shape = CircleShape, color = MaterialTheme.colorScheme.secondaryContainer) {
            Icon(
                Icons.Default.History,
                contentDescription = null,
                modifier = Modifier.padding(18.dp).size(32.dp),
                tint = MaterialTheme.colorScheme.onSecondaryContainer,
            )
        }
        Spacer(Modifier.height(16.dp))
        Text(if (hasFilter) "Sin coincidencias" else "Aún no hay viajes", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(6.dp))
        Text(
            if (hasFilter) "Prueba con otro destino, fecha o estado." else "Los movimientos del almacén aparecerán aquí.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

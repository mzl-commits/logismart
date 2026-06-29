package com.tecsup.logismart_movil.ui.shelves

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.tecsup.logismart_movil.domain.model.Shelf
import com.tecsup.logismart_movil.domain.model.Slot

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ShelvesScreen(
    viewModel: ShelvesViewModel = hiltViewModel(),
    onBack: () -> Unit = {},
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Estantería de Almacén", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Atrás")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.loadShelves() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Actualizar")
                    }
                }
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when {
                uiState.isLoading -> {
                    CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                }
                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp),
                        contentPadding = PaddingValues(vertical = 16.dp)
                    ) {
                        item {
                            Column {
                                Text(
                                    text = "Vista de estantes",
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold
                                )
                                Spacer(Modifier.height(4.dp))
                                Text(
                                    text = "Resumen de capacidad, ocupación actual y cajas asignadas. Toca una tarjeta para ver su distribución física.",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                if (uiState.errorMessage != null) {
                                    Spacer(Modifier.height(8.dp))
                                    Text(
                                        text = uiState.errorMessage!!,
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.error
                                    )
                                }
                            }
                        }

                        if (uiState.shelves.isEmpty() && uiState.errorMessage == null) {
                            item {
                                Box(
                                    modifier = Modifier.fillMaxWidth().padding(32.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        "No hay estantes registrados.",
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }

                        items(uiState.shelves) { shelf ->
                            ShelfCard(shelf = shelf)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ShelfCard(
    shelf: Shelf,
    modifier: Modifier = Modifier
) {
    var isExpanded by remember { mutableStateOf(false) }
    val progress = (shelf.occupationPercentage / 100f).coerceIn(0f, 1f)
    val progressColor = getOccupationColor(shelf.status)
    val backgroundColor = getOccupationBackgroundColor(shelf.status)

    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable { isExpanded = !isExpanded },
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = backgroundColor),
        elevation = CardDefaults.cardElevation(defaultElevation = 5.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = shelf.name,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Cajas asignadas: ${shelf.assignedBoxes}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = shelf.tipoEstante,
                        style = MaterialTheme.typography.labelSmall,
                        color = progressColor.copy(alpha = 0.8f),
                        fontWeight = FontWeight.SemiBold
                    )
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OccupationBadge(status = shelf.status, color = progressColor)
                    Icon(
                        imageVector = if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                        contentDescription = "Expandir/Colapsar",
                        tint = progressColor
                    )
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(text = "Capacidad", style = MaterialTheme.typography.bodyMedium)
                Text(
                    text = "${shelf.currentOccupation}/${shelf.capacity}",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold
                )
            }

            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier.fillMaxWidth().height(10.dp),
                color = progressColor,
                trackColor = MaterialTheme.colorScheme.surfaceVariant
            )

            Text(
                text = "Ocupación: ${shelf.occupationPercentage.toInt()}%",
                style = MaterialTheme.typography.bodySmall,
                color = progressColor,
                fontWeight = FontWeight.Bold
            )

            AnimatedVisibility(visible = isExpanded) {
                Spacer(modifier = Modifier.height(6.dp))
                ShelfGrid(slots = shelf.slots)
            }
        }
    }
}

@Composable
fun ShelfGrid(slots: List<Slot>) {
    val slotsByLevel = slots.groupBy { it.nivel }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color(0xFF0F172A), shape = RoundedCornerShape(12.dp))
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text(
            text = "Estructura Física (Adelante y Posterior)",
            style = MaterialTheme.typography.labelMedium,
            color = Color(0xFF38BDF8),
            fontWeight = FontWeight.Bold
        )

        for (nivel in listOf(3, 2, 1)) {
            val nivelSlots = slotsByLevel[nivel] ?: emptyList()

            val c1 = nivelSlots.find { it.lado == "adelante" && it.casillero == 1 }
            val c2 = nivelSlots.find { it.lado == "adelante" && it.casillero == 2 }
            val c3 = nivelSlots.find { it.lado == "posterior" && it.casillero == 1 }
            val c4 = nivelSlots.find { it.lado == "posterior" && it.casillero == 2 }

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFF1E293B), shape = RoundedCornerShape(8.dp))
                    .padding(8.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Text(
                    text = "Nivel $nivel",
                    style = MaterialTheme.typography.labelSmall,
                    color = Color.LightGray,
                    fontWeight = FontWeight.SemiBold
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    SlotCell(slot = c1, label = "Caja 1 (Adelante)", modifier = Modifier.weight(1f))
                    SlotCell(slot = c2, label = "Caja 2 (Adelante)", modifier = Modifier.weight(1f))
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    SlotCell(slot = c3, label = "Caja 3 (Atrás)", modifier = Modifier.weight(1f))
                    SlotCell(slot = c4, label = "Caja 4 (Atrás)", modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
fun SlotCell(slot: Slot?, label: String, modifier: Modifier = Modifier) {
    if (slot == null) {
        Box(modifier = modifier.height(38.dp))
        return
    }

    val isOcupado = slot.estadoOcupacion
    val bgColor = if (isOcupado) Color(0xFF1E293B) else Color(0xFF065F46)
    val borderColor = if (isOcupado) Color(0xFF475569) else Color(0xFF10B981)
    val textColor = if (isOcupado) Color(0xFF94A3B8) else Color(0xFFA7F3D0)

    Box(
        modifier = modifier
            .height(38.dp)
            .background(bgColor, shape = RoundedCornerShape(6.dp))
            .border(1.dp, borderColor, shape = RoundedCornerShape(6.dp))
            .padding(horizontal = 8.dp),
        contentAlignment = Alignment.Center
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(
                text = label,
                color = textColor,
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Bold
            )
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .background(
                        color = if (isOcupado) Color(0xFFEF4444) else Color(0xFF10B981),
                        shape = RoundedCornerShape(50)
                    )
            )
        }
    }
}

@Composable
fun OccupationBadge(status: String, color: Color) {
    Box(
        modifier = Modifier
            .background(color = color.copy(alpha = 0.15f), shape = RoundedCornerShape(50))
            .padding(horizontal = 12.dp, vertical = 6.dp)
    ) {
        Text(
            text = status,
            color = color,
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.Bold
        )
    }
}

fun getOccupationColor(status: String): Color = when (status) {
    "Lleno"      -> Color(0xFFC62828)
    "Ocupado"    -> Color(0xFFF57C00)
    "Parcial"    -> Color(0xFF1565C0)
    else         -> Color(0xFF2E7D32)   // Disponible
}

fun getOccupationBackgroundColor(status: String): Color = when (status) {
    "Lleno"      -> Color(0xFFFFEBEE)
    "Ocupado"    -> Color(0xFFFFF3E0)
    "Parcial"    -> Color(0xFFE3F2FD)
    else         -> Color(0xFFE8F5E9)   // Disponible
}


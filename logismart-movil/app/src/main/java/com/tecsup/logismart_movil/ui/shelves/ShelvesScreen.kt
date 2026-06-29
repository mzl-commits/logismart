package com.tecsup.logismart_movil.ui.shelves

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.tecsup.logismart_movil.domain.model.Shelf
import com.tecsup.logismart_movil.domain.model.Slot
import com.tecsup.logismart_movil.ui.components.LoadingSkeleton

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ShelvesScreen(
    viewModel: ShelvesViewModel = hiltViewModel(),
    onBack: () -> Unit = {},
    showBack: Boolean = true,
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Estantería de Almacén", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    if (showBack) {
                        IconButton(onClick = onBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Atrás")
                        }
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.loadShelves() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Actualizar")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    scrolledContainerColor = MaterialTheme.colorScheme.surface
                )
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
                    LoadingSkeleton(
                        modifier = Modifier.fillMaxWidth().padding(16.dp),
                        rows = 3
                    )
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

                        item {
                            val totalCapacity = uiState.shelves.sumOf { it.capacity }
                            val occupied = uiState.shelves.sumOf { it.currentOccupation }
                            Surface(
                                color = MaterialTheme.colorScheme.primaryContainer,
                                shape = RoundedCornerShape(16.dp)
                            ) {
                                Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Inventory2, null, Modifier.size(28.dp), tint = MaterialTheme.colorScheme.primary)
                                    Spacer(Modifier.width(12.dp))
                                    Column(Modifier.weight(1f)) {
                                        Text("Estado del almacén", fontWeight = FontWeight.Bold)
                                        Text("${uiState.shelves.size} estantes disponibles", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    Column(horizontalAlignment = Alignment.End) {
                                        Text("$occupied/$totalCapacity", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                        Text("ocupadas", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
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
    val chevronRotation by animateFloatAsState(
        targetValue = if (isExpanded) 180f else 0f,
        animationSpec = tween(260),
        label = "shelfChevron"
    )
    val statusIcon = when (shelf.status) {
        "Lleno" -> Icons.Default.WarningAmber
        "Ocupado", "Parcial" -> Icons.Default.Inventory2
        else -> Icons.Default.CheckCircle
    }

    Card(
        modifier = modifier
            .fillMaxWidth()
            .animateContentSize()
            .clickable { isExpanded = !isExpanded },
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, progressColor.copy(alpha = .28f))
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
                Surface(
                    color = progressColor.copy(alpha = .12f),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(statusIcon, null, Modifier.padding(10.dp).size(22.dp), tint = progressColor)
                }
                Spacer(Modifier.width(12.dp))
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
                        imageVector = Icons.Default.ExpandMore,
                        contentDescription = "Expandir/Colapsar",
                        tint = progressColor,
                        modifier = Modifier.rotate(chevronRotation)
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
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = .45f), RoundedCornerShape(16.dp))
            .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(16.dp))
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Surface(color = MaterialTheme.colorScheme.primaryContainer, shape = RoundedCornerShape(10.dp)) {
                Icon(
                    Icons.Default.GridView,
                    contentDescription = null,
                    modifier = Modifier.padding(8.dp).size(18.dp),
                    tint = MaterialTheme.colorScheme.onPrimaryContainer
                )
            }
            Spacer(Modifier.width(10.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text("Estructura física", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                Text("Vista frontal y posterior", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            GridLegend(color = Color(0xFF10B981), label = "Disponible")
            GridLegend(color = MaterialTheme.colorScheme.error, label = "Ocupado")
        }

        for (nivel in listOf(3, 2, 1)) {
            val nivelSlots = slotsByLevel[nivel] ?: emptyList()

            val c1 = nivelSlots.find { it.lado == "adelante" && it.casillero == 1 }
            val c2 = nivelSlots.find { it.lado == "adelante" && it.casillero == 2 }
            val c3 = nivelSlots.find { it.lado == "posterior" && it.casillero == 1 }
            val c4 = nivelSlots.find { it.lado == "posterior" && it.casillero == 2 }

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(12.dp))
                    .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(12.dp))
                    .padding(10.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = "Nivel $nivel",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
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
private fun GridLegend(color: Color, label: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(8.dp).background(color, CircleShape))
        Spacer(Modifier.width(6.dp))
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
fun SlotCell(slot: Slot?, label: String, modifier: Modifier = Modifier) {
    if (slot == null) {
        Box(
            modifier = modifier
                .height(44.dp)
                .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = .35f), RoundedCornerShape(10.dp))
        )
        return
    }

    val isOcupado = slot.estadoOcupacion
    val availableColor = Color(0xFF059669)
    val bgColor = if (isOcupado) MaterialTheme.colorScheme.errorContainer.copy(alpha = .42f) else availableColor.copy(alpha = .10f)
    val borderColor = if (isOcupado) MaterialTheme.colorScheme.error.copy(alpha = .30f) else availableColor.copy(alpha = .45f)
    val textColor = if (isOcupado) MaterialTheme.colorScheme.onSurfaceVariant else Color(0xFF047857)

    Box(
        modifier = modifier
            .height(44.dp)
            .background(bgColor, shape = RoundedCornerShape(10.dp))
            .border(1.dp, borderColor, shape = RoundedCornerShape(10.dp))
            .padding(horizontal = 10.dp),
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
                fontWeight = FontWeight.SemiBold,
                maxLines = 1
            )
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .background(
                        color = if (isOcupado) MaterialTheme.colorScheme.error else availableColor,
                        shape = CircleShape
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


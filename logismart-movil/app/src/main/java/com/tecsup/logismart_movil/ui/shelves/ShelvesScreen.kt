package com.tecsup.logismart_movil.ui.shelves

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
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
                                    text = "Resumen de capacidad, ocupación actual y cajas asignadas",
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
    val progress = (shelf.occupationPercentage / 100f).coerceIn(0f, 1f)
    val progressColor = getOccupationColor(shelf.status)
    val backgroundColor = getOccupationBackgroundColor(shelf.status)

    Card(
        modifier = modifier.fillMaxWidth(),
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

                OccupationBadge(status = shelf.status, color = progressColor)
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


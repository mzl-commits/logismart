package com.tecsup.logismart_movil.ui.boxes

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.tecsup.logismart_movil.data.model.LogisticBox

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BoxesScreen(
    viewModel: BoxesViewModel = viewModel()
) {
    val state by viewModel.uiState.collectAsState()
    
    val statesList = listOf("Todas", "Pendiente", "En tránsito", "Almacenada")
    val categoriesList = listOf("Todas cat.", "Alimento", "Electrónica", "Herramienta", "Otro", "Químico", "Textil")

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F172A))
            .padding(16.dp)
    ) {
        Text(
            text = "Cajas activas",
            style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold),
            color = Color.White
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Estado Filtros
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            statesList.forEach { status ->
                val selected = state.selectedStatus == status
                FilterChip(
                    selected = selected,
                    onClick = { viewModel.selectStatus(status) },
                    label = { Text(status) },
                    colors = FilterChipDefaults.filterChipColors(
                        containerColor = Color(0xFF1E293B),
                        labelColor = Color(0xFF94A3B8),
                        selectedContainerColor = MaterialTheme.colorScheme.primary,
                        selectedLabelColor = Color.White
                    )
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Categoria Filtros
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            categoriesList.forEach { category ->
                val selected = state.selectedCategory == category
                FilterChip(
                    selected = selected,
                    onClick = { viewModel.selectCategory(category) },
                    label = { Text(category) },
                    colors = FilterChipDefaults.filterChipColors(
                        containerColor = Color(0xFF1E293B),
                        labelColor = Color(0xFF94A3B8),
                        selectedContainerColor = MaterialTheme.colorScheme.secondary,
                        selectedLabelColor = Color.White
                    )
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (state.loading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
            }
        } else {
            if (state.filteredBoxes.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("No se encontraron cajas con estos filtros.", color = Color(0xFF94A3B8))
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    contentPadding = PaddingValues(bottom = 16.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(state.filteredBoxes, key = { it.id }) { box ->
                        BoxCard(box = box)
                    }
                }
            }
        }
    }
}

@Composable
private fun BoxCard(
    box: LogisticBox
) {
    val statusColor = when (box.estado.lowercase().replace(" ", "_")) {
        "pendiente" -> Color(0xFFEF4444) // Rojo
        "en_transito", "en_tránsito" -> Color(0xFFF59E0B) // Ámbar/Naranja
        "almacenada" -> Color(0xFF10B981) // Verde
        else -> Color(0xFF64748B)
    }

    val categoryEmoji = when (box.categoria.lowercase()) {
        "alimento" -> "🍎"
        "electronica", "electrónica" -> "💻"
        "herramienta" -> "🔧"
        "otro" -> "📦"
        "quimico", "químico" -> "🧪"
        "textil" -> "👕"
        else -> "📦"
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFF1E293B)
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = box.id,
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                    color = Color.White
                )
                
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = statusColor.copy(alpha = 0.15f),
                    contentColor = statusColor
                ) {
                    Text(
                        text = box.estado.uppercase().replace("_", " "),
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Bold)
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Text(
                text = "$categoryEmoji Producto: ${box.producto}",
                color = Color(0xFFE2E8F0),
                style = MaterialTheme.typography.bodyMedium
            )

            Spacer(modifier = Modifier.height(4.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    text = "Peso: ${box.pesoKg} kg",
                    color = Color(0xFF94A3B8),
                    style = MaterialTheme.typography.bodySmall
                )
                Text(
                    text = "Cant: ${box.cantidad}",
                    color = Color(0xFF94A3B8),
                    style = MaterialTheme.typography.bodySmall
                )
                Text(
                    text = "Cat: ${box.categoria}",
                    color = Color(0xFF94A3B8),
                    style = MaterialTheme.typography.bodySmall
                )
            }

            if (box.ubicacion.isNotBlank() && box.ubicacion != "Sin ubicación") {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "📍 Ubicación: ${box.ubicacion}",
                    color = Color(0xFF38BDF8),
                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium)
                )
            }

            if (box.carroAsignado.isNotBlank() && box.carroAsignado != "Sin asignar") {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "🤖 Carro: ${box.carroAsignado}",
                    color = Color(0xFFA78BFA),
                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium)
                )
            }

            if (box.esFragil) {
                Spacer(modifier = Modifier.height(10.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Warning,
                        contentDescription = "Frágil",
                        tint = Color(0xFFF59E0B),
                        modifier = Modifier.size(16.dp)
                    )
                    Text(
                        text = "CUIDADO: PRODUCTO FRÁGIL",
                        color = Color(0xFFF59E0B),
                        style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Bold)
                    )
                }
            }
        }
    }
}
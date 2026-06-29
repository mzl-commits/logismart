package com.tecsup.logismart_movil.ui.boxes

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
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
    val context = LocalContext.current
    val state by viewModel.uiState.collectAsState()
    
    var dispatchBoxId by remember { mutableStateOf<String?>(null) }
    
    val statesList = listOf("Todas", "Pendiente", "En tránsito", "Almacenada")
    val categoriesList = listOf("Todas cat.", "Alimento", "Electrónica", "Herramienta", "Otro", "Químico", "Textil")

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(horizontal = 16.dp)
    ) {
        Spacer(modifier = Modifier.height(16.dp))

        // Contenedor unificado de Filtros
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f)
            ),
            shape = RoundedCornerShape(16.dp),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.25f))
        ) {
            Column(
                modifier = Modifier.padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Filtro Estado
                Column {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Tune,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Text(
                            text = "Estado de la caja",
                            style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold),
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        statesList.forEach { status ->
                            val selected = state.selectedStatus == status
                            LogismartFilterChip(
                                selected = selected,
                                label = status,
                                onClick = { viewModel.selectStatus(status) }
                            )
                        }
                    }
                }

                Divider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))

                // Filtro Categoría
                Column {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Category,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Text(
                            text = "Categoría del producto",
                            style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold),
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        categoriesList.forEach { category ->
                            val selected = state.selectedCategory == category
                            LogismartFilterChip(
                                selected = selected,
                                label = category,
                                onClick = { viewModel.selectCategory(category) }
                            )
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (state.loading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            if (state.filteredBoxes.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(
                        text = "No se encontraron cajas con estos filtros.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    contentPadding = PaddingValues(bottom = 16.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(state.filteredBoxes, key = { it.id }) { box ->
                        BoxCard(
                            box = box,
                            onProcesar = {
                                viewModel.procesarBox(
                                    boxId = box.id,
                                    onSuccess = { Toast.makeText(context, "Caja ${box.id} procesada ✓", Toast.LENGTH_SHORT).show() },
                                    onError = { err -> Toast.makeText(context, err, Toast.LENGTH_LONG).show() }
                                )
                            },
                            onAlmacenar = {
                                viewModel.confirmarAlmacenada(
                                    boxId = box.id,
                                    onSuccess = { Toast.makeText(context, "Caja ${box.id} almacenada ✓", Toast.LENGTH_SHORT).show() },
                                    onError = { err -> Toast.makeText(context, err, Toast.LENGTH_LONG).show() }
                                )
                            },
                            onDespachar = {
                                dispatchBoxId = box.id
                            }
                        )
                    }
                }
            }
        }
    }

    // Modal de Confirmación de Despacho
    if (dispatchBoxId != null) {
        val boxId = dispatchBoxId!!
        var selectedPlaca by remember { mutableStateOf("") }
        var selectedDestino by remember { mutableStateOf("") }
        
        val placas = state.vehiculos.map { it.placa }
        val destinos = state.destinos.map { it.nombre }

        AlertDialog(
            onDismissRequest = { dispatchBoxId = null },
            title = { Text("Despachar Caja $boxId", fontWeight = FontWeight.Bold) },
            text = {
                Column(
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "Seleccione el transporte y el destino para autorizar la salida de la caja del almacén.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    
                    DropdownSelector(
                        label = "Placa del Transporte",
                        options = placas,
                        selectedOption = selectedPlaca,
                        onOptionSelected = { selectedPlaca = it }
                    )

                    DropdownSelector(
                        label = "Destino Final",
                        options = destinos,
                        selectedOption = selectedDestino,
                        onOptionSelected = { selectedDestino = it }
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.confirmarDespacho(
                            boxId = boxId,
                            placa = selectedPlaca,
                            destino = selectedDestino,
                            onSuccess = {
                                Toast.makeText(context, "Caja $boxId despachada ✓", Toast.LENGTH_SHORT).show()
                                dispatchBoxId = null
                            },
                            onError = { err ->
                                Toast.makeText(context, err, Toast.LENGTH_LONG).show()
                            }
                        )
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981))
                ) {
                    Text("Confirmar Salida", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { dispatchBoxId = null }) {
                    Text("Cancelar")
                }
            }
        )
    }
}

@Composable
fun LogismartFilterChip(
    selected: Boolean,
    label: String,
    onClick: () -> Unit
) {
    val containerColor = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
    val contentColor = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant
    val borderStroke = if (selected) null else BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))

    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(10.dp),
        color = containerColor,
        contentColor = contentColor,
        border = borderStroke,
        modifier = Modifier.padding(end = 4.dp),
        tonalElevation = if (selected) 2.dp else 0.dp
    ) {
        Box(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.bodyMedium.copy(fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal),
                textAlign = TextAlign.Center
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DropdownSelector(
    label: String,
    options: List<String>,
    selectedOption: String,
    onOptionSelected: (String) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { expanded = it }
    ) {
        OutlinedTextField(
            value = selectedOption,
            onValueChange = {},
            readOnly = true,
            label = { Text(label) },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            modifier = Modifier.menuAnchor().fillMaxWidth(),
            colors = ExposedDropdownMenuDefaults.outlinedTextFieldColors()
        )
        ExposedDropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false }
        ) {
            if (options.isEmpty()) {
                DropdownMenuItem(
                    text = { Text("No hay opciones disponibles") },
                    onClick = {}
                )
            } else {
                options.forEach { option ->
                    DropdownMenuItem(
                        text = { Text(option) },
                        onClick = {
                            onOptionSelected(option)
                            expanded = false
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun BoxCard(
    box: LogisticBox,
    onProcesar: () -> Unit,
    onAlmacenar: () -> Unit,
    onDespachar: () -> Unit
) {
    val isDark = isSystemInDarkTheme()
    
    val (statusBg, statusFg) = when (box.estado.lowercase().replace(" ", "_")) {
        "pendiente" -> Pair(
            MaterialTheme.colorScheme.errorContainer,
            MaterialTheme.colorScheme.onErrorContainer
        )
        "en_transito", "en_tránsito" -> Pair(
            if (isDark) Color(0xFF78350F) else Color(0xFFFEF3C7),
            if (isDark) Color(0xFFFDE68A) else Color(0xFF92400E)
        )
        "almacenada" -> Pair(
            if (isDark) Color(0xFF064E3B) else Color(0xFFD1FAE5),
            if (isDark) Color(0xFF6EE7B7) else Color(0xFF065F46)
        )
        else -> Pair(
            MaterialTheme.colorScheme.surfaceVariant,
            MaterialTheme.colorScheme.onSurfaceVariant
        )
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
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        border = BorderStroke(
            1.dp, 
            MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)
        )
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
                    color = MaterialTheme.colorScheme.onSurface
                )
                
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = statusBg,
                    contentColor = statusFg
                ) {
                    Text(
                        text = box.estado.uppercase().replace("_", " "),
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold)
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Text(
                text = "$categoryEmoji Producto: ${box.producto}",
                color = MaterialTheme.colorScheme.onSurface,
                style = MaterialTheme.typography.bodyMedium
            )

            Spacer(modifier = Modifier.height(6.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    text = "Peso: ${box.pesoKg} kg",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
                Text(
                    text = "Cant: ${box.cantidad}",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
                Text(
                    text = "Cat: ${box.categoria}",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
            }

            if (box.ubicacion.isNotBlank() && box.ubicacion != "Sin ubicación") {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "📍 Ubicación: ${box.ubicacion}",
                    color = MaterialTheme.colorScheme.primary,
                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium)
                )
            }

            if (box.carroAsignado.isNotBlank() && box.carroAsignado != "Sin asignar") {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "🤖 Carro: ${box.carroAsignado}",
                    color = MaterialTheme.colorScheme.secondary,
                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium)
                )
            }

            if (box.esFragil) {
                Spacer(modifier = Modifier.height(10.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Warning,
                        contentDescription = "Frágil",
                        tint = MaterialTheme.colorScheme.error,
                        modifier = Modifier.size(16.dp)
                    )
                    Text(
                        text = "CUIDADO: PRODUCTO FRÁGIL",
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Bold)
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))
            Divider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f))
            Spacer(modifier = Modifier.height(10.dp))

            when (box.estado.lowercase().replace(" ", "_")) {
                "pendiente" -> {
                    Button(
                        onClick = onProcesar,
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B)),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.PlayArrow, contentDescription = null, tint = Color.White)
                            Text("Clasificar y Enviar", color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                }
                "en_transito", "en_tránsito" -> {
                    Button(
                        onClick = onAlmacenar,
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Check, contentDescription = null, tint = Color.White)
                            Text("Confirmar Almacenada", color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                }
                "almacenada" -> {
                    Button(
                        onClick = onDespachar,
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.LocalShipping, contentDescription = null, tint = Color.White)
                            Text("Autorizar Despacho", color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}
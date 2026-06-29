package com.tecsup.logismart_movil.ui.boxes

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.luminance
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.animateColorAsState
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.tecsup.logismart_movil.data.model.LogisticBox
import com.tecsup.logismart_movil.ui.components.LoadingSkeleton
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BoxesScreen(
    viewModel: BoxesViewModel = viewModel(),
    onBoxClick: (String) -> Unit = {},
) {
    val state by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    
    var dispatchBoxId by remember { mutableStateOf<String?>(null) }
    var showFilters by remember { mutableStateOf(false) }
    
    val statesList = listOf("Todas", "Pendiente", "En tránsito", "Almacenada")
    val categoriesList = listOf("Todas cat.", "Alimento", "Electrónica", "Herramienta", "Otro", "Químico", "Textil")

    Box(modifier = Modifier.fillMaxSize()) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(horizontal = 16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text("${state.filteredBoxes.size} cajas", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text(
                    if (state.selectedStatus == "Todas" && state.selectedCategory == "Todas cat.") "Mostrando todo el inventario" else "Filtros aplicados",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            FilledTonalButton(onClick = { showFilters = true }, shape = RoundedCornerShape(12.dp)) {
                Icon(Icons.Default.FilterAlt, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(7.dp))
                Text("Filtrar")
            }
        }

        if (state.loading) {
            LoadingSkeleton(modifier = Modifier.fillMaxWidth(), rows = 3)
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
                            onOpen = { onBoxClick(box.id) },
                            onProcesar = {
                                viewModel.procesarBox(
                                    boxId = box.id,
                                    onSuccess = { scope.launch { snackbarHostState.showSnackbar("Caja ${box.id} procesada correctamente") } },
                                    onError = { err -> scope.launch { snackbarHostState.showSnackbar(err) } }
                                )
                            },
                            onAlmacenar = {
                                viewModel.confirmarAlmacenada(
                                    boxId = box.id,
                                    onSuccess = { scope.launch { snackbarHostState.showSnackbar("Caja ${box.id} almacenada correctamente") } },
                                    onError = { err -> scope.launch { snackbarHostState.showSnackbar(err) } }
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

    if (showFilters) {
        ModalBottomSheet(onDismissRequest = { showFilters = false }) {
            Column(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 28.dp),
                verticalArrangement = Arrangement.spacedBy(18.dp)
            ) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column { Text("Filtrar cajas", style = MaterialTheme.typography.titleLarge); Text("Refina el inventario visible", color = MaterialTheme.colorScheme.onSurfaceVariant) }
                    TextButton(onClick = { viewModel.selectStatus("Todas"); viewModel.selectCategory("Todas cat.") }) { Text("Limpiar") }
                }
                FilterSection("Estado", Icons.Default.Tune, statesList, state.selectedStatus, viewModel::selectStatus)
                FilterSection("Categoría", Icons.Default.Category, categoriesList, state.selectedCategory, viewModel::selectCategory)
                Button(onClick = { showFilters = false }, modifier = Modifier.fillMaxWidth().height(50.dp), shape = RoundedCornerShape(14.dp)) {
                    Text("Ver ${state.filteredBoxes.size} cajas")
                }
            }
        }
    }
        SnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier.align(Alignment.BottomCenter).padding(16.dp)
        )
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
                                scope.launch { snackbarHostState.showSnackbar("Caja $boxId despachada correctamente") }
                                dispatchBoxId = null
                            },
                            onError = { err ->
                                scope.launch { snackbarHostState.showSnackbar(err) }
                            }
                        )
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                    shape = RoundedCornerShape(14.dp),
                    contentPadding = PaddingValues(horizontal = 18.dp, vertical = 13.dp)
                ) {
                    Icon(Icons.Default.LocalShipping, contentDescription = null)
                    Spacer(Modifier.width(8.dp))
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
    onOpen: () -> Unit,
    onProcesar: () -> Unit,
    onAlmacenar: () -> Unit,
    onDespachar: () -> Unit
) {
    val isDark = MaterialTheme.colorScheme.background.luminance() < .5f
    
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
    val animatedStatusBg by animateColorAsState(statusBg, label = "boxStatusBackground")
    val animatedStatusFg by animateColorAsState(statusFg, label = "boxStatusContent")

    val categoryIcon = when (box.categoria.lowercase()) {
        "alimento" -> Icons.Default.Restaurant
        "electronica", "electrónica" -> Icons.Default.Devices
        "herramienta" -> Icons.Default.Build
        "quimico", "químico" -> Icons.Default.Science
        "textil" -> Icons.Default.Checkroom
        else -> Icons.Default.Inventory2
    }

    Card(
        modifier = Modifier.fillMaxWidth().animateContentSize().clickable(onClick = onOpen),
            shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
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
                    color = animatedStatusBg,
                    contentColor = animatedStatusFg
                ) {
                    Text(
                        text = box.estado.uppercase().replace("_", " "),
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold)
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(categoryIcon, contentDescription = null, modifier = Modifier.size(18.dp), tint = MaterialTheme.colorScheme.primary)
                Text("Producto: ${box.producto}", color = MaterialTheme.colorScheme.onSurface, style = MaterialTheme.typography.bodyMedium)
            }

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
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.LocationOn, null, Modifier.size(18.dp), tint = MaterialTheme.colorScheme.primary)
                    Text("Ubicación: ${box.ubicacion}", color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium))
                }
            }

            if (box.carroAsignado.isNotBlank() && box.carroAsignado != "Sin asignar") {
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.SmartToy, null, Modifier.size(18.dp), tint = MaterialTheme.colorScheme.secondary)
                    Text("Carro: ${box.carroAsignado}", color = MaterialTheme.colorScheme.secondary, style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium))
                }
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
                        shape = RoundedCornerShape(14.dp)
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
                        shape = RoundedCornerShape(14.dp)
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
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.LocalShipping, contentDescription = null)
                            Text("Autorizar Despacho", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

@Composable
@OptIn(ExperimentalLayoutApi::class)
private fun FilterSection(title: String, icon: ImageVector, options: List<String>, selected: String, onSelect: (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(9.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, null, Modifier.size(18.dp), tint = MaterialTheme.colorScheme.primary)
            Spacer(Modifier.width(8.dp)); Text(title, style = MaterialTheme.typography.titleSmall)
        }
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            options.forEach { option -> FilterChip(selected = selected == option, onClick = { onSelect(option) }, label = { Text(option) }) }
        }
    }
}

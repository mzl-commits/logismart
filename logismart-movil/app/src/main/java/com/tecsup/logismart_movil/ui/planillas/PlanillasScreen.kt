package com.tecsup.logismart_movil.ui.planillas

import androidx.compose.material.icons.filled.Visibility
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items as gridItems
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Assignment
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.tecsup.logismart_movil.data.remote.BoxDto
import com.tecsup.logismart_movil.data.remote.PlanillaDto
import com.tecsup.logismart_movil.ui.components.LoadingSkeleton
import com.tecsup.logismart_movil.ui.components.IllustratedEmptyState
import com.tecsup.logismart_movil.ui.components.LogiSmartTopAppBar

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PlanillasScreen(
    state: PlanillasUiState,
    onRefresh: () -> Unit,
    onBack: () -> Unit,
    onViewPdf: (cajas: String, userId: Int) -> Unit = { _, _ -> },
    onComplete: (Int) -> Unit = {},
) {

    Scaffold(
        topBar = {
            LogiSmartTopAppBar(
                title = "Mis planillas de trabajo",
                onBack = onBack,
                actions = {
                    IconButton(onClick = onRefresh, enabled = !state.isRefreshing) {
                        Icon(
                            Icons.Default.Refresh,
                            contentDescription = "Actualizar",
                            tint = MaterialTheme.colorScheme.onSurface
                        )
                    }
                }
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(paddingValues)
        ) {
            when {
                state.isLoading -> {
                    LoadingSkeleton(
                        modifier = Modifier.fillMaxWidth().padding(16.dp),
                        rows = 3
                    )
                }
                state.errorMessage != null -> {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp)
                            .align(Alignment.Center),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = state.errorMessage,
                            color = MaterialTheme.colorScheme.error,
                            textAlign = TextAlign.Center,
                            style = MaterialTheme.typography.bodyLarge
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(onClick = onRefresh) {
                            Text("Reintentar")
                        }
                    }
                }
                state.planillas.isEmpty() -> {
                    IllustratedEmptyState(
                        title = "No tienes planillas asignadas",
                        description = "Las nuevas tareas de trabajo aparecerán aquí cuando sean asignadas.",
                        icon = Icons.AutoMirrored.Filled.Assignment,
                        modifier = Modifier
                            .fillMaxWidth()
                            .align(Alignment.Center),
                    )
                }
                else -> {
                    LazyVerticalGrid(
                        columns = GridCells.Adaptive(minSize = 360.dp),
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        gridItems(state.planillas, key = { it.idPlanilla }) { planilla ->
                            PlanillaItem(
                                planilla = planilla,
                                completing = state.completingId == planilla.idPlanilla,
                                onComplete = { onComplete(planilla.idPlanilla) },
                                onViewPdf = { cajas, userId ->
                                    onViewPdf(cajas, userId)
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun PlanillaItem(
    planilla: PlanillaDto,
    completing: Boolean,
    onComplete: () -> Unit,
    onViewPdf: (cajas: String, userId: Int) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    val haptics = LocalHapticFeedback.current

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .animateContentSize()
            .clickable { expanded = !expanded },
        shape = RoundedCornerShape(18.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = CardDefaults.outlinedCardBorder()
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Planilla #${planilla.idPlanilla}",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Fecha: ${planilla.fechaCreacion}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = "Operador: ${planilla.operadorNombre}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Badge(
                        containerColor = MaterialTheme.colorScheme.secondary.copy(alpha = 0.12f),
                        contentColor = MaterialTheme.colorScheme.secondary
                    ) {
                        Text(
                            text = "${planilla.totalCajas} cajas",
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Icon(
                        imageVector = if (expanded) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                        contentDescription = if (expanded) "Colapsar" else "Expandir",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Spacer(Modifier.height(10.dp))
            Surface(
                color = if (planilla.completada) Color(0xFF10B981).copy(alpha = .13f) else Color(0xFFF59E0B).copy(alpha = .13f),
                contentColor = if (planilla.completada) Color(0xFF059669) else Color(0xFFD97706),
                shape = RoundedCornerShape(9.dp)
            ) {
                Text(
                    if (planilla.completada) "Completada${planilla.fechaCompletada?.let { " · $it" } ?: ""}" else "Pendiente de completar",
                    Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                    style = MaterialTheme.typography.labelMedium
                )
            }

            AnimatedVisibility(visible = expanded) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 16.dp)
                ) {
                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                    Spacer(modifier = Modifier.height(12.dp))

                    Text(
                        text = "Lista de Cajas:",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    planilla.cajas.forEach { caja ->
                        BoxDetailRow(caja = caja)
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    if (planilla.puedeCompletar) {
                        Button(
                            onClick = {
                                haptics.performHapticFeedback(HapticFeedbackType.LongPress)
                                onComplete()
                            },
                            enabled = !completing,
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF059669)),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            if (completing) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp, color = Color.White)
                            else Text("Marcar como completada", fontWeight = FontWeight.Bold, color = Color.White)
                        }
                        Spacer(Modifier.height(10.dp))
                    }

                    Button(
                        onClick = {
                            val cajas = planilla.cajas.joinToString(",") { it.id }
                            onViewPdf(cajas, planilla.operadorId)
                        },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.primary
                        )
                    ) {
                        Icon(
                            imageVector = Icons.Default.Visibility,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Previsualizar Guía", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
fun BoxDetailRow(caja: BoxDto) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
        ),
        shape = RoundedCornerShape(8.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = caja.id,
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.bodyMedium
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = caja.producto,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "Estante: ${caja.ubicacion}",
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = caja.estado,
                    style = MaterialTheme.typography.bodySmall,
                    color = when (caja.estado.lowercase()) {
                        "pendiente" -> Color(0xFFE5A93B)
                        "en tránsito" -> Color(0xFF3393DF)
                        "almacenada" -> Color(0xFF4CAF50)
                        else -> MaterialTheme.colorScheme.onSurfaceVariant
                    },
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

package com.tecsup.logismart_movil.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tecsup.logismart_movil.data.model.CoordenadaDto
import com.tecsup.logismart_movil.data.model.EstadoCarroDto
import com.tecsup.logismart_movil.ui.theme.*
import com.tecsup.logismart_movil.ui.viewmodel.CarUiState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CarCommandsScreen(
    carState: EstadoCarroDto?,
    uiState: CarUiState,
    onMover: (Int, Int, String?) -> Unit,
    onAvanzar: () -> Unit,
    onConfirmarParada: (Int) -> Unit,
    onReset: () -> Unit
) {
    var destX by remember { mutableStateOf("") }
    var destY by remember { mutableStateOf("") }
    var cajaId by remember { mutableStateOf("") }

    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBackground)
            .verticalScroll(scrollState)
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Alertas de Estado (Carga, Éxito, Errores)
        StatusAlertBox(uiState)

        // Panel de Envío de Coordenadas
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, DarkCardBorder, RoundedCornerShape(16.dp)),
            colors = CardDefaults.cardColors(containerColor = DarkCard)
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "Asignación de Ruta Directa",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedTextField(
                        value = destX,
                        onValueChange = { destX = it },
                        label = { Text("Destino X", color = TextSecondary) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary,
                            focusedBorderColor = AccentCyan,
                            unfocusedBorderColor = DarkCardBorder
                        ),
                        modifier = Modifier.weight(1f)
                    )

                    OutlinedTextField(
                        value = destY,
                        onValueChange = { destY = it },
                        label = { Text("Destino Y", color = TextSecondary) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary,
                            focusedBorderColor = AccentCyan,
                            unfocusedBorderColor = DarkCardBorder
                        ),
                        modifier = Modifier.weight(1f)
                    )
                }

                OutlinedTextField(
                    value = cajaId,
                    onValueChange = { cajaId = it },
                    label = { Text("ID Caja (Opcional)", color = TextSecondary) },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary,
                        focusedBorderColor = AccentCyan,
                        unfocusedBorderColor = DarkCardBorder
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                Button(
                    onClick = {
                        val x = destX.toIntOrNull() ?: 0
                        val y = destY.toIntOrNull() ?: 0
                        onMover(x, y, cajaId.ifBlank { null })
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = AccentIndigo),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp)
                ) {
                    Text("Generar Ruta y Mover", fontWeight = FontWeight.Bold, color = TextPrimary)
                }
            }
        }

        // Panel de Acciones Rápidas
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, DarkCardBorder, RoundedCornerShape(16.dp)),
            colors = CardDefaults.cardColors(containerColor = DarkCard)
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "Comandos de Vehículo",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Button(
                        onClick = onAvanzar,
                        colors = ButtonDefaults.buttonColors(containerColor = AccentCyan),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Avanzar Paso", fontWeight = FontWeight.Bold, color = DarkBackground)
                    }

                    Button(
                        onClick = { onConfirmarParada(1) }, // Id de usuario mock = 1
                        colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Confirmar Entrega", fontWeight = FontWeight.Bold, color = TextPrimary)
                    }
                }

                Button(
                    onClick = onReset,
                    colors = ButtonDefaults.buttonColors(containerColor = RoseDanger.copy(alpha = 0.8f)),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Reiniciar Carro (Reset)", fontWeight = FontWeight.Bold, color = TextPrimary)
                }
            }
        }

        // Mostrar Ruta Activa
        if (carState != null && carState.ruta.isNotEmpty()) {
            ActiveRoutePanel(carState.ruta)
        }

        // Mostrar Cola de Paradas (Multi-parada)
        if (carState != null && !carState.paradas.isNullOrEmpty()) {
            ParadasQueuePanel(carState)
        }
    }
}

@Composable
fun StatusAlertBox(uiState: CarUiState) {
    when (uiState) {
        is CarUiState.Loading -> {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = GlassOverlay)
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = AccentCyan,
                        strokeWidth = 2.dp
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(text = "Procesando comando...", color = TextPrimary, fontSize = 14.sp)
                }
            }
        }
        is CarUiState.Success -> {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = EmeraldGreen.copy(alpha = 0.15f))
            ) {
                Text(
                    text = uiState.message,
                    color = EmeraldGreen,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.padding(12.dp)
                )
            }
        }
        is CarUiState.Error -> {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = RoseDanger.copy(alpha = 0.15f))
            ) {
                Text(
                    text = uiState.error,
                    color = RoseDanger,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.padding(12.dp)
                )
            }
        }
        else -> {}
    }
}

@Composable
fun ActiveRoutePanel(ruta: List<CoordenadaDto>) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, DarkCardBorder, RoundedCornerShape(16.dp)),
        colors = CardDefaults.cardColors(containerColor = DarkCard)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = "Pasos de Ruta Activa (${ruta.size})",
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextSecondary
            )

            LazyRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                contentPadding = PaddingValues(vertical = 4.dp)
            ) {
                items(ruta) { coord ->
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(GlassOverlay)
                            .border(1.dp, DarkCardBorder, RoundedCornerShape(8.dp))
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "(${coord.x}, ${coord.y})",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun ParadasQueuePanel(carState: EstadoCarroDto) {
    val paradas = carState.paradas ?: emptyList()
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, DarkCardBorder, RoundedCornerShape(16.dp)),
        colors = CardDefaults.cardColors(containerColor = DarkCard)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(
                text = "Cola de Paradas Programadas",
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextSecondary
            )

            paradas.forEachIndexed { index, parada ->
                val isCurrent = index == carState.paradaActual
                val borderAlpha = if (isCurrent) 1f else 0.3f
                val borderColor = if (isCurrent) EmeraldGreen else DarkCardBorder

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(if (isCurrent) EmeraldGreen.copy(alpha = 0.05f) else GlassOverlay)
                        .border(1.dp, borderColor.copy(alpha = borderAlpha), RoundedCornerShape(8.dp))
                        .padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Parada ${index + 1}: ${parada.ubicacionNombre ?: "Estante"}",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (isCurrent) EmeraldGreen else TextPrimary
                        )
                        Text(
                            text = "Caja ID: ${parada.cajaId} • Coordenadas: (${parada.x}, ${parada.y})",
                            fontSize = 12.sp,
                            color = TextSecondary
                        )
                    }

                    if (isCurrent) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(4.dp))
                                .background(EmeraldGreen)
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text("ACTIVA", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        }
                    } else if (index < carState.paradaActual) {
                        Text("✔️", fontSize = 12.sp)
                    } else {
                        Text("⏳", fontSize = 12.sp)
                    }
                }
            }
        }
    }
}

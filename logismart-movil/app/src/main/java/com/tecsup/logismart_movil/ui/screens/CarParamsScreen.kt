package com.tecsup.logismart_movil.ui.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tecsup.logismart_movil.data.model.EstadoCarroDto
import com.tecsup.logismart_movil.data.model.RealTimeTelemetry
import com.tecsup.logismart_movil.ui.theme.*

@Composable
fun CarParamsScreen(
    connectionState: String,
    telemetry: RealTimeTelemetry,
    carState: EstadoCarroDto?,
    onRefresh: () -> Unit
) {
    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBackground)
            .verticalScroll(scrollState)
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Cabecera de Estado de Conexión
        ConnectionStatusHeader(connectionState, telemetry.isSimulated, onRefresh)

        Spacer(modifier = Modifier.height(20.dp))

        // Grid de Parámetros Principales (Velocidad y Batería)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Box(modifier = Modifier.weight(1f)) {
                CircularMetricCard(
                    title = "Velocidad",
                    value = "${telemetry.velocidad} m/s",
                    progress = (telemetry.velocidad / 2.0).toFloat().coerceIn(0f, 1f),
                    color = AccentCyan
                )
            }
            Box(modifier = Modifier.weight(1f)) {
                CircularMetricCard(
                    title = "Batería",
                    value = "${telemetry.bateria}%",
                    progress = telemetry.bateria / 100f,
                    color = if (telemetry.bateria > 25) EmeraldGreen else RoseDanger
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Temperatura de Operación
        TemperatureCard(telemetry.temperatura)

        Spacer(modifier = Modifier.height(16.dp))

        // Estado del Carro y Coordenadas
        CarStateCoordinatesCard(carState)

        Spacer(modifier = Modifier.height(16.dp))

        // Datos de Señal y Sensores
        SignalAndStatsCard(telemetry.senal)
    }
}

@Composable
fun ConnectionStatusHeader(
    connectionState: String,
    isSimulated: Boolean,
    onRefresh: () -> Unit
) {
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val pulseAlpha by infiniteTransition.animateFloat(
        initialValue = 0.3f,
        targetValue = 1.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "alpha"
    )

    val badgeColor = when (connectionState) {
        "Conectado" -> EmeraldGreen
        "Conectando..." -> AmberWarning
        "Fallback (Simulado)" -> AccentIndigo
        else -> Color.Gray
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, DarkCardBorder, RoundedCornerShape(16.dp)),
        colors = CardDefaults.cardColors(containerColor = DarkCard)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(12.dp)
                        .clip(CircleShape)
                        .background(badgeColor.copy(alpha = pulseAlpha))
                        .border(1.dp, badgeColor, CircleShape)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Column {
                    Text(
                        text = "Vehículo: AGV-01",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    Text(
                        text = if (isSimulated) "Simulación Activa (Offline)" else connectionState,
                        fontSize = 12.sp,
                        color = TextSecondary
                    )
                }
            }

            Button(
                onClick = onRefresh,
                colors = ButtonDefaults.buttonColors(containerColor = GlassOverlay),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text(text = "Sincronizar", color = TextPrimary, fontSize = 12.sp)
            }
        }
    }
}

@Composable
fun CircularMetricCard(
    title: String,
    value: String,
    progress: Float,
    color: Color
) {
    // Animación suave de progreso
    val animatedProgress by animateFloatAsState(
        targetValue = progress,
        animationSpec = tween(800, easing = FastOutSlowInEasing),
        label = "progress"
    )

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, DarkCardBorder, RoundedCornerShape(16.dp)),
        colors = CardDefaults.cardColors(containerColor = DarkCard)
    ) {
        Column(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = title,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextSecondary
            )
            Spacer(modifier = Modifier.height(16.dp))

            Box(contentAlignment = Alignment.Center, modifier = Modifier.size(100.dp)) {
                Canvas(modifier = Modifier.size(90.dp)) {
                    // Círculo de Fondo
                    drawCircle(
                        color = Color.White.copy(alpha = 0.05f),
                        style = Stroke(width = 8.dp.toPx())
                    )
                    // Círculo de Progreso
                    drawArc(
                        color = color,
                        startAngle = -90f,
                        sweepAngle = 360f * animatedProgress,
                        useCenter = false,
                        style = Stroke(width = 8.dp.toPx(), cap = StrokeCap.Round)
                    )
                }
                Text(
                    text = value,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
            }
        }
    }
}

@Composable
fun TemperatureCard(temperature: Double) {
    val tempColor = when {
        temperature > 42.0 -> RoseDanger
        temperature > 37.0 -> AmberWarning
        else -> AccentCyan
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, DarkCardBorder, RoundedCornerShape(16.dp)),
        colors = CardDefaults.cardColors(containerColor = DarkCard)
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
                    text = "Temperatura del Motor",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextSecondary
                )
                Text(
                    text = "$temperature °C",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = tempColor
                )
            }
            Spacer(modifier = Modifier.height(12.dp))

            // Barra de progreso lineal para la temperatura
            val tempRange = (temperature - 20).coerceIn(0.0, 40.0) / 40.0
            val animatedTempProgress by animateFloatAsState(
                targetValue = tempRange.toFloat(),
                animationSpec = tween(600),
                label = "tempProgress"
            )

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(8.dp)
                    .clip(CircleShape)
                    .background(Color.White.copy(alpha = 0.05f))
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxHeight()
                        .fillMaxWidth(animatedTempProgress)
                        .clip(CircleShape)
                        .background(
                            Brush.horizontalGradient(
                                listOf(AccentCyan, tempColor)
                            )
                        )
                )
            }

            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = when {
                    temperature > 42.0 -> "⚠️ ALERTA: Sobrecalentamiento del Motor."
                    temperature > 37.0 -> "Advertencia: Operando en altas temperaturas."
                    else -> "Funcionamiento óptimo del motor."
                },
                fontSize = 12.sp,
                color = if (temperature > 37.0) tempColor else TextSecondary
            )
        }
    }
}

@Composable
fun CarStateCoordinatesCard(carState: EstadoCarroDto?) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, DarkCardBorder, RoundedCornerShape(16.dp)),
        colors = CardDefaults.cardColors(containerColor = DarkCard)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = "Ubicación y Operación",
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextSecondary,
                modifier = Modifier.padding(bottom = 12.dp)
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(text = "Coordenadas", fontSize = 12.sp, color = TextSecondary)
                    Text(
                        text = if (carState != null) "(${carState.posX}, ${carState.posY})" else "—",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text(text = "Estado AGV", fontSize = 12.sp, color = TextSecondary)
                    val estadoDisplay = when (carState?.estado) {
                        "esperando" -> "Esperando"
                        "moviendo" -> "En Movimiento"
                        "llego" -> "Llegó a Destino"
                        "regresando" -> "Regresando a Base"
                        else -> "Desconocido"
                    }
                    val estadoColor = when (carState?.estado) {
                        "esperando" -> TextSecondary
                        "moviendo" -> AccentCyan
                        "llego" -> EmeraldGreen
                        "regresando" -> AmberWarning
                        else -> TextSecondary
                    }
                    Text(
                        text = estadoDisplay,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = estadoColor
                    )
                }
            }

            if (carState != null && (carState.destinoX != 0 || carState.destinoY != 0)) {
                Spacer(modifier = Modifier.height(12.dp))
                Divider(color = DarkCardBorder)
                Spacer(modifier = Modifier.height(12.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "Destino actual:",
                        fontSize = 12.sp,
                        color = TextSecondary
                    )
                    Text(
                        text = "(${carState.destinoX}, ${carState.destinoY})",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                }
            }
        }
    }
}

@Composable
fun SignalAndStatsCard(signalDbm: Int) {
    val signalPercent = ((signalDbm + 100).coerceIn(0, 70) / 70f * 100).toInt()
    val signalColor = when {
        signalDbm > -65 -> EmeraldGreen
        signalDbm > -80 -> AmberWarning
        else -> RoseDanger
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, DarkCardBorder, RoundedCornerShape(16.dp)),
        colors = CardDefaults.cardColors(containerColor = DarkCard)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "Intensidad de Señal (WiFi)",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextSecondary
                )
                Text(
                    text = "$signalDbm dBm ($signalPercent%)",
                    fontSize = 12.sp,
                    color = TextSecondary,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }

            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(signalColor.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = if (signalPercent > 70) "📶" else if (signalPercent > 35) "📶" else "⚠️",
                    fontSize = 16.sp
                )
            }
        }
    }
}

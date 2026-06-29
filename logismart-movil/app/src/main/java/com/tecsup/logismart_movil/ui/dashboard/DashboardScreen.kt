package com.tecsup.logismart_movil.ui.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material.icons.filled.TaskAlt
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material.icons.automirrored.filled.Assignment
import androidx.compose.material3.Button
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.Surface
import androidx.compose.foundation.clickable
import androidx.compose.material.icons.filled.Settings
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.tecsup.logismart_movil.ui.components.LoadingSkeleton
import com.tecsup.logismart_movil.data.local.UserPreferences
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import com.devpulse.logistica.R

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    state: DashboardUiState,
    userName: String,
    onRefresh: () -> Unit,
    onLogout: () -> Unit,
    onTestNotification: (Int) -> Unit,
    onNavigateToPlanillas: () -> Unit,
    onNavigateToHistory: () -> Unit,
    onNavigateToBoxes: () -> Unit,
    onNavigateToShelves: () -> Unit,
    onNavigateToSettings: () -> Unit,
    onNavigateToNotifications: () -> Unit,
) {
    val context = LocalContext.current
    val preferences = remember { UserPreferences(context.applicationContext) }
    val showPriority by preferences.showPriorityWidget.collectAsState(initial = true)
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            painter = painterResource(R.drawable.ic_logismart_brand),
                            contentDescription = null,
                            tint = Color.Unspecified,
                            modifier = Modifier.size(30.dp)
                        )
                        Spacer(Modifier.width(10.dp))
                        Text("LogiSmart", fontWeight = FontWeight.Bold)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface,
                    actionIconContentColor = MaterialTheme.colorScheme.onSurface,
                ),
            )
        },
    ) { paddingValues ->
        val padding = paddingValues
        if (state.isLoading) {
            LoadingSkeleton(
                modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp),
                rows = 4
            )
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.background)
                    .padding(padding)
                    .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 20.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                WelcomeHero(
                    userName = userName.ifBlank { "operador" },
                    pendingBoxes = state.summary.pendingBoxes,
                    isAdmin = state.summary.isAdmin,
                    onRefresh = onRefresh,
                )

                state.errorMessage?.let {
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.errorContainer
                        )
                    ) {
                        Text(
                            it,
                            modifier = Modifier.padding(16.dp),
                            color = MaterialTheme.colorScheme.onErrorContainer,
                        )
                    }
                }

                SummaryGrid(
                    summary = state.summary,
                    onPlanillas = onNavigateToPlanillas,
                    onBoxes = onNavigateToBoxes,
                    onHistory = onNavigateToHistory,
                    onShelves = onNavigateToShelves,
                )

                val priority: @Composable () -> Unit = { if (showPriority) PriorityWidget(
                    pendingBoxes = state.summary.pendingBoxes,
                    onReviewPending = onNavigateToBoxes,
                ) }
                priority()
                Spacer(Modifier.height(8.dp))
            }
        }
    }
}

@Composable
private fun WelcomeHero(userName: String, pendingBoxes: Int, isAdmin: Boolean, onRefresh: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                Brush.linearGradient(
                    listOf(MaterialTheme.colorScheme.primary, MaterialTheme.colorScheme.tertiary)
                ),
                RoundedCornerShape(24.dp),
            )
            .padding(horizontal = 18.dp, vertical = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(
                if (isAdmin) "Panel administrativo" else "Hola, $userName",
                style = MaterialTheme.typography.titleLarge,
                color = Color.White,
                fontWeight = FontWeight.Bold
            )
            Text(
                if (pendingBoxes > 0) "$pendingBoxes cajas esperan tu atención." else "Todo está al día. Buen trabajo.",
                color = Color.White.copy(alpha = .86f),
                style = MaterialTheme.typography.bodyMedium,
            )
        }
        IconButton(
            onClick = onRefresh,
            modifier = Modifier.background(Color.White.copy(alpha=.15f), RoundedCornerShape(12.dp))
        ) { Icon(Icons.Default.Refresh, "Actualizar", tint = Color.White) }
    }
}

@Composable
private fun SummaryGrid(summary: DashboardSummary, onPlanillas:()->Unit, onBoxes:()->Unit, onHistory:()->Unit, onShelves:()->Unit) {
    BoxWithConstraints(Modifier.fillMaxWidth()) {
        val tablet = maxWidth >= 700.dp
        val cards: @Composable RowScope.() -> Unit = {
            SummaryCard(if(summary.isAdmin) "Planillas completadas" else "Mis Planillas", if(summary.isAdmin) "${summary.completedPlanillas}/${summary.planillasCount}" else summary.planillasCount.toString(), if(summary.isAdmin) "Total supervisado" else "Asignadas ahora", Icons.AutoMirrored.Filled.Assignment, MaterialTheme.colorScheme.primary, onPlanillas, Modifier.weight(1f))
            SummaryCard("Cajas pendientes", summary.pendingBoxes.toString(), "Requieren atención", Icons.Default.Inventory2, MaterialTheme.colorScheme.secondary, onBoxes, Modifier.weight(1f))
            if (tablet) {
                SummaryCard("Despachos", summary.completedDispatches.toString(), "Completados", Icons.Default.LocalShipping, MaterialTheme.colorScheme.primary, onHistory, Modifier.weight(1f))
                SummaryCard("Estantes", "Ver", "Capacidad actual", Icons.Default.Inventory2, MaterialTheme.colorScheme.secondary, onShelves, Modifier.weight(1f))
            }
        }
        Column(verticalArrangement=Arrangement.spacedBy(12.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement=Arrangement.spacedBy(12.dp), content=cards)
            if(!tablet) Row(Modifier.fillMaxWidth(), horizontalArrangement=Arrangement.spacedBy(12.dp)) {
                SummaryCard("Despachos", summary.completedDispatches.toString(), "Completados", Icons.Default.LocalShipping, MaterialTheme.colorScheme.primary, onHistory, Modifier.weight(1f))
                SummaryCard("Estantes", "Ver", "Capacidad actual", Icons.Default.Inventory2, MaterialTheme.colorScheme.secondary, onShelves, Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun NotificationsWidget(
    pendingBoxes: Int,
    planillasCount: Int,
    completedDispatches: Int,
    onNotify: () -> Unit,
    onBoxesClick: () -> Unit,
    onPlanillasClick: () -> Unit,
    onHistoryClick: () -> Unit,
    compact: Boolean,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = CardDefaults.outlinedCardBorder(),
    ) {
        Column(Modifier.padding(18.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(color = MaterialTheme.colorScheme.primaryContainer, shape = RoundedCornerShape(12.dp)) {
                    Icon(Icons.Default.Notifications, null, Modifier.padding(10.dp).size(22.dp))
                }
                Spacer(Modifier.size(12.dp))
                Column(Modifier.weight(1f)) {
                    Text("Notificaciones", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                    Text("Resumen operativo en tiempo real", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                IconButton(onClick = onNotify) {
                    Icon(Icons.Default.NotificationsActive, contentDescription = "Enviar recordatorio al dispositivo")
                }
            }
            Spacer(Modifier.height(if (compact) 4.dp else 12.dp))
            NotificationRow(
                icon = Icons.Default.WarningAmber,
                title = if (pendingBoxes == 1) "1 caja requiere atención" else "$pendingBoxes cajas requieren atención",
                description = if (compact) "" else "Pendientes de procesamiento",
                accent = if (pendingBoxes > 0) Color(0xFFF59E0B) else Color(0xFF10B981),
                onClick = onBoxesClick,
            )
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            NotificationRow(
                icon = Icons.AutoMirrored.Filled.Assignment,
                title = "$planillasCount planillas asignadas",
                description = if (compact) "" else "Documentos disponibles para revisar",
                accent = MaterialTheme.colorScheme.primary,
                onClick = onPlanillasClick,
            )
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            NotificationRow(
                icon = Icons.Default.TaskAlt,
                title = "$completedDispatches despachos completados",
                description = if (compact) "" else "Consulta el historial de movimientos",
                accent = Color(0xFF10B981),
                onClick = onHistoryClick,
            )
        }
    }
}

@Composable
private fun NotificationRow(
    icon: ImageVector,
    title: String,
    description: String,
    accent: Color,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick).padding(vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier.size(38.dp).background(accent.copy(alpha = .12f), RoundedCornerShape(11.dp)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, null, Modifier.size(20.dp), tint = accent)
        }
        Spacer(Modifier.size(12.dp))
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
            if (description.isNotEmpty()) Text(description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Icon(Icons.Default.ArrowForward, null, Modifier.size(18.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun PriorityWidget(pendingBoxes: Int, onReviewPending: () -> Unit) {
    val hasPending = pendingBoxes > 0
    val accent = if (hasPending) Color(0xFFF59E0B) else Color(0xFF10B981)
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = accent.copy(alpha = .10f),
        contentColor = MaterialTheme.colorScheme.onSurface,
        shape = RoundedCornerShape(18.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, accent.copy(alpha = .28f)),
    ) {
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(if (hasPending) Icons.Default.WarningAmber else Icons.Default.TaskAlt, null, tint = accent)
            Spacer(Modifier.size(12.dp))
            Column(Modifier.weight(1f)) {
                Text(if (hasPending) "Prioridad operativa" else "Operación al día", style = MaterialTheme.typography.titleSmall)
                Text(
                    if (hasPending) "Revisa las cajas pendientes antes del próximo despacho." else "No hay cajas pendientes por procesar.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            if (hasPending) {
                FilledTonalButton(onClick = onReviewPending) { Text("Revisar") }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SummaryCard(
    title: String,
    value: String,
    activityLabel: String,
    icon: ImageVector,
    accent: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier.height(148.dp),
        onClick = onClick,
        shape = RoundedCornerShape(18.dp),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 0.dp,
        shadowElevation = 0.dp,
    ) {
        Row(Modifier.fillMaxSize()) {
            Box(
                Modifier.fillMaxHeight().width(4.dp).background(accent)
            )
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Box(Modifier.size(34.dp).background(accent.copy(alpha = .12f), RoundedCornerShape(11.dp)), contentAlignment = Alignment.Center) {
                    Icon(icon, contentDescription = null, tint = accent, modifier = Modifier.size(20.dp))
                }
                Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, maxLines = 1)
                Text(title, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.TrendingUp, null, Modifier.size(13.dp), tint = accent)
                    Spacer(Modifier.size(4.dp))
                    Text(activityLabel, style = MaterialTheme.typography.labelSmall, color = accent, maxLines = 1)
                }
            }
        }
    }
}

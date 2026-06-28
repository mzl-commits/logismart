package com.tecsup.logismart_movil.ui.shelves

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.tecsup.logismart_movil.domain.model.Shelf

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ShelvesScreen(
    viewModel: ShelvesViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val errorMessage = uiState.errorMessage

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(text = "Vista de estantes")
                }
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            item {
                Text(
                    text = "Resumen de capacidad, ocupación actual y cajas asignadas",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            if (errorMessage != null) {
                item {
                    Text(
                        text = errorMessage,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.error
                    )
                }
            }

            if (uiState.isLoading) {
                item {
                    Text(
                        text = "Cargando estantes...",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            items(uiState.shelves) { shelf ->
                ShelfCard(shelf = shelf)
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
    val progressColor = getOccupationColor(shelf.occupationPercentage)
    val backgroundColor = getOccupationBackgroundColor(shelf.occupationPercentage)

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(
            containerColor = backgroundColor
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 5.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
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
                }

                OccupationBadge(
                    status = shelf.status,
                    color = progressColor
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "Capacidad",
                    style = MaterialTheme.typography.bodyMedium
                )

                Text(
                    text = "${shelf.currentOccupation}/${shelf.capacity}",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold
                )
            }

            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(10.dp),
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
fun OccupationBadge(
    status: String,
    color: Color
) {
    Box(
        modifier = Modifier
            .background(
                color = color.copy(alpha = 0.15f),
                shape = RoundedCornerShape(50)
            )
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

fun getOccupationColor(percentage: Float): Color {
    return when {
        percentage >= 90f -> Color(0xFFC62828)
        percentage >= 70f -> Color(0xFFF57C00)
        else -> Color(0xFF2E7D32)
    }
}

fun getOccupationBackgroundColor(percentage: Float): Color {
    return when {
        percentage >= 90f -> Color(0xFFFFEBEE)
        percentage >= 70f -> Color(0xFFFFF3E0)
        else -> Color(0xFFE8F5E9)
    }
}

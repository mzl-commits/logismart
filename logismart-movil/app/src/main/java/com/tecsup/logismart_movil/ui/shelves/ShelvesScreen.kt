package com.tecsup.logismart_movil.ui.shelves

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
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
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

data class ShelfUi(
    val name: String,
    val capacity: Int,
    val currentOccupation: Int,
    val assignedBoxes: Int
) {
    val occupationPercentage: Float
        get() = if (capacity == 0) 0f else (currentOccupation.toFloat() / capacity.toFloat()) * 100f

    val status: String
        get() = when {
            occupationPercentage >= 90f -> "Alerta"
            occupationPercentage >= 70f -> "Ocupado"
            else -> "Disponible"
        }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ShelvesScreen() {
    val shelves = listOf(
        ShelfUi("Estante A-01", capacity = 100, currentOccupation = 72, assignedBoxes = 18),
        ShelfUi("Estante B-02", capacity = 80, currentOccupation = 35, assignedBoxes = 9),
        ShelfUi("Estante C-03", capacity = 120, currentOccupation = 108, assignedBoxes = 27),
        ShelfUi("Estante D-04", capacity = 60, currentOccupation = 21, assignedBoxes = 5)
    )

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
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(shelves) { shelf ->
                ShelfCard(shelf = shelf)
            }
        }
    }
}

@Composable
fun ShelfCard(
    shelf: ShelfUi,
    modifier: Modifier = Modifier
) {
    val progress = (shelf.occupationPercentage / 100f).coerceIn(0f, 1f)

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = shelf.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )

                Text(
                    text = shelf.status,
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold
                )
            }

            Text(
                text = "Capacidad: ${shelf.capacity} espacios",
                style = MaterialTheme.typography.bodyMedium
            )

            Text(
                text = "Ocupación actual: ${shelf.currentOccupation} espacios",
                style = MaterialTheme.typography.bodyMedium
            )

            Text(
                text = "Cajas asignadas: ${shelf.assignedBoxes}",
                style = MaterialTheme.typography.bodyMedium
            )

            Spacer(modifier = Modifier.height(4.dp))

            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier.fillMaxWidth()
            )

            Text(
                text = "Ocupación: ${shelf.occupationPercentage.toInt()}%",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

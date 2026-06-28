package com.tecsup.logismart_movil.ui.boxes

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AssistChip
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.tecsup.logismart_movil.data.model.LogisticBox

@Composable
fun BoxesScreen(
    viewModel: BoxesViewModel = viewModel()
) {
    val state by viewModel.uiState.collectAsState()

    Column(
        modifier = Modifier.padding(16.dp)
    ) {
        Text(
            text = "Cajas activas",
            style = MaterialTheme.typography.headlineSmall
        )

        Spacer(modifier = Modifier.height(12.dp))

        if (state.loading) {
            CircularProgressIndicator()
        } else {
            if (state.boxes.isEmpty()) {
                Text("No hay cajas activas registradas.")
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(bottom = 16.dp)
                ) {
                    items(state.boxes) { box ->
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
    ElevatedCard(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 10.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = box.id,
                style = MaterialTheme.typography.titleMedium
            )

            Spacer(modifier = Modifier.height(6.dp))

            Text("Producto: ${box.producto}")
            Text("Cantidad: ${box.cantidad}")
            Text("Peso: ${box.pesoKg} kg")
            Text("Categoría: ${box.categoria}")
            Text("Ubicación: ${box.ubicacion}")
            Text("Carro asignado: ${box.carroAsignado}")

            Spacer(modifier = Modifier.height(8.dp))

            AssistChip(
                onClick = {},
                label = {
                    Text(box.estado)
                }
            )

            if (box.esFragil) {
                Spacer(modifier = Modifier.height(6.dp))
                Text("Producto frágil")
            }
        }
    }
}
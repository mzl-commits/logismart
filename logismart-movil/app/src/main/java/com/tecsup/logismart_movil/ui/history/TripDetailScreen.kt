package com.tecsup.logismart_movil.ui.history

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel

@Composable
fun TripDetailScreen(
    tripId: Int,
    onBack: () -> Unit,
    viewModel: TripDetailViewModel = viewModel()
) {
    val state by viewModel.uiState.collectAsState()

    LaunchedEffect(tripId) {
        viewModel.loadTrip(tripId)
    }

    Column(
        modifier = Modifier.padding(16.dp)
    ) {
        Button(onClick = onBack) {
            Text("Volver")
        }

        Spacer(modifier = Modifier.height(12.dp))

        Text(
            text = "Detalle de viaje",
            style = MaterialTheme.typography.headlineSmall
        )

        Spacer(modifier = Modifier.height(12.dp))

        if (state.loading) {
            CircularProgressIndicator()
        } else {
            val trip = state.trip

            if (trip == null) {
                Text("No se encontró información del viaje.")
            } else {
                ElevatedCard(
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp)
                    ) {
                        Text(
                            text = "Viaje #${trip.id}",
                            style = MaterialTheme.typography.titleMedium
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        Text("Fecha: ${trip.fecha}")
                        Text("Origen: ${trip.origen}")
                        Text("Destino: ${trip.destino}")
                        Text("Ruta: ${trip.ruta}")
                        Text("Tiempo estimado: ${trip.tiempo}")
                        Text("Carga transportada: ${trip.cargaTransportada}")
                        Text("Transporte: ${trip.transporte}")
                        Text("Estado: ${trip.estado}")
                    }
                }
            }
        }
    }
}
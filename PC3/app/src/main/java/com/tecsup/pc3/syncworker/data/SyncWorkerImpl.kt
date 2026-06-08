package com.tecsup.pc3.syncworker.data

import android.content.Context
import android.util.Log
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withTimeoutOrNull

@HiltWorker
class SyncWorkerImpl @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val connectivityMonitor: ConnectivityMonitor,
    private val tripRepository: TripRepository,
    private val gpsPointRepository: GpsPointRepository,
    private val mobileApi: MobileApi
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        // 1. Verificar viaje activo
        val activeTrip = tripRepository.getActiveTrip()
        if (activeTrip == null || (activeTrip.status != "in_progress" && activeTrip.status != "pending_end")) {
            return Result.success()
        }

        // 2. Verificar red (fix de red nula)
        val isConnected = withTimeoutOrNull(5000) {
            connectivityMonitor.isConnected.filterNotNull().first()
        } ?: false
        if (!isConnected) return Result.success()

        // 3. Manejo de pending_end (cierre de viaje)
        if (activeTrip.status == "pending_end") {
            try {
                val endResponse = mobileApi.endTrip(activeTrip.id)
                if (endResponse.isSuccessful) {
                    tripRepository.updateTripStatus(activeTrip.id, "completed")
                }
            } catch (e: Exception) {
                Log.e("SyncWorker", "Fallo al cerrar viaje: ${e.message}")
            }
        }

        // 4. Leer puntos GPS pendientes
        val unsyncedPoints = gpsPointRepository.getUnsyncedPoints(activeTrip.id)

        // 5. Si lote está vacío, terminar
        if (unsyncedPoints.isEmpty()) {
            return Result.success()
        }

        // 6. Calcular distancia
        val localDistanceKm = unsyncedPoints.sumOf { it.distance }

        // 7. Construir request
        val batchRequest = SyncBatchRequest(
            points = unsyncedPoints,
            current_local_distance_km = localDistanceKm
        )

        // 8. Llamada a la API y marcado
        try {
            val response = mobileApi.sync(activeTrip.id, batchRequest)
            // 9. En éxito
            if (response.isSuccessful) {
                gpsPointRepository.markAsSynced(unsyncedPoints.map { it.id })
            } else {
                // 10. En error HTTP
                Log.e("SyncWorker", "Error HTTP: ${response.code()}")
            }
        } catch (e: Exception) {
            // 10. En error de red / timeout
            Log.e("SyncWorker", "Timeout/Error: ${e.message}")
        }

        return Result.success()
    }
}
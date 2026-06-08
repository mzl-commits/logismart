package com.tecsup.pc3.syncworker.data

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
// import dagger.assisted.Assisted
// import dagger.assisted.AssistedInject
import kotlinx.coroutines.flow.first

// @HiltWorker
class SyncWorkerImpl /* @AssistedInject */ constructor(
    /* @Assisted */ context: Context,
    /* @Assisted */ params: WorkerParameters,
    // private val connectivityMonitor: ConnectivityMonitor,
    // private val tripRepository: TripRepository
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        // Simulación temporal para que no marque error hasta que tengas los repositorios
        val isConnected = true // connectivityMonitor.isConnected.first()
        if (!isConnected) return Result.success()

        val tripStatus = "in_progress" // tripRepository.getActiveTrip()?.status
        if (tripStatus != "in_progress" && tripStatus != "pending_end") {
            return Result.success()
        }
// Simulación: val unsyncedPoints = gpsPointRepository.getUnsyncedPoints(activeTrip.id)
        val unsyncedPoints = listOf<Any>() // Reemplazar Any por GpsPoint
        if (unsyncedPoints.isEmpty()) {
            return Result.success()
        }

        // Simulación: val localDistanceKm = unsyncedPoints.sumOf { it.distance }
        val localDistanceKm = 0.0
        return Result.success()
    }
}
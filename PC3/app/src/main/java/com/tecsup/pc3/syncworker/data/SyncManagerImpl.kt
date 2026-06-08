package com.tecsup.pc3.syncworker.data

import androidx.work.*
import java.util.concurrent.TimeUnit
import javax.inject.Inject

class SyncManagerImpl @Inject constructor(
    private val workManager: WorkManager
) /* : SyncManager */ { // Descomenta la interfaz cuando la tengas

    fun enqueuePeriodicSync() { // override
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val request = PeriodicWorkRequestBuilder<SyncWorkerImpl>(15, TimeUnit.MINUTES)
            .setConstraints(constraints)
            .build()

        workManager.enqueueUniquePeriodicWork(
            "SyncWorker",
            ExistingPeriodicWorkPolicy.KEEP,
            request
        )
    }

    fun enqueueImmediateSync() { // override
        val request = OneTimeWorkRequestBuilder<SyncWorkerImpl>()
            .setBackoffCriteria(
                BackoffPolicy.EXPONENTIAL,
                WorkRequest.MIN_BACKOFF_MILLIS,
                TimeUnit.MILLISECONDS
            )
            .build()
        workManager.enqueue(request)
    }
}
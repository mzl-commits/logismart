package com.tecsup.logismart_movil.utils

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.tecsup.logismart_movil.MainActivity
import com.devpulse.logistica.R

class NotificationHelper(private val context: Context) {
    fun createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Alertas logísticas",
                NotificationManager.IMPORTANCE_HIGH,
            ).apply {
                description = "Eventos operativos y alertas del sistema LogiSmart"
                enableVibration(true)
            }
            context.getSystemService(NotificationManager::class.java)
                .createNotificationChannel(channel)
        }
    }

    fun showLogisticsAlert(pendingBoxes: Int = 0) {
        if (
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS,
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            return
        }

        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val detail = if (pendingBoxes > 0) {
            if (pendingBoxes == 1) "Tienes 1 caja pendiente por procesar" else "Tienes $pendingBoxes cajas pendientes por procesar"
        } else {
            "La operación está al día y no registra cajas pendientes"
        }
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_logismart)
            .setContentTitle("Resumen operativo LogiSmart")
            .setContentText(detail)
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText(detail)
            )
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, notification)
    }

    companion object {
        private const val CHANNEL_ID = "logismart_logistics_alerts"
        private const val NOTIFICATION_ID = 1001
    }
}

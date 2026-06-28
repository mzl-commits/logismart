package com.tecsup.logismart_movil

import android.app.Application
import com.tecsup.logismart_movil.utils.NotificationHelper
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class LogiSmartApp : Application() {
    override fun onCreate() {
        super.onCreate()
        NotificationHelper(this).createChannel()
    }
}

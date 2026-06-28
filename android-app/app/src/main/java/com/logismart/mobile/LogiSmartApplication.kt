package com.logismart.mobile

import android.app.Application
import com.logismart.mobile.core.network.ApiClient
import com.logismart.mobile.core.session.SessionManager
import com.logismart.mobile.feature.auth.AuthRepository

class LogiSmartApplication : Application() {
    val sessionManager by lazy { SessionManager(this) }
    val api by lazy { ApiClient.create(sessionManager) }
    val authRepository by lazy { AuthRepository(api, sessionManager) }
}

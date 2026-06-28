

package com.tecsup.logismart_movil.data.local

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.sessionDataStore by preferencesDataStore(name = "logismart_session")

data class UserSession(
    val token: String,
    val username: String,
    val fullName: String,
)

class SessionManager(private val context: Context) {
    private object Keys {
        val token = stringPreferencesKey("auth_token")
        val username = stringPreferencesKey("username")
        val fullName = stringPreferencesKey("full_name")
    }

    val session: Flow<UserSession?> = context.sessionDataStore.data.map { preferences ->
        val token = preferences[Keys.token]
        if (token.isNullOrBlank()) {
            null
        } else {
            UserSession(
                token = token,
                username = preferences[Keys.username].orEmpty(),
                fullName = preferences[Keys.fullName].orEmpty(),
            )
        }
    }

    suspend fun save(token: String, username: String, fullName: String) {
        context.sessionDataStore.edit { preferences ->
            preferences[Keys.token] = token
            preferences[Keys.username] = username
            preferences[Keys.fullName] = fullName
        }
    }

    suspend fun clear() {
        context.sessionDataStore.edit { it.clear() }
    }
}

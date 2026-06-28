package com.tecsup.logismart_movil.data.local

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.settingsDataStore by preferencesDataStore(name = "user_settings")

class UserPreferences(
    private val context: Context
) {
    private object Keys {
        val USER_NAME = stringPreferencesKey("user_name")
        val SERVER_URL = stringPreferencesKey("server_url")
        val NOTIFICATIONS_ENABLED = booleanPreferencesKey("notifications_enabled")
        val DARK_MODE_ENABLED = booleanPreferencesKey("dark_mode_enabled")
    }

    val userName: Flow<String> = context.settingsDataStore.data.map { preferences ->
        preferences[Keys.USER_NAME] ?: "Gisela Morales"
    }

    val serverUrl: Flow<String> = context.settingsDataStore.data.map { preferences ->
        preferences[Keys.SERVER_URL] ?: "http://10.0.2.2:8000/"
    }

    val notificationsEnabled: Flow<Boolean> = context.settingsDataStore.data.map { preferences ->
        preferences[Keys.NOTIFICATIONS_ENABLED] ?: true
    }

    val darkModeEnabled: Flow<Boolean> = context.settingsDataStore.data.map { preferences ->
        preferences[Keys.DARK_MODE_ENABLED] ?: false
    }

    suspend fun saveUserName(value: String) {
        context.settingsDataStore.edit { preferences ->
            preferences[Keys.USER_NAME] = value
        }
    }

    suspend fun saveServerUrl(value: String) {
        context.settingsDataStore.edit { preferences ->
            preferences[Keys.SERVER_URL] = value
        }
    }

    suspend fun saveNotificationsEnabled(value: Boolean) {
        context.settingsDataStore.edit { preferences ->
            preferences[Keys.NOTIFICATIONS_ENABLED] = value
        }
    }

    suspend fun saveDarkModeEnabled(value: Boolean) {
        context.settingsDataStore.edit { preferences ->
            preferences[Keys.DARK_MODE_ENABLED] = value
        }
    }
}

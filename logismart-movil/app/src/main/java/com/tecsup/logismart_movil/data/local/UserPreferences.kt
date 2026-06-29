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
        val SHOW_NOTIFICATIONS_WIDGET = booleanPreferencesKey("show_notifications_widget")
        val SHOW_PRIORITY_WIDGET = booleanPreferencesKey("show_priority_widget")
        val COMPACT_DASHBOARD = booleanPreferencesKey("compact_dashboard")
        val PRIORITY_WIDGET_FIRST = booleanPreferencesKey("priority_widget_first")
    }

    val userName: Flow<String> = context.settingsDataStore.data.map { preferences ->
        preferences[Keys.USER_NAME] ?: "Gisela Morales"
    }

    val serverUrl: Flow<String> = context.settingsDataStore.data.map { preferences ->
        preferences[Keys.SERVER_URL] ?: "https://logistica.promube.com/"
    }

    val notificationsEnabled: Flow<Boolean> = context.settingsDataStore.data.map { preferences ->
        preferences[Keys.NOTIFICATIONS_ENABLED] ?: true
    }

    val darkModeEnabled: Flow<Boolean> = context.settingsDataStore.data.map { preferences ->
        preferences[Keys.DARK_MODE_ENABLED] ?: false
    }
    val showNotificationsWidget: Flow<Boolean> = context.settingsDataStore.data.map { it[Keys.SHOW_NOTIFICATIONS_WIDGET] ?: true }
    val showPriorityWidget: Flow<Boolean> = context.settingsDataStore.data.map { it[Keys.SHOW_PRIORITY_WIDGET] ?: true }
    val compactDashboard: Flow<Boolean> = context.settingsDataStore.data.map { it[Keys.COMPACT_DASHBOARD] ?: false }
    val priorityWidgetFirst: Flow<Boolean> = context.settingsDataStore.data.map { it[Keys.PRIORITY_WIDGET_FIRST] ?: false }

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
    suspend fun saveShowNotificationsWidget(value: Boolean) { context.settingsDataStore.edit { it[Keys.SHOW_NOTIFICATIONS_WIDGET] = value } }
    suspend fun saveShowPriorityWidget(value: Boolean) { context.settingsDataStore.edit { it[Keys.SHOW_PRIORITY_WIDGET] = value } }
    suspend fun saveCompactDashboard(value: Boolean) { context.settingsDataStore.edit { it[Keys.COMPACT_DASHBOARD] = value } }
    suspend fun savePriorityWidgetFirst(value: Boolean) { context.settingsDataStore.edit { it[Keys.PRIORITY_WIDGET_FIRST] = value } }
}

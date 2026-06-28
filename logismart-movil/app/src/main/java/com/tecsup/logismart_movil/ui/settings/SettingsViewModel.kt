package com.tecsup.logismart_movil.ui.settings

import androidx.lifecycle.ViewModel

data class SettingsUiState(
    val userName: String = "Gisela Morales",
    val serverUrl: String = "http://10.0.2.2:8000/",
    val notificationsEnabled: Boolean = true,
    val darkModeEnabled: Boolean = false
)

class SettingsViewModel : ViewModel()

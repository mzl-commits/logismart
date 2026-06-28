package com.tecsup.logismart_movil.ui.settings

import androidx.lifecycle.ViewModel

import com.tecsup.logismart_movil.data.local.UserPreferences
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

data class SettingsUiState(
    val userName: String = "Gisela Morales",
    val serverUrl: String = "http://10.0.2.2:8000/",
    val notificationsEnabled: Boolean = true,
    val darkModeEnabled: Boolean = false
)

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val userPreferences: UserPreferences
) : ViewModel()

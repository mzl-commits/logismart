package com.tecsup.logismart_movil.ui.settings

import android.content.Context
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tecsup.logismart_movil.data.local.UserPreferences
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import javax.inject.Inject

data class SettingsUiState(
    val userName: String = "Gisela Morales",
    val serverUrl: String = "https://logistica.promube.com/",
    val notificationsEnabled: Boolean = true,
    val darkModeEnabled: Boolean = false,
    val showPriorityWidget: Boolean = true,
    val localAiEnabled: Boolean = false,
    val localAiModelPath: String = "",
    val importingModel: Boolean = false,
    val message: String? = null,
)

private data class StoredSettings(
    val userName: String,
    val serverUrl: String,
    val notificationsEnabled: Boolean,
    val darkModeEnabled: Boolean,
    val showPriorityWidget: Boolean,
)

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val userPreferences: UserPreferences,
    @param:ApplicationContext private val context: Context,
) : ViewModel() {
    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            combine(
                userPreferences.userName,
                userPreferences.serverUrl,
                userPreferences.notificationsEnabled,
                userPreferences.darkModeEnabled,
                userPreferences.showPriorityWidget,
            ) { userName, serverUrl, notifications, darkMode, priority ->
                StoredSettings(userName, serverUrl, notifications, darkMode, priority)
            }.collect { stored ->
                _uiState.update {
                    it.copy(
                        userName = stored.userName,
                        serverUrl = stored.serverUrl,
                        notificationsEnabled = stored.notificationsEnabled,
                        darkModeEnabled = stored.darkModeEnabled,
                        showPriorityWidget = stored.showPriorityWidget,
                    )
                }
            }
        }
        viewModelScope.launch {
            combine(userPreferences.localAiEnabled, userPreferences.localAiModelPath) { enabled, path -> enabled to path }
                .collect { (enabled, path) ->
                    _uiState.update { it.copy(localAiEnabled = enabled, localAiModelPath = path) }
                }
        }
    }

    fun onUserNameChange(value: String) = _uiState.update { it.copy(userName = value, message = null) }
    fun onServerUrlChange(value: String) = _uiState.update { it.copy(serverUrl = value, message = null) }

    fun saveAccount() = viewModelScope.launch {
        userPreferences.saveUserName(_uiState.value.userName.trim())
        userPreferences.saveServerUrl(_uiState.value.serverUrl.trim())
        _uiState.update { it.copy(message = "Configuración guardada") }
    }

    fun setNotificationsEnabled(value: Boolean) = viewModelScope.launch { userPreferences.saveNotificationsEnabled(value) }
    fun setDarkModeEnabled(value: Boolean) = viewModelScope.launch { userPreferences.saveDarkModeEnabled(value) }
    fun setShowPriorityWidget(value: Boolean) = viewModelScope.launch { userPreferences.saveShowPriorityWidget(value) }
    fun setLocalAiEnabled(value: Boolean) = viewModelScope.launch { userPreferences.saveLocalAiEnabled(value) }

    fun importLocalAiModel(uri: Uri) {
        if (_uiState.value.importingModel) return
        viewModelScope.launch {
            _uiState.update { it.copy(importingModel = true, message = null) }
            val savedPath = withContext(Dispatchers.IO) {
                runCatching {
                    val modelDir = File(context.filesDir, "models").apply { mkdirs() }
                    val target = File(modelDir, "gemma3-1b.litertlm")
                    context.contentResolver.openInputStream(uri)?.use { input ->
                        target.outputStream().use { output -> input.copyTo(output) }
                    } ?: error("No se pudo abrir el modelo")
                    require(target.length() > 0) { "El archivo está vacío" }
                    target.absolutePath
                }.getOrNull()
            }
            if (savedPath != null) {
                userPreferences.saveLocalAiModelPath(savedPath)
                userPreferences.saveLocalAiEnabled(true)
                _uiState.update { it.copy(importingModel = false, message = "Modelo local importado") }
            } else {
                _uiState.update { it.copy(importingModel = false, message = "No se pudo importar el modelo") }
            }
        }
    }
}

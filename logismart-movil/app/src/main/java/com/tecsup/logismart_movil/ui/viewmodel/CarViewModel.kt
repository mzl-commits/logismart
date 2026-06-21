package com.tecsup.logismart_movil.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tecsup.logismart_movil.data.model.EstadoCarroDto
import com.tecsup.logismart_movil.data.model.RealTimeTelemetry
import com.tecsup.logismart_movil.di.NetworkModule
import com.tecsup.logismart_movil.domain.repository.CarRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class CarViewModel @Inject constructor(
    private val carRepository: CarRepository
) : ViewModel() {

    val connectionState: StateFlow<String> = carRepository.connectionState
    val telemetryFlow: StateFlow<RealTimeTelemetry> = carRepository.telemetryFlow

    private val _carState = MutableStateFlow<EstadoCarroDto?>(null)
    val carState: StateFlow<EstadoCarroDto?> = _carState.asStateFlow()

    private val _uiState = MutableStateFlow<CarUiState>(CarUiState.Idle)
    val uiState: StateFlow<CarUiState> = _uiState.asStateFlow()

    init {
        // Connect to WebSocket using DI Base URL
        carRepository.connectWebSocket(NetworkModule.DEFAULT_BASE_URL)
        
        // Listen to WebSocket updates
        viewModelScope.launch {
            carRepository.carStateFlow.collect { estado ->
                _carState.value = estado
            }
        }

        // Fetch initial state via REST immediately
        refreshState()
    }

    fun refreshState() {
        viewModelScope.launch {
            _uiState.value = CarUiState.Loading
            carRepository.refreshCarState()
                .onSuccess { estado ->
                    _carState.value = estado
                    _uiState.value = CarUiState.Success("Estado actualizado.")
                }
                .onFailure { error ->
                    _uiState.value = CarUiState.Error(error.message ?: "Error al obtener estado.")
                }
        }
    }

    fun moverCarro(destinoX: Int, destinoY: Int, cajaId: String?) {
        viewModelScope.launch {
            _uiState.value = CarUiState.Loading
            carRepository.moverCarro(destinoX, destinoY, cajaId)
                .onSuccess { success ->
                    if (success) {
                        _uiState.value = CarUiState.Success("Ruta generada hacia ($destinoX, $destinoY).")
                        refreshState()
                    } else {
                        _uiState.value = CarUiState.Error("No se pudo generar la ruta.")
                    }
                }
                .onFailure { error ->
                    _uiState.value = CarUiState.Error(error.message ?: "Error al mover el carro.")
                }
        }
    }

    fun confirmarParada(usuarioId: Int) {
        viewModelScope.launch {
            _uiState.value = CarUiState.Loading
            carRepository.confirmarParada(usuarioId)
                .onSuccess { success ->
                    if (success) {
                        _uiState.value = CarUiState.Success("Parada confirmada correctamente.")
                        refreshState()
                    } else {
                        _uiState.value = CarUiState.Error("Error al confirmar parada.")
                    }
                }
                .onFailure { error ->
                    _uiState.value = CarUiState.Error(error.message ?: "Error al conectar con la API.")
                }
        }
    }

    fun avanzar() {
        viewModelScope.launch {
            _uiState.value = CarUiState.Loading
            carRepository.avanzarCarro()
                .onSuccess { estado ->
                    _carState.value = estado
                    _uiState.value = CarUiState.Success("Carro avanzado un paso.")
                }
                .onFailure { error ->
                    _uiState.value = CarUiState.Error(error.message ?: "Error al avanzar carro.")
                }
        }
    }

    fun reset() {
        viewModelScope.launch {
            _uiState.value = CarUiState.Loading
            carRepository.resetCarro()
                .onSuccess { success ->
                    if (success) {
                        _uiState.value = CarUiState.Success("Carro reiniciado exitosamente.")
                        refreshState()
                    } else {
                        _uiState.value = CarUiState.Error("No se pudo reiniciar el carro.")
                    }
                }
                .onFailure { error ->
                    _uiState.value = CarUiState.Error(error.message ?: "Error al reiniciar carro.")
                }
        }
    }

    override fun onCleared() {
        super.onCleared()
        carRepository.disconnectWebSocket()
    }
}

sealed interface CarUiState {
    object Idle : CarUiState
    object Loading : CarUiState
    data class Success(val message: String) : CarUiState
    data class Error(val error: String) : CarUiState
}

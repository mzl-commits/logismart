package com.tecsup.logismart_movil.ui.history

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tecsup.logismart_movil.data.model.Trip
import com.tecsup.logismart_movil.data.repository.LogisticsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HistoryUiState(
    val loading: Boolean = true,
    val trips: List<Trip> = emptyList(),
    val filter: String = "",
    val errorMessage: String? = null,
)

@HiltViewModel
class HistoryViewModel @Inject constructor(
    private val repository: LogisticsRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(HistoryUiState())
    val uiState: StateFlow<HistoryUiState> = _uiState

    init {
        loadTrips()
    }

    fun loadTrips() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(loading = true)

            runCatching { repository.getTrips() }
                .onSuccess { trips ->
                    _uiState.value = _uiState.value.copy(
                        loading = false,
                        trips = trips,
                        errorMessage = null,
                    )
                }
                .onFailure {
                    _uiState.value = _uiState.value.copy(
                        loading = false,
                        trips = emptyList(),
                        errorMessage = "No se pudo sincronizar el historial. Verifica tu conexión e inténtalo nuevamente.",
                    )
                }
        }
    }

    fun updateFilter(value: String) {
        _uiState.value = _uiState.value.copy(filter = value)
    }
}

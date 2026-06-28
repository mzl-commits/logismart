package com.tecsup.logismart_movil.ui.history

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tecsup.logismart_movil.data.model.Trip
import com.tecsup.logismart_movil.data.repository.LogisticsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class TripDetailUiState(
    val loading: Boolean = true,
    val trip: Trip? = null
)

class TripDetailViewModel : ViewModel() {

    private val repository = LogisticsRepository()

    private val _uiState = MutableStateFlow(TripDetailUiState())
    val uiState: StateFlow<TripDetailUiState> = _uiState

    fun loadTrip(id: Int) {
        viewModelScope.launch {
            _uiState.value = TripDetailUiState(loading = true)

            val trip = repository.getTripById(id)

            _uiState.value = TripDetailUiState(
                loading = false,
                trip = trip
            )
        }
    }
}
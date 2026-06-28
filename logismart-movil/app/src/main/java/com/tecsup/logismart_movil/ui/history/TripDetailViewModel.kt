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

data class TripDetailUiState(
    val loading: Boolean = true,
    val trip: Trip? = null
)

@HiltViewModel
class TripDetailViewModel @Inject constructor(
    private val repository: LogisticsRepository
) : ViewModel() {

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
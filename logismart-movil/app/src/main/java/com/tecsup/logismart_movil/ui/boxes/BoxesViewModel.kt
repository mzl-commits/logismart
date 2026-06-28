package com.tecsup.logismart_movil.ui.boxes

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tecsup.logismart_movil.data.model.LogisticBox
import com.tecsup.logismart_movil.data.repository.LogisticsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class BoxesUiState(
    val loading: Boolean = true,
    val boxes: List<LogisticBox> = emptyList()
)

class BoxesViewModel : ViewModel() {

    private val repository = LogisticsRepository()

    private val _uiState = MutableStateFlow(BoxesUiState())
    val uiState: StateFlow<BoxesUiState> = _uiState

    init {
        loadBoxes()
    }

    fun loadBoxes() {
        viewModelScope.launch {
            _uiState.value = BoxesUiState(loading = true)

            val boxes = repository.getBoxes()

            _uiState.value = BoxesUiState(
                loading = false,
                boxes = boxes
            )
        }
    }
}
package com.tecsup.logismart_movil.ui.boxes

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tecsup.logismart_movil.data.model.LogisticBox
import com.tecsup.logismart_movil.data.repository.LogisticsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class BoxesUiState(
    val loading: Boolean = true,
    val allBoxes: List<LogisticBox> = emptyList(),
    val filteredBoxes: List<LogisticBox> = emptyList(),
    val selectedStatus: String = "Todas",
    val selectedCategory: String = "Todas cat.",
    val errorMessage: String? = null
)

@HiltViewModel
class BoxesViewModel @Inject constructor(
    private val repository: LogisticsRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(BoxesUiState())
    val uiState: StateFlow<BoxesUiState> = _uiState

    init {
        loadBoxes()
    }

    fun loadBoxes() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(loading = true, errorMessage = null)
            val boxes = repository.getBoxes()
            _uiState.value = _uiState.value.copy(
                loading = false,
                allBoxes = boxes
            )
            applyFilters()
        }
    }

    fun selectStatus(status: String) {
        _uiState.value = _uiState.value.copy(selectedStatus = status)
        applyFilters()
    }

    fun selectCategory(category: String) {
        _uiState.value = _uiState.value.copy(selectedCategory = category)
        applyFilters()
    }

    private fun applyFilters() {
        val state = _uiState.value
        var filtered = state.allBoxes

        if (state.selectedStatus != "Todas") {
            val statusToMatch = when (state.selectedStatus) {
                "Pendiente" -> "pendiente"
                "En tránsito" -> "en_transito"
                "Almacenada" -> "almacenada"
                else -> state.selectedStatus.lowercase()
            }
            filtered = filtered.filter { box ->
                val normalizedState = box.estado.lowercase().replace(" ", "_")
                normalizedState == statusToMatch
            }
        }

        if (state.selectedCategory != "Todas cat.") {
            val catToMatch = when (state.selectedCategory) {
                "Alimento" -> "alimento"
                "Electrónica" -> "electronica"
                "Herramienta" -> "herramienta"
                "Otro" -> "otro"
                "Químico" -> "quimico"
                "Textil" -> "textil"
                else -> state.selectedCategory.lowercase()
            }
            fun sanitize(s: String): String {
                return s.lowercase()
                    .replace("á", "a")
                    .replace("é", "e")
                    .replace("í", "i")
                    .replace("ó", "o")
                    .replace("ú", "u")
            }
            val sanitizedTarget = sanitize(catToMatch)
            filtered = filtered.filter { box ->
                sanitize(box.categoria) == sanitizedTarget
            }
        }

        _uiState.value = _uiState.value.copy(filteredBoxes = filtered)
    }
}
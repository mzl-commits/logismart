package com.tecsup.logismart_movil.ui.shelves

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tecsup.logismart_movil.data.remote.ShelvesApi
import com.tecsup.logismart_movil.domain.model.Shelf
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

import com.tecsup.logismart_movil.domain.model.Slot
import com.tecsup.logismart_movil.data.demo.DemoDataSource

data class ShelvesUiState(
    val isLoading: Boolean = false,
    val shelves: List<Shelf> = emptyList(),
    val errorMessage: String? = null
)

@HiltViewModel
class ShelvesViewModel @Inject constructor(
    private val shelvesApi: ShelvesApi
) : ViewModel() {

    private val _uiState = MutableStateFlow(
        ShelvesUiState(shelves = demoShelves())
    )
    val uiState: StateFlow<ShelvesUiState> = _uiState

    init {
        loadShelves()
    }

    fun loadShelves() {
        viewModelScope.launch {
            if (DemoDataSource.offlineMode) {
                _uiState.value = ShelvesUiState(shelves = demoShelves(), errorMessage = "Modo offline: datos locales")
                return@launch
            }
            _uiState.value = _uiState.value.copy(
                isLoading = true,
                errorMessage = null
            )

            try {
                val shelves = shelvesApi.getShelves().map { it.toDomain() }

                _uiState.value = ShelvesUiState(
                    isLoading = false,
                    shelves = shelves,
                    errorMessage = null
                )
            } catch (exception: Exception) {
                _uiState.value = ShelvesUiState(
                    isLoading = false,
                    shelves = demoShelves(),
                    errorMessage = "No se pudo conectar al backend. Se muestran datos de prueba."
                )
            }
        }
    }

    private fun demoShelves(): List<Shelf> {
        val mockSlots = listOf(
            Slot(1, 3, "adelante", 1, true, "Caja Electrónica"),
            Slot(2, 3, "adelante", 2, false, null),
            Slot(3, 2, "adelante", 1, true, "Caja Textil"),
            Slot(4, 2, "adelante", 2, true, "Caja Alimentos"),
            Slot(5, 1, "adelante", 1, false, null),
            Slot(6, 1, "adelante", 2, false, null),
            Slot(7, 3, "posterior", 1, true, "Herramientas"),
            Slot(8, 3, "posterior", 2, true, "Caja Química"),
        )
        return listOf(
            Shelf(1, "Estante A-01", 12, 5, 18, 72, "Ocupado", "General", mockSlots),
            Shelf(2, "Estante B-02", 12, 3, 9, 43, "Disponible", "General", mockSlots),
            Shelf(3, "Estante C-03", 12, 8, 27, 90, "Lleno", "General", mockSlots),
            Shelf(4, "Estante D-04", 12, 2, 5, 21, "Disponible", "General", mockSlots)
        )
    }
}

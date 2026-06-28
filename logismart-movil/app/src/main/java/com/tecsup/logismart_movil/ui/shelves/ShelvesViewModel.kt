package com.tecsup.logismart_movil.ui.shelves

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tecsup.logismart_movil.data.remote.ShelvesRemoteDataSource
import com.tecsup.logismart_movil.domain.model.Shelf
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class ShelvesUiState(
    val isLoading: Boolean = false,
    val shelves: List<Shelf> = emptyList(),
    val errorMessage: String? = null
)

class ShelvesViewModel : ViewModel() {

    private val remoteDataSource = ShelvesRemoteDataSource()

    private val _uiState = MutableStateFlow(
        ShelvesUiState(shelves = demoShelves())
    )
    val uiState: StateFlow<ShelvesUiState> = _uiState

    init {
        loadShelves()
    }

    fun loadShelves() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isLoading = true,
                errorMessage = null
            )

            try {
                val shelves = remoteDataSource.getShelves()

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
        return listOf(
            Shelf(1, "Estante A-01", 100, 72, 18),
            Shelf(2, "Estante B-02", 80, 35, 9),
            Shelf(3, "Estante C-03", 120, 108, 27),
            Shelf(4, "Estante D-04", 60, 21, 5)
        )
    }
}

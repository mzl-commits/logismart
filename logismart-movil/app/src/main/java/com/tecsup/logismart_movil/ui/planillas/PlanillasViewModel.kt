package com.tecsup.logismart_movil.ui.planillas

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tecsup.logismart_movil.data.model.ApiResult
import com.tecsup.logismart_movil.data.remote.PlanillaDto
import com.tecsup.logismart_movil.data.repository.PlanillaRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PlanillasUiState(
    val planillas: List<PlanillaDto> = emptyList(),
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val errorMessage: String? = null,
)

@HiltViewModel
class PlanillasViewModel @Inject constructor(
    private val repository: PlanillaRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(PlanillasUiState())
    val uiState: StateFlow<PlanillasUiState> = _uiState.asStateFlow()

    init {
        loadPlanillas()
    }

    fun loadPlanillas() {
        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoading = it.planillas.isEmpty(),
                    isRefreshing = it.planillas.isNotEmpty(),
                    errorMessage = null,
                )
            }
            when (val result = repository.getPlanillas()) {
                is ApiResult.Success -> {
                    _uiState.value = PlanillasUiState(
                        planillas = result.data,
                        isLoading = false,
                        isRefreshing = false,
                    )
                }
                is ApiResult.Error -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            isRefreshing = false,
                            errorMessage = result.message,
                        )
                    }
                }
                ApiResult.Unauthorized -> {
                    // Handled globally
                }
            }
        }
    }
}

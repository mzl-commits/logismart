package com.tecsup.logismart_movil.ui.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tecsup.logismart_movil.data.model.ApiResult
import com.tecsup.logismart_movil.data.repository.DashboardRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val repository: DashboardRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoading = it.summary.quickActions.isEmpty(),
                    isRefreshing = it.summary.quickActions.isNotEmpty(),
                    errorMessage = null,
                )
            }
            when (val result = repository.loadDashboard()) {
                is ApiResult.Success -> _uiState.value = DashboardUiState(
                    summary = result.data,
                    isLoading = false,
                )
                is ApiResult.Error -> _uiState.update {
                    it.copy(
                        isLoading = false,
                        isRefreshing = false,
                        errorMessage = result.message,
                    )
                }
                ApiResult.Unauthorized -> {
                    // Handled globally by the SessionInterceptor
                }
            }
        }
    }
}

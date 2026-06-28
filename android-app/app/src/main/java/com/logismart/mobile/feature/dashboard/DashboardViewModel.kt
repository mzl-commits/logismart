package com.logismart.mobile.feature.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.logismart.mobile.core.network.ApiResult
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class DashboardViewModel(
    private val repository: DashboardRepository,
    private val onUnauthorized: suspend () -> Unit,
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
                ApiResult.Unauthorized -> onUnauthorized()
            }
        }
    }

    companion object {
        fun factory(
            repository: DashboardRepository,
            onUnauthorized: suspend () -> Unit,
        ) = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T =
                DashboardViewModel(repository, onUnauthorized) as T
        }
    }
}

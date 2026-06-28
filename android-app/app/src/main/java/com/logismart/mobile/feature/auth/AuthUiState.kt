package com.logismart.mobile.feature.auth

data class AuthUiState(
    val username: String = "",
    val password: String = "",
    val usernameError: String? = null,
    val passwordError: String? = null,
    val errorMessage: String? = null,
    val isLoading: Boolean = false,
    val isAuthenticated: Boolean = false,
)

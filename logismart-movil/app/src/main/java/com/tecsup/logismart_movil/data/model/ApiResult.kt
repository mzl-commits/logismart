package com.tecsup.logismart_movil.data.model

sealed interface ApiResult<out T> {
    data class Success<T>(val data: T) : ApiResult<T>
    data class Error(val message: String) : ApiResult<Nothing>
    data object Unauthorized : ApiResult<Nothing>
}

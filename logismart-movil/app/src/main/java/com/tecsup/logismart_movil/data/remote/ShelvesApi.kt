package com.tecsup.logismart_movil.data.remote

import com.tecsup.logismart_movil.data.remote.dto.ShelfDto
import retrofit2.http.GET

interface ShelvesApi {
    @GET("api/estantes/")
    suspend fun getShelves(): List<ShelfDto>
}

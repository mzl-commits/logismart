package com.tecsup.logismart_movil.data.remote

import com.tecsup.logismart_movil.data.remote.dto.ShelfDto
import retrofit2.http.GET
import retrofit2.http.Header

interface ShelvesApi {
    @GET("api/mobile/estantes/")
    suspend fun getShelves(): List<ShelfDto>
}

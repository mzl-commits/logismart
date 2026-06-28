package com.tecsup.logismart_movil.data.remote

import com.tecsup.logismart_movil.domain.model.Shelf
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class ShelvesRemoteDataSource(
    private val baseUrl: String = "https://logistica.promube.com/"
) {
    private val api: ShelvesApi = Retrofit.Builder()
        .baseUrl(baseUrl)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
        .create(ShelvesApi::class.java)

    suspend fun getShelves(): List<Shelf> {
        return api.getShelves().map { it.toDomain() }
    }
}

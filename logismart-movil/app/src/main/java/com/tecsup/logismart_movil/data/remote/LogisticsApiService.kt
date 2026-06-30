package com.tecsup.logismart_movil.data.remote

import com.tecsup.logismart_movil.data.model.CajaDto
import com.tecsup.logismart_movil.data.model.DespachoDto
import com.tecsup.logismart_movil.data.remote.PaginatedResponse
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.GET

interface LogisticsApiService {

    @GET("api/despachos/")
    suspend fun getDespachos(): PaginatedResponse<DespachoDto>

    @GET("api/cajas/")
    suspend fun getCajas(): List<CajaDto>
}

object LogisticsApiClient {

    /*
     * 10.0.2.2 se usa cuando pruebas desde el emulador Android
     * y el backend Django está corriendo en tu propia computadora.
     */
    private const val BASE_URL = "https://logistica.promube.com/"

    val service: LogisticsApiService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(LogisticsApiService::class.java)
    }
}

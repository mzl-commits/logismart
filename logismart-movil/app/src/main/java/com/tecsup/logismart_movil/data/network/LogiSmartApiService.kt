package com.tecsup.logismart_movil.data.network

import com.tecsup.logismart_movil.data.model.*
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface LogiSmartApiService {

    @GET("carro/")
    suspend fun getEstadoCarro(): EstadoCarroDto

    @POST("carro/mover/")
    suspend fun moverCarro(
        @Body request: MoverCarroRequest
    ): MoverCarroResponse

    @POST("carro/confirmar_parada/")
    suspend fun confirmarParada(
        @Body request: ConfirmarParadaRequest
    ): ConfirmarParadaResponse

    @POST("carro/avanzar/")
    suspend fun avanzarCarro(): EstadoCarroDto

    @POST("carro/reset/")
    suspend fun resetCarro(): ResetCarroResponse
}

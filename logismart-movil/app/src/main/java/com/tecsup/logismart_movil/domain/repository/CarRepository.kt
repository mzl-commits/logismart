package com.tecsup.logismart_movil.domain.repository

import com.tecsup.logismart_movil.data.model.EstadoCarroDto
import com.tecsup.logismart_movil.data.model.RealTimeTelemetry
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.StateFlow

interface CarRepository {
    val connectionState: StateFlow<String>
    val telemetryFlow: StateFlow<RealTimeTelemetry>
    val carStateFlow: Flow<EstadoCarroDto>

    fun connectWebSocket(baseUrl: String)
    fun disconnectWebSocket()

    suspend fun refreshCarState(): Result<EstadoCarroDto>
    suspend fun moverCarro(destinoX: Int, destinoY: Int, cajaId: String?): Result<Boolean>
    suspend fun confirmarParada(usuarioId: Int): Result<Boolean>
    suspend fun avanzarCarro(): Result<EstadoCarroDto>
    suspend fun resetCarro(): Result<Boolean>
}

package com.tecsup.logismart_movil.data.repository

import com.tecsup.logismart_movil.data.model.*
import com.tecsup.logismart_movil.data.network.LogiSmartApiService
import com.tecsup.logismart_movil.data.websocket.CarWebSocketManager
import com.tecsup.logismart_movil.domain.repository.CarRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.StateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CarRepositoryImpl @Inject constructor(
    private val apiService: LogiSmartApiService,
    private val webSocketManager: CarWebSocketManager
) : CarRepository {

    override val connectionState: StateFlow<String> = webSocketManager.connectionState
    override val telemetryFlow: StateFlow<RealTimeTelemetry> = webSocketManager.telemetryFlow
    override val carStateFlow: Flow<EstadoCarroDto> = webSocketManager.carStateFlow

    override fun connectWebSocket(baseUrl: String) {
        webSocketManager.connect(baseUrl)
    }

    override fun disconnectWebSocket() {
        webSocketManager.disconnect()
    }

    override suspend fun refreshCarState(): Result<EstadoCarroDto> = runCatching {
        apiService.getEstadoCarro()
    }

    override suspend fun moverCarro(destinoX: Int, destinoY: Int, cajaId: String?): Result<Boolean> = runCatching {
        val request = MoverCarroRequest(destinoX, destinoY, cajaId)
        val response = apiService.moverCarro(request)
        response.mensaje.contains("generada", ignoreCase = true) || response.ruta.isNotEmpty()
    }

    override suspend fun confirmarParada(usuarioId: Int): Result<Boolean> = runCatching {
        val request = ConfirmarParadaRequest(usuarioId)
        val response = apiService.confirmarParada(request)
        response.mensaje.isNotEmpty()
    }

    override suspend fun avanzarCarro(): Result<EstadoCarroDto> = runCatching {
        apiService.avanzarCarro()
    }

    override suspend fun resetCarro(): Result<Boolean> = runCatching {
        val response = apiService.resetCarro()
        response.mensaje.contains("reiniciado", ignoreCase = true)
    }
}

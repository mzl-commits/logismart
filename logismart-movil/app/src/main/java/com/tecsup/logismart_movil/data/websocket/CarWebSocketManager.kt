package com.tecsup.logismart_movil.data.websocket

import android.util.Log
import com.google.gson.Gson
import com.tecsup.logismart_movil.data.model.EstadoCarroDto
import com.tecsup.logismart_movil.data.model.RealTimeTelemetry
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import okhttp3.*
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.random.Random

@Singleton
class CarWebSocketManager @Inject constructor(
    private val client: OkHttpClient,
    private val gson: Gson
) {
    private val _carStateFlow = MutableSharedFlow<EstadoCarroDto>(replay = 1)
    val carStateFlow: SharedFlow<EstadoCarroDto> = _carStateFlow

    private val _telemetryFlow = MutableStateFlow(RealTimeTelemetry(0.0, 32.5, 95, -65))
    val telemetryFlow: StateFlow<RealTimeTelemetry> = _telemetryFlow

    private val _connectionState = MutableStateFlow("Desconectado")
    val connectionState: StateFlow<String> = _connectionState

    private var webSocket: WebSocket? = null
    private var simulationJob: Job? = null
    private var reconnectJob: Job? = null
    private val coroutineScope = CoroutineScope(Dispatchers.Default + SupervisorJob())
    private var currentUrl: String = ""

    fun connect(baseUrl: String) {
        coroutineScope.launch {
            val wsUrl = baseUrl.replace("http://", "ws://")
                .replace("https://", "wss://")
                .replace("/api/", "/ws/carro/")
                .replace("/api", "/ws/carro/")
                
            val finalUrl = if (wsUrl.endsWith("/ws/carro/")) wsUrl else "${wsUrl.removeSuffix("/")}/ws/carro/"
            
            if (currentUrl == finalUrl && _connectionState.value == "Conectado") {
                return@launch
            }
            currentUrl = finalUrl
            disconnectInternal()
            connectInternal()
        }
    }

    private fun connectInternal() {
        _connectionState.value = "Conectando..."
        Log.i("CarWebSocketManager", "Connecting to WebSocket: $currentUrl")
        
        val request = Request.Builder().url(currentUrl).build()
        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                Log.i("CarWebSocketManager", "WebSocket Connected!")
                _connectionState.value = "Conectado"
                stopSimulation()
                startLiveTelemetrySimulation(isSimulated = false)
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                try {
                    val json = gson.fromJson(text, Map::class.java)
                    val type = json["type"] as? String
                    val dataJson = gson.toJson(json["data"])
                    if (type == "initial_state" || type == "state_update") {
                        val estado = gson.fromJson(dataJson, EstadoCarroDto::class.java)
                        coroutineScope.launch {
                            _carStateFlow.emit(estado)
                            updateTelemetryFromState(estado)
                        }
                    }
                } catch (e: Exception) {
                    Log.e("CarWebSocketManager", "Error parsing websocket message: ${e.message}")
                }
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                Log.i("CarWebSocketManager", "WebSocket Closed: $reason")
                handleDisconnect()
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.e("CarWebSocketManager", "WebSocket Failure: ${t.message}")
                handleDisconnect()
            }
        })
    }

    private fun handleDisconnect() {
        _connectionState.value = "Fallback (Simulado)"
        startSimulation()
        
        reconnectJob?.cancel()
        reconnectJob = coroutineScope.launch {
            delay(5000)
            Log.i("CarWebSocketManager", "Attempting automatic reconnection...")
            connectInternal()
        }
    }

    private fun updateTelemetryFromState(state: EstadoCarroDto) {
        val isMoving = state.estado == "moviendo" || state.estado == "regresando"
        val targetSpeed = if (isMoving) Random.nextDouble(1.2, 1.8) else 0.0
        val currentTemp = _telemetryFlow.value.temperatura
        val nextTemp = if (isMoving) {
            (currentTemp + Random.nextDouble(0.1, 0.3)).coerceAtMost(45.0)
        } else {
            (currentTemp - Random.nextDouble(0.1, 0.2)).coerceAtLeast(32.0)
        }
        val currentBat = _telemetryFlow.value.bateria
        val nextBat = if (isMoving && Random.nextFloat() < 0.05f) {
            (currentBat - 1).coerceAtLeast(5)
        } else currentBat
        
        _telemetryFlow.value = RealTimeTelemetry(
            velocidad = targetSpeed,
            temperatura = nextTemp,
            bateria = nextBat,
            senal = Random.nextInt(-75, -55),
            isSimulated = false
        )
    }

    private fun startSimulation() {
        if (simulationJob?.isActive == true) return
        simulationJob = coroutineScope.launch {
            while (isActive) {
                val currentTelemetry = _telemetryFlow.value
                val isMoving = currentTelemetry.velocidad > 0.0 || Random.nextFloat() < 0.2
                
                val speed = if (isMoving) {
                    if (currentTelemetry.velocidad == 0.0) Random.nextDouble(1.0, 1.4)
                    else (currentTelemetry.velocidad + Random.nextDouble(-0.1, 0.1)).coerceIn(1.0, 1.8)
                } else {
                    0.0
                }
                
                val temp = if (isMoving) {
                    (currentTelemetry.temperatura + Random.nextDouble(0.05, 0.15)).coerceAtMost(48.0)
                } else {
                    (currentTelemetry.temperatura - Random.nextDouble(0.05, 0.1)).coerceAtLeast(31.5)
                }
                
                val bat = if (isMoving && Random.nextFloat() < 0.02f) {
                    (currentTelemetry.bateria - 1).coerceAtLeast(5)
                } else {
                    currentTelemetry.bateria
                }
                
                _telemetryFlow.value = RealTimeTelemetry(
                    velocidad = Math.round(speed * 10.0) / 10.0,
                    temperatura = Math.round(temp * 10.0) / 10.0,
                    bateria = bat,
                    senal = Random.nextInt(-80, -50),
                    isSimulated = true
                )
                delay(1000)
            }
        }
    }

    private fun stopSimulation() {
        simulationJob?.cancel()
        simulationJob = null
    }

    private fun startLiveTelemetrySimulation(isSimulated: Boolean) {
        // Keeps emitting subtle fluctuations even when connected
        coroutineScope.launch {
            while (connectionState.value == "Conectado") {
                val currentTelemetry = _telemetryFlow.value
                val isMoving = currentTelemetry.velocidad > 0.0
                val speed = if (isMoving) {
                    (currentTelemetry.velocidad + Random.nextDouble(-0.05, 0.05)).coerceIn(1.1, 1.7)
                } else {
                    0.0
                }
                val temp = if (isMoving) {
                    (currentTelemetry.temperatura + Random.nextDouble(0.02, 0.05)).coerceAtMost(46.0)
                } else {
                    (currentTelemetry.temperatura - Random.nextDouble(0.02, 0.05)).coerceAtLeast(32.0)
                }
                _telemetryFlow.value = RealTimeTelemetry(
                    velocidad = Math.round(speed * 10.0) / 10.0,
                    temperatura = Math.round(temp * 10.0) / 10.0,
                    bateria = currentTelemetry.bateria,
                    senal = Random.nextInt(-72, -58),
                    isSimulated = isSimulated
                )
                delay(1000)
            }
        }
    }

    private fun disconnectInternal() {
        reconnectJob?.cancel()
        webSocket?.close(1000, "App disconnected")
        webSocket = null
        stopSimulation()
    }

    fun disconnect() {
        coroutineScope.launch {
            disconnectInternal()
            _connectionState.value = "Desconectado"
        }
    }
}

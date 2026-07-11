package com.tecsup.logismart_movil.data.repository

import com.tecsup.logismart_movil.data.model.CajaDto
import com.tecsup.logismart_movil.data.model.DespachoDto
import com.tecsup.logismart_movil.data.model.LogisticBox
import com.tecsup.logismart_movil.data.model.Trip
import com.tecsup.logismart_movil.data.remote.LogisticsApiService
import com.tecsup.logismart_movil.data.demo.DemoDataSource

class LogisticsRepository(
    private val api: LogisticsApiService,
    private val logiSmartApi: com.tecsup.logismart_movil.data.remote.LogiSmartApi
) {

    suspend fun getTrips(): List<Trip> {
        if (DemoDataSource.offlineMode) return DemoDataSource.trips()
        return runCatching { api.getDespachos().results.map { it.toTrip() } }
            .getOrElse { DemoDataSource.trips() }
    }

    suspend fun getTripById(id: Int): Trip? {
        return getTrips().firstOrNull { trip ->
            trip.id == id
        }
    }

    suspend fun getBoxes(): List<LogisticBox> {
        if (DemoDataSource.offlineMode) return DemoDataSource.boxes()
        return runCatching {
            val response = logiSmartApi.getCajas()
            if (response.isSuccessful && response.body() != null) {
                response.body()!!.results.map { it.toLogisticBox() }
            } else {
                throw Exception("Error al cargar cajas de producción")
            }
        }.getOrElse {
            DemoDataSource.boxes()
        }
    }

    private fun DespachoDto.toTrip(): Trip {
        return Trip(
            id = idDespacho ?: 0,
            fecha = fechaSalida?.take(10) ?: "Sin fecha",
            origen = "Almacén principal",
            destino = destino ?: "Sin destino",
            estado = "Completado",
            ruta = "Base AGV → Estante → Zona de despacho",
            tiempo = "15 min",
            cargaTransportada = idCaja ?: "Caja no registrada",
            transporte = transportePlaca ?: "Sin placa"
        )
    }

    private fun CajaDto.toLogisticBox(): LogisticBox {
        return LogisticBox(
            id = id ?: "SIN-ID",
            producto = producto ?: "Producto sin nombre",
            cantidad = cantidad ?: 0,
            pesoKg = pesoKg ?: "0.00",
            categoria = categoria ?: "Sin categoría",
            estado = estado ?: "Pendiente",
            ubicacion = if (!ubicacionNombre.isNullOrBlank()) ubicacionNombre else (idUbicacion?.let { "Ubicación $it" } ?: "Sin ubicación"),
            carroAsignado = if (estado == "en_transito") "AGV principal" else "Sin asignar",
            esFragil = esFragil ?: false
        )
    }

    suspend fun getUsuarios(): List<com.tecsup.logismart_movil.data.remote.UsuarioDto> {
        if (DemoDataSource.offlineMode) return DemoDataSource.users()
        return runCatching {
            val response = logiSmartApi.getUsuarios()
            if (response.isSuccessful && response.body() != null) {
                response.body()!!.results
            } else emptyList()
        }.getOrElse { DemoDataSource.users() }
    }

    suspend fun getVehiculos(): List<com.tecsup.logismart_movil.data.remote.VehiculoDto> {
        if (DemoDataSource.offlineMode) return DemoDataSource.vehicles()
        return runCatching {
            val response = logiSmartApi.getVehiculos()
            if (response.isSuccessful && response.body() != null) {
                response.body()!!.results
            } else emptyList()
        }.getOrElse { DemoDataSource.vehicles() }
    }

    suspend fun getDestinos(): List<com.tecsup.logismart_movil.data.remote.DestinoDto> {
        if (DemoDataSource.offlineMode) return DemoDataSource.destinations()
        return runCatching {
            val response = logiSmartApi.getDestinos()
            if (response.isSuccessful && response.body() != null) {
                response.body()!!.results
            } else emptyList()
        }.getOrElse { DemoDataSource.destinations() }
    }

    suspend fun procesarCaja(id: String, userId: Int? = null): Boolean {
        if (DemoDataSource.offlineMode) return DemoDataSource.updateBox(id, "en_transito")
        return runCatching {
            val response = logiSmartApi.procesarCaja(id, com.tecsup.logismart_movil.data.remote.UserActionRequest(userId))
            response.isSuccessful
        }.getOrElse { DemoDataSource.updateBox(id, "en_transito") }
    }

    suspend fun confirmarAlmacenada(id: String, userId: Int? = null): Boolean {
        if (DemoDataSource.offlineMode) return DemoDataSource.updateBox(id, "almacenada")
        return runCatching {
            val response = logiSmartApi.confirmarAlmacenada(id, com.tecsup.logismart_movil.data.remote.UserActionRequest(userId))
            response.isSuccessful
        }.getOrElse { DemoDataSource.updateBox(id, "almacenada") }
    }

    suspend fun confirmarDespacho(id: String, userId: Int? = null, placa: String, destino: String): Boolean {
        if (DemoDataSource.offlineMode) return DemoDataSource.updateBox(id, "despachada")
        return runCatching {
            val response = logiSmartApi.confirmarDespacho(id, com.tecsup.logismart_movil.data.remote.DespachoRequest(userId, placa, destino))
            response.isSuccessful
        }.getOrElse { DemoDataSource.updateBox(id, "despachada") }
    }
}

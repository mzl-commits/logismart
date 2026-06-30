package com.tecsup.logismart_movil.data.repository

import com.tecsup.logismart_movil.data.model.CajaDto
import com.tecsup.logismart_movil.data.model.DespachoDto
import com.tecsup.logismart_movil.data.model.LogisticBox
import com.tecsup.logismart_movil.data.model.Trip
import com.tecsup.logismart_movil.data.remote.LogisticsApiService

class LogisticsRepository(
    private val api: LogisticsApiService,
    private val logiSmartApi: com.tecsup.logismart_movil.data.remote.LogiSmartApi
) {

    suspend fun getTrips(): List<Trip> {
        return api.getDespachos().results.map { despacho ->
            despacho.toTrip()
        }
    }

    suspend fun getTripById(id: Int): Trip? {
        return getTrips().firstOrNull { trip ->
            trip.id == id
        }
    }

    suspend fun getBoxes(): List<LogisticBox> {
        return runCatching {
            val response = logiSmartApi.getCajas()
            if (response.isSuccessful && response.body() != null) {
                response.body()!!.results.map { it.toLogisticBox() }
            } else {
                throw Exception("Error al cargar cajas de producción")
            }
        }.getOrElse {
            sampleBoxes()
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

    private fun sampleBoxes(): List<LogisticBox> {
        return listOf(
            LogisticBox(
                id = "CX-001",
                producto = "Componentes electrónicos",
                cantidad = 3,
                pesoKg = "8.50",
                categoria = "Electrónica",
                estado = "Almacenada",
                ubicacion = "Estante A1",
                carroAsignado = "Sin asignar",
                esFragil = true
            ),
            LogisticBox(
                id = "CX-002",
                producto = "Herramientas",
                cantidad = 5,
                pesoKg = "12.00",
                categoria = "Herramientas",
                estado = "En tránsito",
                ubicacion = "Estante B2",
                carroAsignado = "AGV principal",
                esFragil = false
            ),
            LogisticBox(
                id = "CX-003",
                producto = "Material de oficina",
                cantidad = 10,
                pesoKg = "6.25",
                categoria = "Oficina",
                estado = "Pendiente",
                ubicacion = "Sin ubicación",
                carroAsignado = "Sin asignar",
                esFragil = false
            )
        )
    }

    suspend fun getUsuarios(): List<com.tecsup.logismart_movil.data.remote.UsuarioDto> {
        return runCatching {
            val response = logiSmartApi.getUsuarios()
            if (response.isSuccessful && response.body() != null) {
                response.body()!!.results
            } else emptyList()
        }.getOrElse { emptyList() }
    }

    suspend fun getVehiculos(): List<com.tecsup.logismart_movil.data.remote.VehiculoDto> {
        return runCatching {
            val response = logiSmartApi.getVehiculos()
            if (response.isSuccessful && response.body() != null) {
                response.body()!!.results
            } else emptyList()
        }.getOrElse { emptyList() }
    }

    suspend fun getDestinos(): List<com.tecsup.logismart_movil.data.remote.DestinoDto> {
        return runCatching {
            val response = logiSmartApi.getDestinos()
            if (response.isSuccessful && response.body() != null) {
                response.body()!!.results
            } else emptyList()
        }.getOrElse { emptyList() }
    }

    suspend fun procesarCaja(id: String, userId: Int? = null): Boolean {
        return runCatching {
            val response = logiSmartApi.procesarCaja(id, com.tecsup.logismart_movil.data.remote.UserActionRequest(userId))
            response.isSuccessful
        }.getOrElse { false }
    }

    suspend fun confirmarAlmacenada(id: String, userId: Int? = null): Boolean {
        return runCatching {
            val response = logiSmartApi.confirmarAlmacenada(id, com.tecsup.logismart_movil.data.remote.UserActionRequest(userId))
            response.isSuccessful
        }.getOrElse { false }
    }

    suspend fun confirmarDespacho(id: String, userId: Int? = null, placa: String, destino: String): Boolean {
        return runCatching {
            val response = logiSmartApi.confirmarDespacho(id, com.tecsup.logismart_movil.data.remote.DespachoRequest(userId, placa, destino))
            response.isSuccessful
        }.getOrElse { false }
    }
}

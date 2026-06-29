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
        return runCatching {
            api.getDespachos().map { despacho ->
                despacho.toTrip()
            }
        }.getOrElse {
            sampleTrips()
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
                response.body()!!.map { it.toLogisticBox() }
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
            ubicacion = idUbicacion?.let { "Ubicación $it" } ?: "Sin ubicación",
            carroAsignado = if (estado == "en_transito") "AGV principal" else "Sin asignar",
            esFragil = esFragil ?: false
        )
    }

    private fun sampleTrips(): List<Trip> {
        return listOf(
            Trip(
                id = 1,
                fecha = "2026-06-26",
                origen = "Almacén principal",
                destino = "Zona de despacho A",
                estado = "Completado",
                ruta = "Base AGV → Estante A1 → Despacho A",
                tiempo = "12 min",
                cargaTransportada = "Caja CX-001",
                transporte = "AGV-01"
            ),
            Trip(
                id = 2,
                fecha = "2026-06-25",
                origen = "Almacén principal",
                destino = "Zona de despacho B",
                estado = "En tránsito",
                ruta = "Base AGV → Estante B2 → Despacho B",
                tiempo = "18 min",
                cargaTransportada = "Caja CX-002",
                transporte = "AGV-01"
            ),
            Trip(
                id = 3,
                fecha = "2026-06-24",
                origen = "Almacén secundario",
                destino = "Zona de carga",
                estado = "Finalizado",
                ruta = "Base AGV → Estante C3 → Zona de carga",
                tiempo = "10 min",
                cargaTransportada = "Caja CX-003",
                transporte = "AGV-02"
            )
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
}
package com.tecsup.logismart_movil.data.demo

import com.tecsup.logismart_movil.data.model.LogisticBox
import com.tecsup.logismart_movil.data.model.Trip
import com.tecsup.logismart_movil.data.remote.BoxDto
import com.tecsup.logismart_movil.data.remote.DestinoDto
import com.tecsup.logismart_movil.data.remote.PlanillaDto
import com.tecsup.logismart_movil.data.remote.VehiculoDto
import com.tecsup.logismart_movil.data.remote.UsuarioDto
import com.tecsup.logismart_movil.ui.dashboard.DashboardSummary

object DemoDataSource {
    @Volatile var offlineMode: Boolean = false
    private val completedPlanillas = mutableSetOf(20)
    private val boxes = mutableListOf(
        LogisticBox("CAJ-20260630-001", "Sensores industriales", 6, "8.50", "Electrónica", "pendiente", "Sin ubicación", true),
        LogisticBox("CAJ-20260630-002", "Herramientas de precisión", 4, "14.20", "Herramienta", "en_transito", "A1-N2-P1", false),
        LogisticBox("CAJ-20260630-003", "Uniformes operativos", 20, "11.00", "Textil", "almacenada", "B1-N1-P2", false),
        LogisticBox("CAJ-20260630-004", "Reactivos sellados", 2, "5.40", "Químico", "almacenada", "Q1-N1-P1", true),
    )

    fun boxes(): List<LogisticBox> = boxes.toList()

    fun updateBox(id: String, state: String): Boolean {
        val index = boxes.indexOfFirst { it.id == id }
        if (index < 0) return false
        val current = boxes[index]
        boxes[index] = current.copy(
            estado = state,
            ubicacion = if (state == "almacenada" && current.ubicacion == "Sin ubicación") "A2-N1-P1" else current.ubicacion,
        )
        return true
    }

    fun dashboard(isAdmin: Boolean = false) = DashboardSummary(
        pendingBoxes = boxes.count { it.estado == "pendiente" },
        completedDispatches = 3,
        planillasCount = 2,
        completedPlanillas = 1,
        isAdmin = isAdmin,
        quickActions = listOf("boxes", "shelves", "history"),
    )

    fun trips(): List<Trip> = listOf(
        Trip(104, "2026-06-30", "Almacén principal", "Centro de distribución Lima", "Completado", "Almacén → Pasillo A → Despacho", "14 min", "CAJ-20260629-008", "LOG-001"),
        Trip(103, "2026-06-29", "Almacén principal", "Sucursal San Isidro", "Completado", "Almacén → Pasillo B → Despacho", "18 min", "CAJ-20260629-004", "LOG-001"),
        Trip(102, "2026-06-28", "Almacén principal", "Tienda Miraflores", "Completado", "Almacén → Zona química → Despacho", "12 min", "CAJ-20260628-011", "LOG-002"),
    )

    fun planillas(): List<PlanillaDto> = listOf(
        PlanillaDto(21, "2026-06-30", 2, 1, "Operador Demo", 21 in completedPlanillas, if (21 in completedPlanillas) "2026-06-30 18:00" else null, 21 !in completedPlanillas, "", boxes.take(2).map { it.toDto() }),
        PlanillaDto(20, "2026-06-29", 2, 1, "Operador Demo", true, "2026-06-29 17:40", false, "", boxes.drop(2).take(2).map { it.toDto() }),
    )

    fun completePlanilla(id: Int): Boolean = completedPlanillas.add(id) || id in completedPlanillas

    fun vehicles() = listOf(VehiculoDto("ABC-123", "Toyota"), VehiculoDto("LOG-001", "Camión LogiSmart"))
    fun users() = listOf(UsuarioDto(1, "Operador Demo", "operador"), UsuarioDto(2, "Administrador Demo", "admin"))
    fun destinations() = listOf(
        DestinoDto(1, "Centro de distribución Lima", "Av. Industrial 450"),
        DestinoDto(2, "Sucursal San Isidro", "Av. Javier Prado 1200"),
    )

    private fun LogisticBox.toDto() = BoxDto(id, producto, estado, "media", categoria, ubicacion)
}

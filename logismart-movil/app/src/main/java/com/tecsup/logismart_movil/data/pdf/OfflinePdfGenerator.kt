package com.tecsup.logismart_movil.data.pdf

import android.content.Context
import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.pdf.PdfDocument
import com.tecsup.logismart_movil.data.demo.DemoDataSource
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class OfflinePdfGenerator @Inject constructor(
    @param:ApplicationContext private val context: Context,
) {
    suspend fun generate(cajaIds: Set<String>): Result<File> = withContext(Dispatchers.IO) {
        runCatching {
            val boxes = DemoDataSource.boxes().filter { it.id in cajaIds }
            val document = PdfDocument()
            val pageInfo = PdfDocument.PageInfo.Builder(595, 842, 1).create()
            val page = document.startPage(pageInfo)
            val canvas = page.canvas
            val title = Paint().apply { color = android.graphics.Color.rgb(15, 82, 105); textSize = 22f; typeface = Typeface.DEFAULT_BOLD }
            val heading = Paint().apply { color = android.graphics.Color.rgb(20, 32, 48); textSize = 14f; typeface = Typeface.DEFAULT_BOLD }
            val body = Paint().apply { color = android.graphics.Color.rgb(51, 65, 85); textSize = 11f }
            canvas.drawColor(android.graphics.Color.WHITE)
            canvas.drawText("LogiSmart · Guía offline", 42f, 62f, title)
            canvas.drawText("Datos disponibles en el dispositivo", 42f, 86f, body)
            canvas.drawText("Cajas de la planilla", 42f, 128f, heading)
            var y = 158f
            boxes.forEachIndexed { index, box ->
                canvas.drawText("${index + 1}. ${box.id} — ${box.producto}", 42f, y, heading)
                y += 20f
                canvas.drawText("Estado: ${box.estado}  |  Ubicación: ${box.ubicacion}", 54f, y, body)
                y += 18f
                canvas.drawText("Peso: ${box.pesoKg} kg  |  Cantidad: ${box.cantidad}  |  Categoría: ${box.categoria}", 54f, y, body)
                y += 30f
            }
            if (boxes.isEmpty()) canvas.drawText("Cajas: ${cajaIds.joinToString()}", 42f, y, body)
            canvas.drawText("Documento generado localmente porque el servidor no está disponible.", 42f, 800f, body)
            document.finishPage(page)
            val file = File(context.cacheDir, "guia_offline_${System.currentTimeMillis()}.pdf")
            file.outputStream().use(document::writeTo)
            document.close()
            file
        }
    }
}

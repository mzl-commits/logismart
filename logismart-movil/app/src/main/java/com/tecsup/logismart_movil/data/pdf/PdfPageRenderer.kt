package com.tecsup.logismart_movil.data.pdf

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PdfPageRenderer @Inject constructor(
    @param:ApplicationContext private val context: Context,
) {
    suspend fun render(file: File): Result<List<Bitmap>> = withContext(Dispatchers.IO) {
        runCatching {
            require(file.isFile) { "El PDF no existe" }
            val output = mutableListOf<Bitmap>()
            ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY).use { descriptor ->
                PdfRenderer(descriptor).use { renderer ->
                    for (index in 0 until renderer.pageCount) {
                        renderer.openPage(index).use { page ->
                            val width = context.resources.displayMetrics.widthPixels.coerceAtMost(1600)
                            val height = (page.height.toFloat() / page.width.toFloat() * width).toInt()
                            val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
                            Canvas(bitmap).drawColor(android.graphics.Color.WHITE)
                            page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                            output += bitmap
                        }
                    }
                }
            }
            output
        }
    }
}

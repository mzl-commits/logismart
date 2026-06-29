package com.tecsup.logismart_movil.ui.planillas

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.tecsup.logismart_movil.ui.components.LogiSmartTopAppBar
import androidx.hilt.navigation.compose.hiltViewModel
import com.tecsup.logismart_movil.data.local.SessionManager
import kotlinx.coroutines.flow.first

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PdfViewerScreen(
    cajas: String,
    userId: Int,
    sessionManager: SessionManager,
    onBack: () -> Unit,
    viewModel: PdfViewerViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(Unit) {
        val session = sessionManager.session.first()
        val token = session?.token ?: ""
        viewModel.downloadPdf(cajas, userId, token)
    }

    val bitmaps = remember(uiState.pdfFile) {
        val list = mutableStateListOf<Bitmap>()
        val file = uiState.pdfFile
        if (file != null && file.exists()) {
            try {
                val fileDescriptor = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
                val pdfRenderer = PdfRenderer(fileDescriptor)
                for (i in 0 until pdfRenderer.pageCount) {
                    val page = pdfRenderer.openPage(i)
                    // Calcula ancho y alto proporcional al tamaño de la pantalla
                    val width = context.resources.displayMetrics.widthPixels
                    val height = (page.height.toFloat() / page.width.toFloat() * width).toInt()
                    
                    val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
                    val canvas = Canvas(bitmap)
                    canvas.drawColor(android.graphics.Color.WHITE)
                    
                    page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                    list.add(bitmap)
                    page.close()
                }
                pdfRenderer.close()
                fileDescriptor.close()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
        list
    }

    Scaffold(
        topBar = {
            LogiSmartTopAppBar(title = "Guía de almacenamiento", onBack = onBack)
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color(0xFF0F172A))
        ) {
            when {
                uiState.isLoading -> {
                    Column(
                        modifier = Modifier.align(Alignment.Center),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        CircularProgressIndicator(color = Color.White)
                        Text(
                            text = "Generando guía en PDF...",
                            color = Color.White,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
                uiState.errorMessage != null -> {
                    Column(
                        modifier = Modifier.align(Alignment.Center).padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Text(
                            text = uiState.errorMessage!!,
                            color = MaterialTheme.colorScheme.error,
                            textAlign = TextAlign.Center,
                            style = MaterialTheme.typography.bodyMedium
                        )
                        Button(onClick = {
                            // Re-intentar
                            bitmaps.clear()
                            viewModel.downloadPdf(cajas, userId, "")
                        }) {
                            Text("Reintentar")
                        }
                    }
                }
                bitmaps.isEmpty() -> {
                    Text(
                        text = "No se pudieron renderizar las páginas del PDF.",
                        color = Color.White,
                        modifier = Modifier.align(Alignment.Center)
                    )
                }
                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                        contentPadding = PaddingValues(16.dp)
                    ) {
                        items(bitmaps) { bitmap ->
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                elevation = CardDefaults.cardElevation(defaultElevation = 6.dp)
                            ) {
                                Image(
                                    bitmap = bitmap.asImageBitmap(),
                                    contentDescription = "Página de la planilla",
                                    modifier = Modifier.fillMaxWidth(),
                                    contentScale = ContentScale.FillWidth
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

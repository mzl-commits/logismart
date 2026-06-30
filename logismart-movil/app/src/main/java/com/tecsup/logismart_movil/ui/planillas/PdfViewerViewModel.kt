package com.tecsup.logismart_movil.ui.planillas

import android.content.Context
import android.graphics.Bitmap
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tecsup.logismart_movil.data.model.ApiResult
import com.tecsup.logismart_movil.data.repository.PlanillaRepository
import com.tecsup.logismart_movil.data.local.UserPreferences
import com.tecsup.logismart_movil.data.local.SessionManager
import com.tecsup.logismart_movil.data.localai.LocalAiEngine
import com.tecsup.logismart_movil.data.pdf.PdfPageRenderer
import com.google.gson.Gson
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.flow.first
import java.io.File
import java.io.FileOutputStream
import javax.inject.Inject

data class PdfViewerUiState(
    val isLoading: Boolean = false,
    val pdfFile: File? = null,
    val pages: List<Bitmap> = emptyList(),
    val errorMessage: String? = null,
    val isGeneratingLocalSummary: Boolean = false,
    val localAiSummary: String? = null,
    val localAiError: String? = null,
)

@HiltViewModel
class PdfViewerViewModel @Inject constructor(
    private val repository: PlanillaRepository,
    private val userPreferences: UserPreferences,
    private val sessionManager: SessionManager,
    private val pdfPageRenderer: PdfPageRenderer,
    @param:ApplicationContext private val context: Context
) : ViewModel() {

    private val _uiState = MutableStateFlow(PdfViewerUiState())
    val uiState: StateFlow<PdfViewerUiState> = _uiState

    fun downloadPdf(cajas: String, userId: Int) {
        if (_uiState.value.pdfFile != null || _uiState.value.isLoading) return

        viewModelScope.launch {
            _uiState.value = PdfViewerUiState(isLoading = true)
            val token = sessionManager.session.first()?.token.orEmpty()

            when (val result = repository.downloadPdfLote(cajas, userId, token)) {
                is ApiResult.Success -> {
                    val file = File(context.cacheDir, "planilla_cajas_${System.currentTimeMillis()}.pdf")
                    val saved = withContext(Dispatchers.IO) {
                        try {
                            val inputStream = result.data.byteStream()
                            val outputStream = FileOutputStream(file)
                            val buffer = ByteArray(4096)
                            var read: Int
                            while (inputStream.read(buffer).also { read = it } != -1) {
                                outputStream.write(buffer, 0, read)
                            }
                            outputStream.flush()
                            outputStream.close()
                            inputStream.close()
                            true
                        } catch (e: Exception) {
                            e.printStackTrace()
                            false
                        }
                    }

                    if (saved) {
                        pdfPageRenderer.render(file)
                            .onSuccess { pages ->
                                _uiState.value = PdfViewerUiState(pdfFile = file, pages = pages)
                                generateLocalSummaryIfEnabled(cajas)
                            }
                            .onFailure {
                                _uiState.value = PdfViewerUiState(errorMessage = "No se pudieron renderizar las páginas del PDF.")
                            }
                    } else {
                        _uiState.value = PdfViewerUiState(errorMessage = "Error al guardar el archivo temporal.")
                    }
                }
                is ApiResult.Unauthorized -> {
                    _uiState.value = PdfViewerUiState(errorMessage = "Acceso no autorizado. Inicie sesión nuevamente.")
                }
                is ApiResult.Error -> {
                    _uiState.value = PdfViewerUiState(errorMessage = result.message)
                }
            }
        }
    }

    private fun generateLocalSummaryIfEnabled(cajas: String) {
        viewModelScope.launch {
            val enabled = userPreferences.localAiEnabled.first()
            val modelPath = userPreferences.localAiModelPath.first()
            if (!enabled || modelPath.isBlank()) return@launch

            _uiState.value = _uiState.value.copy(isGeneratingLocalSummary = true, localAiError = null)
            val requestedIds = cajas.split(',').map { it.trim() }.filter { it.isNotBlank() }.toSet()
            val planillasResult = repository.getPlanillas()
            val immutableData = when (planillasResult) {
                is ApiResult.Success -> {
                    val boxes = planillasResult.data.flatMap { it.cajas }.filter { it.id in requestedIds }.distinctBy { it.id }
                    Gson().toJson(mapOf("total_cajas" to boxes.size, "cajas" to boxes))
                }
                else -> Gson().toJson(mapOf("cajas_ids" to requestedIds.sorted()))
            }

            LocalAiEngine(context).generateOperationalSummary(modelPath, immutableData)
                .onSuccess { summary ->
                    _uiState.value = _uiState.value.copy(
                        isGeneratingLocalSummary = false,
                        localAiSummary = summary,
                        localAiError = null,
                    )
                }
                .onFailure {
                    _uiState.value = _uiState.value.copy(
                        isGeneratingLocalSummary = false,
                        localAiError = "No se pudo ejecutar el modelo local. La guía tradicional sigue disponible.",
                    )
                }
        }
    }
}

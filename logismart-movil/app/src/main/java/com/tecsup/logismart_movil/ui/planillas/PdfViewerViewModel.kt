package com.tecsup.logismart_movil.ui.planillas

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tecsup.logismart_movil.data.model.ApiResult
import com.tecsup.logismart_movil.data.repository.PlanillaRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import javax.inject.Inject

data class PdfViewerUiState(
    val isLoading: Boolean = false,
    val pdfFile: File? = null,
    val errorMessage: String? = null
)

@HiltViewModel
class PdfViewerViewModel @Inject constructor(
    private val repository: PlanillaRepository,
    @ApplicationContext private val context: Context
) : ViewModel() {

    private val _uiState = MutableStateFlow(PdfViewerUiState())
    val uiState: StateFlow<PdfViewerUiState> = _uiState

    fun downloadPdf(cajas: String, userId: Int, token: String) {
        if (_uiState.value.pdfFile != null || _uiState.value.isLoading) return

        viewModelScope.launch {
            _uiState.value = PdfViewerUiState(isLoading = true)

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
                        _uiState.value = PdfViewerUiState(pdfFile = file)
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
}

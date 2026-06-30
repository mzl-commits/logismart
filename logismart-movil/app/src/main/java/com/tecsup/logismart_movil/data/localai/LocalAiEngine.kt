package com.tecsup.logismart_movil.data.localai

import android.content.Context
import com.google.ai.edge.litertlm.Backend
import com.google.ai.edge.litertlm.ConversationConfig
import com.google.ai.edge.litertlm.Contents
import com.google.ai.edge.litertlm.Content
import com.google.ai.edge.litertlm.Engine
import com.google.ai.edge.litertlm.EngineConfig
import com.google.ai.edge.litertlm.SamplerConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

class LocalAiEngine(private val context: Context) {

    suspend fun generateOperationalSummary(modelPath: String, immutableData: String): Result<String> =
        withContext(Dispatchers.IO) {
            runCatching {
                val model = File(modelPath)
                require(model.isFile) { "El modelo local no está disponible." }

                val config = EngineConfig(
                    modelPath = model.absolutePath,
                    backend = Backend.CPU(),
                    cacheDir = context.cacheDir.absolutePath,
                )
                Engine(config).use { engine ->
                    engine.initialize()
                    val conversationConfig = ConversationConfig(
                        systemInstruction = Contents.of("""Eres un asistente de logística. Resume únicamente los datos proporcionados. No inventes ni cambies cifras, pesos, ubicaciones, estados o rutas. Responde en español, máximo 160 palabras, con las secciones Resumen, Riesgos y Recomendaciones."""),
                        samplerConfig = SamplerConfig(topK = 20, topP = 0.9, temperature = 0.2),
                    )
                    engine.createConversation(conversationConfig).use { conversation ->
                        conversation.sendMessage("DATOS INMUTABLES:\n$immutableData")
                            .contents.contents
                            .filterIsInstance<Content.Text>()
                            .joinToString(separator = "\n") { it.text }
                            .trim()
                    }
                }
            }
        }
}

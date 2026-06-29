package com.tecsup.logismart_movil.ui.boxes

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.tecsup.logismart_movil.data.model.LogisticBox
import com.tecsup.logismart_movil.ui.components.LogiSmartTopAppBar

@OptIn(ExperimentalMaterial3Api::class)
@Composable fun BoxDetailScreen(box: LogisticBox?, onBack: () -> Unit) {
    Scaffold(topBar={ LogiSmartTopAppBar(title = box?.id ?: "Detalle de caja", onBack = onBack) }) { padding ->
        if (box == null) { Box(Modifier.fillMaxSize().padding(padding), contentAlignment=androidx.compose.ui.Alignment.Center){ CircularProgressIndicator() } }
        else Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background).padding(padding).verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement=Arrangement.spacedBy(14.dp)) {
            Card(Modifier.fillMaxWidth(), shape=RoundedCornerShape(20.dp), border=CardDefaults.outlinedCardBorder(), colors=CardDefaults.cardColors(containerColor=MaterialTheme.colorScheme.surface)) {
                Column(Modifier.padding(18.dp), verticalArrangement=Arrangement.spacedBy(14.dp)) {
                    Text(box.producto, style=MaterialTheme.typography.headlineSmall)
                    Surface(color=MaterialTheme.colorScheme.primaryContainer, shape=RoundedCornerShape(9.dp)){Text(box.estado, Modifier.padding(horizontal=10.dp,vertical=6.dp), style=MaterialTheme.typography.labelMedium)}
                    HorizontalDivider()
                    Detail(Icons.Default.Category,"Categoría",box.categoria); Detail(Icons.Default.Scale,"Peso","${box.pesoKg} kg"); Detail(Icons.Default.Numbers,"Cantidad",box.cantidad.toString()); Detail(Icons.Default.LocationOn,"Ubicación",box.ubicacion); Detail(Icons.Default.SmartToy,"Carro asignado",box.carroAsignado)
                    if(box.esFragil) Detail(Icons.Default.Warning,"Manipulación","Producto frágil")
                }
            }
            Text("TRAZABILIDAD", style=MaterialTheme.typography.labelMedium, color=MaterialTheme.colorScheme.onSurfaceVariant)
            listOf("Recepción" to true,"Clasificación" to (box.estado!="pendiente"),"Traslado" to (box.estado in listOf("en_transito","almacenada","despachada")),"Almacenamiento" to (box.estado in listOf("almacenada","despachada")),"Despacho" to (box.estado=="despachada")).forEachIndexed { i,(label,done) -> Row { Icon(if(done) Icons.Default.CheckCircle else Icons.Default.RadioButtonUnchecked,null,tint=if(done) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline); Spacer(Modifier.width(12.dp)); Text(label); if(i<4) Spacer(Modifier.height(36.dp)) } }
        }
    }
}
@Composable private fun Detail(icon:ImageVector,label:String,value:String){Row{Icon(icon,null,tint=MaterialTheme.colorScheme.onSurfaceVariant);Spacer(Modifier.width(12.dp));Column{Text(label,style=MaterialTheme.typography.labelMedium,color=MaterialTheme.colorScheme.onSurfaceVariant);Text(value)}}}

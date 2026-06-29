package com.tecsup.logismart_movil.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Save
import androidx.compose.material.icons.filled.Storage
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.tecsup.logismart_movil.data.local.UserPreferences
import kotlinx.coroutines.launch

@Composable
fun SettingsScreen() {
    val context = LocalContext.current
    val preferences = remember { UserPreferences(context.applicationContext) }
    val savedUserName by preferences.userName.collectAsState(initial = "Gisela Morales")
    val savedServerUrl by preferences.serverUrl.collectAsState(initial = "https://logistica.promube.com/")
    val notificationsEnabled by preferences.notificationsEnabled.collectAsState(initial = true)
    val darkModeEnabled by preferences.darkModeEnabled.collectAsState(initial = false)
    val showPriorityWidget by preferences.showPriorityWidget.collectAsState(initial = true)
    var userName by remember { mutableStateOf(savedUserName) }
    var serverUrl by remember { mutableStateOf(savedServerUrl) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(savedUserName) { userName = savedUserName }
    LaunchedEffect(savedServerUrl) { serverUrl = savedServerUrl }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Text("Personaliza la experiencia y la conexión de LogiSmart.", color = MaterialTheme.colorScheme.onSurfaceVariant)

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(18.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
            border = CardDefaults.outlinedCardBorder(),
        ) {
            Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(color = MaterialTheme.colorScheme.primaryContainer, shape = RoundedCornerShape(12.dp)) {
                        Icon(Icons.Default.Person, null, Modifier.padding(10.dp).size(22.dp))
                    }
                    Spacer(Modifier.width(12.dp))
                    Column {
                        Text("Cuenta y servidor", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text("Datos de acceso a la plataforma", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                OutlinedTextField(
                    value = userName,
                    onValueChange = { userName = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Nombre del usuario") },
                    leadingIcon = { Icon(Icons.Default.Person, null) },
                    shape = RoundedCornerShape(14.dp),
                    singleLine = true,
                )
                OutlinedTextField(
                    value = serverUrl,
                    onValueChange = { serverUrl = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("URL del servidor") },
                    leadingIcon = { Icon(Icons.Default.Storage, null) },
                    shape = RoundedCornerShape(14.dp),
                    singleLine = true,
                )
                Button(
                    onClick = {
                        scope.launch {
                            preferences.saveUserName(userName)
                            preferences.saveServerUrl(serverUrl)
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    contentPadding = PaddingValues(vertical = 15.dp),
                ) {
                    Icon(Icons.Default.Save, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Guardar cambios")
                }
            }
        }

        Text("PREFERENCIAS", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        SettingSwitchCard(
            title = "Notificaciones",
            description = "Recibir alertas importantes del sistema",
            icon = Icons.Default.Notifications,
            checked = notificationsEnabled,
            onCheckedChange = { value -> scope.launch { preferences.saveNotificationsEnabled(value) } },
        )
        SettingSwitchCard(
            title = "Tema oscuro",
            description = "Preferencia visual de la aplicación",
            icon = Icons.Default.DarkMode,
            checked = darkModeEnabled,
            onCheckedChange = { value -> scope.launch { preferences.saveDarkModeEnabled(value) } },
        )
        Text("WIDGETS DEL INICIO", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        SettingSwitchCard(
            title = "Prioridad operativa",
            description = "Mostrar el recordatorio de cajas pendientes",
            icon = Icons.Default.Storage,
            checked = showPriorityWidget,
            onCheckedChange = { value -> scope.launch { preferences.saveShowPriorityWidget(value) } },
        )
    }
}

@Composable
fun SettingSwitchCard(
    title: String,
    description: String,
    icon: ImageVector,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        border = CardDefaults.outlinedCardBorder(),
    ) {
        Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(color = MaterialTheme.colorScheme.secondaryContainer, shape = RoundedCornerShape(12.dp)) {
                Icon(icon, null, Modifier.padding(10.dp).size(22.dp), tint = MaterialTheme.colorScheme.onSecondaryContainer)
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                Text(description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Switch(checked = checked, onCheckedChange = onCheckedChange)
        }
    }
}

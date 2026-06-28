package com.tecsup.logismart_movil.ui.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.tecsup.logismart_movil.data.local.UserPreferences
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen() {
    val context = LocalContext.current
    val preferences = remember {
        UserPreferences(context.applicationContext)
    }

    val savedUserName by preferences.userName.collectAsState(initial = "Gisela Morales")
    val savedServerUrl by preferences.serverUrl.collectAsState(initial = "https://logistica.promube.com/")
    val notificationsEnabled by preferences.notificationsEnabled.collectAsState(initial = true)
    val darkModeEnabled by preferences.darkModeEnabled.collectAsState(initial = false)

    var userName by remember { mutableStateOf(savedUserName) }
    var serverUrl by remember { mutableStateOf(savedServerUrl) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(savedUserName) {
        userName = savedUserName
    }

    LaunchedEffect(savedServerUrl) {
        serverUrl = savedServerUrl
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(text = "Ajustes")
                }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Text(
                text = "Preferencias básicas de la app",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = "Datos del usuario",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )

                    OutlinedTextField(
                        value = userName,
                        onValueChange = { userName = it },
                        modifier = Modifier.fillMaxWidth(),
                        label = {
                            Text(text = "Nombre del usuario")
                        }
                    )

                    OutlinedTextField(
                        value = serverUrl,
                        onValueChange = { serverUrl = it },
                        modifier = Modifier.fillMaxWidth(),
                        label = {
                            Text(text = "URL del servidor")
                        }
                    )

                    Button(
                        onClick = {
                            scope.launch {
                                preferences.saveUserName(userName)
                                preferences.saveServerUrl(serverUrl)
                            }
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(text = "Guardar cambios")
                    }
                }
            }

            SettingSwitchCard(
                title = "Notificaciones",
                description = "Recibir alertas importantes del sistema",
                checked = notificationsEnabled,
                onCheckedChange = { value ->
                    scope.launch {
                        preferences.saveNotificationsEnabled(value)
                    }
                }
            )

            SettingSwitchCard(
                title = "Tema oscuro",
                description = "Preferencia visual básica de la aplicación",
                checked = darkModeEnabled,
                onCheckedChange = { value ->
                    scope.launch {
                        preferences.saveDarkModeEnabled(value)
                    }
                }
            )
        }
    }
}

@Composable
fun SettingSwitchCard(
    title: String,
    description: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )

                Text(
                    text = description,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Switch(
                checked = checked,
                onCheckedChange = onCheckedChange
            )
        }
    }
}

package com.tecsup.logismart_movil.ui.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    name: String,
    username: String,
    role: String,
    onSettings: () -> Unit,
    onNotifications: () -> Unit,
    onLogout: () -> Unit,
) {
    Scaffold(topBar = { TopAppBar(title = { Text("Perfil", fontWeight = FontWeight.Bold) }) }) { padding ->
        Column(
            Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background).padding(padding).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Card(
                Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(22.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
            ) {
                Row(Modifier.padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
                    Surface(shape = CircleShape, color = MaterialTheme.colorScheme.primary) {
                        Icon(Icons.Default.Person, null, Modifier.padding(15.dp).size(30.dp), tint = MaterialTheme.colorScheme.onPrimary)
                    }
                    Spacer(Modifier.width(14.dp))
                    Column {
                        Text(name.ifBlank { username }, style = MaterialTheme.typography.titleLarge)
                        Text("@$username", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(if (role == "admin") "Administrador" else "Operador", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
                    }
                }
            }
            Text("CUENTA", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            ProfileOption(Icons.Default.Notifications, "Notificaciones", "Actividad y alertas operativas", onNotifications)
            ProfileOption(Icons.Default.Settings, "Configuración", "Tema, servidor y widgets", onSettings)
            Spacer(Modifier.weight(1f))
            OutlinedButton(
                onClick = onLogout,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)
            ) {
                Icon(Icons.AutoMirrored.Filled.Logout, null); Spacer(Modifier.width(8.dp)); Text("Cerrar sesión")
            }
        }
    }
}

@Composable private fun ProfileOption(icon: androidx.compose.ui.graphics.vector.ImageVector, title: String, subtitle: String, onClick: () -> Unit) {
    Surface(Modifier.fillMaxWidth().clickable(onClick=onClick), shape=RoundedCornerShape(16.dp), color=MaterialTheme.colorScheme.surface, border=CardDefaults.outlinedCardBorder()) {
        Row(Modifier.padding(16.dp), verticalAlignment=Alignment.CenterVertically) {
            Surface(color=MaterialTheme.colorScheme.secondaryContainer,shape=RoundedCornerShape(11.dp)){Icon(icon,null,Modifier.padding(10.dp).size(22.dp),tint=MaterialTheme.colorScheme.onSecondaryContainer)}
            Spacer(Modifier.width(12.dp));Column(Modifier.weight(1f)){Text(title,fontWeight=FontWeight.SemiBold);Text(subtitle,style=MaterialTheme.typography.bodySmall,color=MaterialTheme.colorScheme.onSurfaceVariant)};Icon(Icons.Default.ChevronRight,null,tint=MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

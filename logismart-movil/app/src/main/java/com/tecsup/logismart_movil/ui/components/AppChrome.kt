package com.tecsup.logismart_movil.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LogiSmartTopAppBar(
    title: String,
    modifier: Modifier = Modifier,
    onBack: (() -> Unit)? = null,
    actions: @Composable RowScope.() -> Unit = {},
) {
    TopAppBar(
        title = {
            Text(
                text = title,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
            )
        },
        modifier = modifier,
        navigationIcon = {
            onBack?.let {
                IconButton(onClick = it) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Atrás")
                }
            }
        },
        actions = actions,
        colors = TopAppBarDefaults.topAppBarColors(
            containerColor = MaterialTheme.colorScheme.surface,
            scrolledContainerColor = MaterialTheme.colorScheme.surface,
        ),
    )
}

@Composable
fun IllustratedEmptyState(
    title: String,
    description: String,
    modifier: Modifier = Modifier,
    icon: ImageVector = Icons.Default.Inventory2,
) {
    Column(
        modifier = modifier.padding(horizontal = 28.dp, vertical = 44.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Surface(shape = CircleShape, color = MaterialTheme.colorScheme.primaryContainer) {
            Icon(
                icon,
                contentDescription = null,
                modifier = Modifier.padding(18.dp).size(34.dp),
                tint = MaterialTheme.colorScheme.onPrimaryContainer,
            )
        }
        Spacer(Modifier.height(16.dp))
        Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(6.dp))
        Text(
            description,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )
    }
}

package com.logismart.mobile.core.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val Colors = lightColorScheme(
    primary = Navy,
    onPrimary = androidx.compose.ui.graphics.Color.White,
    primaryContainer = SkyLight,
    onPrimaryContainer = NavyDark,
    secondary = Sky,
    background = SurfaceSoft,
    surface = androidx.compose.ui.graphics.Color.White,
    onSurface = NavyDark,
    error = ErrorRed,
)

@Composable
fun LogiSmartTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = Colors,
        typography = LogiSmartTypography,
        content = content,
    )
}

package com.tecsup.logismart_movil.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColorScheme = lightColorScheme(
    primary = BrandPrimary,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFE1E7FF),
    onPrimaryContainer = Color(0xFF17255E),
    secondary = BrandSecondary,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFD7F3EF),
    onSecondaryContainer = Color(0xFF064E48),
    tertiary = BrandTertiary,
    tertiaryContainer = Color(0xFFDDF2FC),
    onTertiaryContainer = Color(0xFF0B4A68),
    background = AppBackground,
    onBackground = Slate900,
    surface = Color.White,
    onSurface = Slate900,
    surfaceVariant = Color(0xFFEDF1F8),
    onSurfaceVariant = Slate500,
    outline = Slate300,
    outlineVariant = Slate200,
    error = RoseDanger,
    errorContainer = Color(0xFFFEE2E2),
    onErrorContainer = Color(0xFF991B1B),
)

private val DarkColorScheme = darkColorScheme(
    primary = Color(0xFFAFC0FF),
    onPrimary = Color(0xFF13245F),
    primaryContainer = Color(0xFF263A82),
    onPrimaryContainer = Color(0xFFE1E7FF),
    secondary = Color(0xFF75D8CB),
    secondaryContainer = Color(0xFF124C47),
    onSecondaryContainer = Color(0xFFD7F3EF),
    tertiary = Color(0xFF82D1F4),
    background = Color(0xFF0B1220),
    onBackground = Slate50,
    surface = Color(0xFF121B2D),
    onSurface = Slate50,
    surfaceVariant = Color(0xFF1B263A),
    onSurfaceVariant = Slate400,
    outline = Slate700,
    outlineVariant = Color(0xFF28364E),
    error = Color(0xFFF87171),
)

@Composable
fun LogismartmovilTheme(
    darkTheme: Boolean = false,
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit,
) {
    // Sin color dinámico: la marca debe verse igual en todos los dispositivos.
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme,
        typography = Typography,
        shapes = LogiSmartShapes,
        content = content,
    )
}

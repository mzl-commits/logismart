package com.tecsup.logismart_movil.ui.components

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

@Composable
fun LoadingSkeleton(
    modifier: Modifier = Modifier,
    rows: Int = 3,
) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        repeat(rows) { SkeletonCard() }
    }
}

@Composable
private fun SkeletonCard() {
    val transition = rememberInfiniteTransition(label = "skeleton")
    val alpha by transition.animateFloat(
        initialValue = .35f,
        targetValue = .75f,
        animationSpec = infiniteRepeatable(tween(850), RepeatMode.Reverse),
        label = "skeletonAlpha",
    )
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(112.dp)
            .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(18.dp))
            .padding(16.dp)
            .alpha(alpha),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        SkeletonBlock(44.dp, 44.dp, CircleShape)
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            SkeletonBlock(132.dp, 16.dp)
            SkeletonBlock(210.dp, 12.dp)
            SkeletonBlock(170.dp, 12.dp)
        }
    }
}

@Composable
private fun SkeletonBlock(width: Dp, height: Dp, shape: androidx.compose.ui.graphics.Shape = RoundedCornerShape(6.dp)) {
    Box(Modifier.width(width).height(height).background(MaterialTheme.colorScheme.surfaceVariant, shape))
}

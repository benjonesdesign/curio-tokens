package com.curio.tokens

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

// Locks the shape a Compose consumer actually depends on: packed-ARGB Longs a raw
// androidx.compose.ui.graphics.Color(Long) constructor accepts directly, and that alpha is
// packed into the correct byte (not silently dropped or mis-shifted) for a translucent token.
class CurioTokensTest {
    @Test
    fun `opaque colors carry a full FF alpha byte`() {
        assertEquals(0xFF0B0D12L, CurioTokens.Colors.surfaceBase)
    }

    @Test
    fun `translucent colors pack a non-FF alpha byte, not silently forced opaque`() {
        val alphaByte = (CurioTokens.Colors.textSecondary shr 24) and 0xFFL
        assertTrue(alphaByte in 1..254, "expected a translucent alpha byte, got $alphaByte")
    }

    @Test
    fun `radius and spacing are usable as Compose dp values`() {
        assertEquals(12f, CurioTokens.Radius.radiusMd)
        assertEquals(12f, CurioTokens.Spacing.spacingMd)
    }

    @Test
    fun `durations are whole milliseconds, ready for tween(durationMillis =)`() {
        assertEquals(200L, CurioTokens.Duration.durationStandard)
    }
}

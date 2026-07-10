import type { CSSProperties } from 'react'

/**
 * Design tokens for the editorial diagram system.
 * Exposed both as a typed object (for TSX math/logic) and as CSS custom
 * properties (applied on the DiagramFrame root) so themes can be swapped
 * without touching component code.
 */

/** The accent colors that vary between diagram themes. */
export interface DiagramTheme {
  /** Perception / data entering the system. */
  accentInput: string
  /** Latent computation and training. */
  accentLatent: string
  /** Successful embodied action. */
  accentAction: string
  /** Soft halo for input flows. */
  glow: string
  /** Soft halo for latent flows (e.g. deployment pipe interior). */
  glowLatent: string
}

/** Default: a calm, blue-based scheme. */
export const blueTheme: DiagramTheme = {
  accentInput: '#5b93ff',
  accentLatent: '#2563eb',
  accentAction: '#0aa2c0',
  glow: 'rgba(91, 147, 255, 0.35)',
  glowLatent: 'rgba(37, 99, 235, 0.28)',
}

/** Warm red counterpart, same restraint. */
export const redTheme: DiagramTheme = {
  accentInput: '#fb7185',
  accentLatent: '#dc2626',
  accentAction: '#e11d48',
  glow: 'rgba(251, 113, 133, 0.35)',
  glowLatent: 'rgba(220, 38, 38, 0.25)',
}

export const diagramTokens = {
  color: {
    bg: '#f7f4ee',
    surface: '#fffdf8',
    ink: '#1b1a17',
    muted: '#8c877c',
    line: '#c9c4ba',
  },
  font: {
    label:
      "'Inter', 'SF Pro Text', ui-sans-serif, system-ui, -apple-system, sans-serif",
    caption:
      "'Iowan Old Style', 'Palatino Linotype', Georgia, 'Times New Roman', serif",
  },
  ease: {
    standard: 'cubic-bezier(0.22, 1, 0.36, 1)',
    pop: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    swing: 'cubic-bezier(0.68, -0.3, 0.32, 1.3)',
  },
} as const

/** CSS custom properties for a theme, injected at the DiagramFrame root. */
export function diagramCssVars(
  theme: DiagramTheme = blueTheme,
): Record<string, string> {
  return {
    '--diagram-bg': diagramTokens.color.bg,
    '--diagram-surface': diagramTokens.color.surface,
    '--diagram-ink': diagramTokens.color.ink,
    '--diagram-muted': diagramTokens.color.muted,
    '--diagram-line': diagramTokens.color.line,
    '--diagram-accent-input': theme.accentInput,
    '--diagram-accent-latent': theme.accentLatent,
    '--diagram-accent-action': theme.accentAction,
    '--diagram-glow': theme.glow,
    '--diagram-glow-latent': theme.glowLatent,
    '--diagram-font-label': diagramTokens.font.label,
    '--diagram-font-caption': diagramTokens.font.caption,
    '--diagram-ease': diagramTokens.ease.standard,
    '--diagram-ease-pop': diagramTokens.ease.pop,
    '--diagram-ease-swing': diagramTokens.ease.swing,
  }
}

/** Style helper: React's CSSProperties doesn't know custom properties. */
export type CSSVarStyle = CSSProperties & Record<string, string | number>

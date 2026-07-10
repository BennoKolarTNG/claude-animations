import type { CSSVarStyle } from '../diagramTokens'

export type LatentRackMode = 'idle' | 'live' | 'hold'

interface LatentRackProps {
  /** Left edge of the board. */
  x: number
  /** Vertical center of the board. */
  y: number
  cells?: number
  cellSize?: number
  gap?: number
  /** All cells share one hue — inputs are indistinguishable inside. */
  color?: string
  /**
   * idle: faint resting state · live: cells light up left→right as the
   * first particles arrive, then keep glowing up and down at slightly
   * different speeds · hold: statically lit (reduced-motion fallback).
   */
  mode: LatentRackMode
  /** Indices of the cells this input activates strongly. */
  pattern?: number[]
  /** Stack the cells top-to-bottom instead of left-to-right. */
  vertical?: boolean
}

/**
 * The learned latent space: a row of same-hued cells on a small board.
 * Different inputs light different subsets of cells — different codes —
 * but the color never betrays where a motion came from. While translating,
 * every cell breathes: bright ones swing high, the rest murmur.
 */
export function LatentRack({
  x,
  y,
  cells = 12,
  cellSize = 18,
  gap = 4,
  color = 'var(--diagram-accent-latent)',
  mode,
  pattern = [],
  vertical = false,
}: LatentRackProps) {
  const rowWidth = cells * (cellSize + gap) - gap
  const pad = 10
  const boardW = vertical ? cellSize + pad * 2 - 4 : rowWidth + pad * 2
  const boardH = vertical ? rowWidth + pad * 2 : cellSize + pad * 2 - 4

  return (
    <g className={`latent-rack${mode === 'live' ? ' live' : ''}`} aria-hidden>
      <rect
        x={vertical ? x - boardW / 2 : x}
        y={vertical ? y : y - boardH / 2}
        width={boardW}
        height={boardH}
        rx={9}
        fill="var(--diagram-surface)"
        stroke="var(--diagram-line)"
        strokeWidth={1.5}
      />
      {Array.from({ length: cells }, (_, i) => {
        const bright = pattern.includes(i)
        // In `live`, the inline opacity is the LOW value: each cell sits
        // dim through its animation-delay, so the glow visibly ramps in
        // left→right at particle speed before settling into its cycle.
        // Per-cell durations differ slightly, so the cycles drift apart
        // and the breathing turns organic.
        const style: CSSVarStyle = {
          opacity:
            mode === 'live'
              ? bright
                ? 0.4
                : 0.12
              : mode === 'hold'
                ? bright
                  ? 0.8
                  : 0.3
                : 0.16,
          '--lo': bright ? 0.4 : 0.12,
          '--hi': bright ? 0.95 : 0.42,
          '--d2': `${i * 0.12}s`,
          '--gdur': `${1.25 + ((i * 37) % 5) * 0.13}s`,
        }
        return (
          <rect
            key={i}
            className="latent-cell"
            x={vertical ? x - cellSize / 2 : x + pad + i * (cellSize + gap)}
            y={vertical ? y + pad + i * (cellSize + gap) : y - cellSize / 2}
            width={cellSize}
            height={cellSize}
            rx={3.5}
            fill={color}
            style={style}
          />
        )
      })}
    </g>
  )
}

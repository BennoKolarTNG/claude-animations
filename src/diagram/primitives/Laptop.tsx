import type { CSSVarStyle } from '../diagramTokens'

interface LaptopProps {
  /** Rows/cols of motion tiles in the on-screen library grid. */
  rows?: number
  cols?: number
  /** Index of the selected tile (highlighted + pulsing while playing). */
  selected?: number
  /** Accent for the selected tile / play state. */
  accent?: string
  /** Selected tile pulses (motion is streaming). */
  playing?: boolean
  /** Grays the device down until it matters. */
  active?: boolean
}

/**
 * A laptop running the motion-library web UI: a grid of small motion
 * tiles with one selected, drawn with local origin at the bottom center
 * of the base (~150 wide, ~100 tall).
 */
export function Laptop({
  rows = 3,
  cols = 4,
  selected = 5,
  accent = 'var(--diagram-accent-input)',
  playing = false,
  active = true,
}: LaptopProps) {
  const stroke = active ? 'var(--diagram-ink)' : 'var(--diagram-line)'
  const screenW = 128
  const screenH = 82
  const sx = -screenW / 2
  const sy = -14 - screenH
  const pad = 8
  const gap = 5
  const tileW = (screenW - pad * 2 - gap * (cols - 1)) / cols
  const tileH = (screenH - pad * 2 - gap * (rows - 1)) / rows

  return (
    <g aria-hidden>
      {/* screen */}
      <rect
        x={sx}
        y={sy}
        width={screenW}
        height={screenH}
        rx={7}
        fill="var(--diagram-surface)"
        stroke={stroke}
        strokeWidth={1.6}
        style={{ transition: 'stroke 600ms ease' }}
      />
      {/* base */}
      <path
        d={`M ${sx - 10} 0 L ${sx + 4} -14 L ${-sx - 4} -14 L ${-sx + 10} 0 Z`}
        fill="var(--diagram-surface)"
        stroke={stroke}
        strokeWidth={1.6}
        style={{ transition: 'stroke 600ms ease' }}
      />
      {/* motion library grid */}
      {Array.from({ length: rows * cols }, (_, i) => {
        const r = Math.floor(i / cols)
        const cIdx = i % cols
        const x = sx + pad + cIdx * (tileW + gap)
        const y = sy + pad + r * (tileH + gap)
        const isSel = i === selected
        return (
          <g key={i}>
            <rect
              className={isSel && playing ? 'laptop-tile-playing' : undefined}
              x={x}
              y={y}
              width={tileW}
              height={tileH}
              rx={3.5}
              fill={isSel ? accent : 'var(--diagram-line)'}
              opacity={isSel ? 0.9 : 0.35}
              style={{ transition: 'fill 500ms ease, opacity 500ms ease' } as CSSVarStyle}
            />
            {/* tiny figure squiggle on each tile */}
            <path
              d={`M ${x + tileW / 2 - 4} ${y + tileH / 2 + 3} q 4 -8 8 0`}
              fill="none"
              stroke={isSel ? 'var(--diagram-surface)' : 'var(--diagram-muted)'}
              strokeWidth={1.3}
              strokeLinecap="round"
              opacity={isSel ? 1 : 0.7}
            />
          </g>
        )
      })}
    </g>
  )
}

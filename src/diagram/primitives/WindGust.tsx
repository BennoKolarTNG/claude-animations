import type { CSSVarStyle } from '../diagramTokens'

interface WindGustProps {
  /** Anchor of the gust (lines sweep leftward from here). */
  x: number
  y: number
  active: boolean
  color?: string
}

/**
 * A gust of wind: three staggered dashed streamlines sweeping in from
 * the right (toward −x). Runs twice per activation — one shove, one echo.
 */
export function WindGust({ x, y, active, color = 'var(--diagram-muted)' }: WindGustProps) {
  const lines = [
    { d: 'M 0 0 q 12 -4 26 -2 q 8 1 14 -2', dy: 0, delay: 0 },
    { d: 'M 4 0 q 14 -3 30 0', dy: 15, delay: 0.14 },
    { d: 'M 0 0 q 10 -4 22 -1 q 10 2 18 -1', dy: 30, delay: 0.28 },
  ]
  return (
    <g
      className={`wind${active ? ' active' : ''}`}
      transform={`translate(${x} ${y})`}
      aria-hidden
    >
      {lines.map((l, i) => (
        // Offset lives on the wrapper; the sweep animation owns the
        // path's own transform.
        <g key={i} transform={`translate(0 ${l.dy})`}>
          <path
            className="wind-line"
            d={l.d}
            fill="none"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeDasharray="7 5"
            style={{ '--d': `${l.delay}s` } as CSSVarStyle}
          />
        </g>
      ))}
    </g>
  )
}

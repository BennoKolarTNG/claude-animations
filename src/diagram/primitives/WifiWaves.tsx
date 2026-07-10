import type { CSSVarStyle } from '../diagramTokens'

interface WifiWavesProps {
  /** Origin of the waves (they expand toward +x). */
  x: number
  y: number
  color?: string
  active: boolean
  /** Arc count. */
  count?: number
}

/**
 * Concentric expanding arcs — wireless streaming. Arcs ripple outward
 * continuously while active.
 */
export function WifiWaves({
  x,
  y,
  color = 'var(--diagram-accent-input)',
  active,
  count = 3,
}: WifiWavesProps) {
  return (
    <g className={`wifi${active ? ' active' : ''}`} transform={`translate(${x} ${y})`} aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const r = 10 + i * 9
        return (
          <path
            key={i}
            className="wifi-arc"
            d={`M ${r * 0.5} ${-r * 0.866} A ${r} ${r} 0 0 1 ${r * 0.5} ${r * 0.866}`}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            style={{ '--d': `${i * 0.22}s` } as CSSVarStyle}
          />
        )
      })}
      <circle r={2.6} fill={color} className="wifi-dot" />
    </g>
  )
}

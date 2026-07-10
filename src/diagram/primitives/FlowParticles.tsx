import type { CSSVarStyle } from '../diagramTokens'

interface FlowParticlesProps {
  /** Start of the flow (usually a pipe inlet). */
  x: number
  y: number
  /** Horizontal travel distance. */
  dx: number
  /** Vertical center at the end of the flow (defaults to `y`, i.e. level). */
  y2?: number
  /** Vertical spread of particles at the start / end (taper). */
  spreadStart?: number
  spreadEnd?: number
  count?: number
  color?: string
  /** Seconds for one particle to cross. */
  duration?: number
  radius?: number
  /** 'square' renders token-style tiles instead of dots. */
  shape?: 'dot' | 'square'
  active: boolean
}

/**
 * A stream of dots flowing left→right, converging or fanning out to match
 * a tapered pipe. Pure CSS keyframe motion; inert unless `active`.
 */
export function FlowParticles({
  x,
  y,
  dx,
  y2,
  spreadStart = 0,
  spreadEnd = 0,
  count = 7,
  color = 'var(--diagram-accent-input)',
  duration = 1.7,
  radius = 2.4,
  shape = 'dot',
  active,
}: FlowParticlesProps) {
  const dots = Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0 : (i / (count - 1)) * 2 - 1 // -1..1
    const style: CSSVarStyle = {
      '--x0': `${x}px`,
      '--y0': `${y + t * spreadStart}px`,
      '--x1': `${x + dx}px`,
      '--y1': `${(y2 ?? y) + t * spreadEnd}px`,
      '--dur': `${duration}s`,
      '--d': `${-((i * 0.37) % 1) * duration}s`,
    }
    const cls = `flow-dot${active ? ' active' : ''}`
    return shape === 'square' ? (
      <rect
        key={i}
        className={cls}
        x={-radius * 1.3}
        y={-radius * 1.3}
        width={radius * 2.6}
        height={radius * 2.6}
        rx={1.2}
        fill={color}
        style={style}
      />
    ) : (
      <circle key={i} className={cls} cx={0} cy={0} r={radius} fill={color} style={style} />
    )
  })

  return <g aria-hidden>{dots}</g>
}

interface TrainingLoopProps {
  radius?: number
  color?: string
  /** Rotates while true. */
  spinning: boolean
  strokeWidth?: number
}

const ARROWHEAD = 'M -2 -11 L 16 0 L -2 11 Z'

const toRad = (deg: number) => (deg * Math.PI) / 180
const pt = (r: number, deg: number) => ({
  x: r * Math.cos(toRad(deg)),
  y: r * Math.sin(toRad(deg)),
})

/**
 * Two curved arrows chasing each other around the origin — the visual
 * shorthand for a reinforcement-learning loop. A small pulsing core sits
 * at the center (the policy being tuned).
 */
export function TrainingLoop({
  radius = 52,
  color = 'var(--diagram-accent-latent)',
  spinning,
  strokeWidth = 9,
}: TrainingLoopProps) {
  // One arc spanning 140°, mirrored by rotating the copy 180°.
  const a0 = -155
  const a1 = -25
  const p0 = pt(radius, a0)
  const p1 = pt(radius, a1)
  const arc = `M ${p0.x} ${p0.y} A ${radius} ${radius} 0 0 1 ${p1.x} ${p1.y}`
  // Direction of travel at the arc end (sweep=1 ⇒ tangent is angle+90°).
  const headAngle = a1 + 90
  // Keep the arrowhead proportional when the loop is rendered small.
  const headScale = Math.max(0.45, radius / 52)

  const arrow = (rotate: number) => (
    <g key={rotate} transform={`rotate(${rotate})`}>
      <path
        d={arc}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d={ARROWHEAD}
        fill={color}
        transform={`translate(${p1.x} ${p1.y}) rotate(${headAngle}) scale(${headScale})`}
      />
    </g>
  )

  return (
    <g className={`training-loop${spinning ? ' spinning' : ''}`} aria-hidden>
      <g className="training-loop-rotor">
        {arrow(0)}
        {arrow(180)}
      </g>
      <circle
        className="training-loop-core"
        r={8.5 * headScale}
        fill={color}
        opacity={0.85}
      />
    </g>
  )
}

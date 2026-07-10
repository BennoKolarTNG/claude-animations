interface PipeProps {
  /** Center of the left opening. */
  x: number
  y: number
  /** Horizontal length of the pipe body. */
  length: number
  /** Half-height of the left opening. */
  inletRadius: number
  /** Half-height of the right opening. */
  outletRadius: number
  /** Stroke color override (defaults to the muted line token). */
  stroke?: string
  /** Highlight the pipe (ink outline + faint accent interior). */
  active?: boolean
  accent?: string
  /** Dashed outline — a module that could exist but doesn't yet. */
  dashed?: boolean
}

/**
 * A tapered pipe drawn as clean vector geometry: two converging walls
 * with elliptical openings. Wide→narrow reads as an encoder, narrow→wide
 * as an emitter.
 */
export function Pipe({
  x,
  y,
  length,
  inletRadius: r1,
  outletRadius: r2,
  stroke,
  active = false,
  accent,
  dashed = false,
}: PipeProps) {
  const capRx1 = Math.max(4, r1 * 0.32)
  const capRx2 = Math.max(4, r2 * 0.32)
  const xe = x + length

  const body = [
    `M ${x} ${y - r1}`,
    `L ${xe} ${y - r2}`,
    `A ${capRx2} ${r2} 0 0 1 ${xe} ${y + r2}`,
    `L ${x} ${y + r1}`,
    `A ${capRx1} ${r1} 0 0 1 ${x} ${y - r1}`,
    'Z',
  ].join(' ')

  const wall = stroke ?? 'var(--diagram-line)'

  return (
    <g>
      <path
        d={body}
        fill="var(--diagram-surface)"
        stroke={active ? 'var(--diagram-ink)' : wall}
        strokeWidth={1.5}
        strokeDasharray={dashed ? '5 4' : undefined}
        style={{ transition: 'stroke 600ms ease' }}
      />
      {/* Faint interior tint while flow is passing through. */}
      <path
        d={body}
        fill={accent ?? 'var(--diagram-glow)'}
        stroke="none"
        opacity={active ? 0.14 : 0}
        style={{ transition: 'opacity 600ms ease' }}
      />
      {/* Right opening, drawn as an ellipse to suggest depth. */}
      <ellipse
        cx={xe}
        cy={y}
        rx={capRx2}
        ry={r2}
        fill="var(--diagram-bg)"
        stroke={active ? 'var(--diagram-ink)' : wall}
        strokeWidth={1.5}
        strokeDasharray={dashed ? '5 4' : undefined}
        style={{ transition: 'stroke 600ms ease' }}
      />
    </g>
  )
}

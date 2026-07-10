export type MotionPose =
  | 'walk'
  | 'wiggle'
  | 'jump'
  | 'kick'
  | 'sidewiggle'
  | 'wave'
  | 'leap'

interface MotionCardProps {
  width?: number
  height?: number
  /** Accent hue of this motion clip (stroke + figure). */
  color: string
  pose: MotionPose
  /** Dashed outline — a motion that was never in the dataset. */
  dashed?: boolean
  /** Highlighted while its clip streams into the network. */
  active?: boolean
}

/**
 * A tiny motion-capture clip: a rounded video card with a stick figure
 * frozen mid-move, drawn in the clip's hue. Centered on the local origin.
 */
export function MotionCard({
  width = 64,
  height = 40,
  color,
  pose,
  dashed = false,
  active = false,
}: MotionCardProps) {
  const w = width
  const h = height
  return (
    <g className={`motion-card${active ? ' active' : ''}`} aria-hidden>
      <rect
        className="motion-card-halo"
        x={-w / 2 - 3}
        y={-h / 2 - 3}
        width={w + 6}
        height={h + 6}
        rx={11}
        fill="none"
        stroke={color}
        strokeWidth={5}
      />
      <rect
        x={-w / 2}
        y={-h / 2}
        width={w}
        height={h}
        rx={8}
        fill="var(--diagram-surface)"
        stroke={color}
        strokeWidth={1.6}
        strokeDasharray={dashed ? '5 4' : undefined}
      />
      <g transform="translate(-6 1)">
        <PoseGlyph pose={pose} color={color} />
      </g>
      {/* clip marker */}
      <path
        d={`M ${w / 2 - 15} -4 L ${w / 2 - 7} 0.5 L ${w / 2 - 15} 5 Z`}
        fill={color}
        opacity={0.85}
      />
    </g>
  )
}

/** Minimal stick figure, ~24 units tall, centered on the local origin. */
function PoseGlyph({ pose, color }: { pose: MotionPose; color: string }) {
  const s = {
    stroke: color,
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  }

  switch (pose) {
    case 'walk':
      return (
        <g {...s}>
          <circle cx={1} cy={-10} r={3.1} />
          <path d="M 1 -6.5 L 0 2" />
          <path d="M 0.5 -4 L -6 1" />
          <path d="M 0.5 -4 L 7 -2" />
          <path d="M 0 2 L -6 10" />
          <path d="M 0 2 L 6 9" />
        </g>
      )
    case 'wiggle':
      // Standing slightly sideways, both forearms pumping up.
      return (
        <g {...s} transform="rotate(-12)">
          <circle cx={0} cy={-10} r={3.1} />
          <path d="M 0 -6.5 L 0 2" />
          <path d="M 0 -4 L -5.5 -1.5 L -8 -8" />
          <path d="M 0 -4 L 5.5 -1.5 L 8 -8" />
          <path d="M 0 2 L -2.5 10" />
          <path d="M 0 2 L 3 10" />
        </g>
      )
    case 'jump':
      return (
        <g {...s}>
          <circle cx={0} cy={-12} r={3.1} />
          <path d="M 0 -8.5 L 0 0" />
          <path d="M 0 -6 L -7 -13" />
          <path d="M 0 -6 L 7 -13" />
          <path d="M 0 0 L -5 3.5 L -3.5 8.5" />
          <path d="M 0 0 L 5 3.5 L 3.5 8.5" />
        </g>
      )
    case 'kick':
      return (
        <g {...s}>
          <circle cx={-1} cy={-10} r={3.1} />
          <path d="M -1 -6.5 L 0 2" />
          <path d="M -0.5 -4 L -7 -7.5" />
          <path d="M -0.5 -4 L 6 -2" />
          <path d="M 0 2 L -2 10" />
          <path d="M 0 2 L 9.5 3.5" />
        </g>
      )
    case 'sidewiggle':
      // Leaning, both arms to one side — one extended, one across the
      // body — with motion ticks where they point.
      return (
        <g {...s} transform="rotate(-10)">
          <circle cx={0} cy={-10} r={3.1} />
          <path d="M 0 -6.5 L 0 2" />
          <path d="M 0 -4 L -9 -6.5" />
          <path d="M 2.5 -3.5 L -7 -1.5" />
          <path d="M 0 2 L -2.5 10" />
          <path d="M 0 2 L 3 10" />
          <path d="M -10.5 -10 l 1.5 1" opacity={0.6} />
          <path d="M -11.5 -8 l 1.5 1" opacity={0.6} />
        </g>
      )
    case 'wave':
      // One arm up waving, small arcs near the hand.
      return (
        <g {...s}>
          <circle cx={-1} cy={-10} r={3.1} />
          <path d="M -1 -6.5 L 0 2" />
          <path d="M -0.5 -4 L 6 -12" />
          <path d="M -0.5 -4 L -6 0" />
          <path d="M 0 2 L -2.5 10" />
          <path d="M 0 2 L 3 10" />
          <path d="M 8 -14 A 5 5 0 0 1 9.5 -10" strokeDasharray="2 2.5" opacity={0.6} />
          <path d="M 3.5 -15.5 A 5 5 0 0 0 2.5 -12" strokeDasharray="2 2.5" opacity={0.6} />
        </g>
      )
    case 'leap':
      // Fully extended leap: arms high, air lines under the feet.
      return (
        <g {...s}>
          <circle cx={0} cy={-13} r={3.1} />
          <path d="M 0 -9.5 L 0 -1" />
          <path d="M 0 -7 L -6 -15" />
          <path d="M 0 -7 L 6 -15" />
          <path d="M 0 -1 L -4 6" />
          <path d="M 0 -1 L 4 6" />
          <path d="M -4.5 9.5 l 2.5 0.8" opacity={0.6} />
          <path d="M 2 10.3 l 2.5 -0.8" opacity={0.6} />
        </g>
      )
  }
}

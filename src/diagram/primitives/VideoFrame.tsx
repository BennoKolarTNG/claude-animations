interface VideoFrameProps {
  width?: number
  height?: number
}

/**
 * A minimal video-frame glyph centered on the local origin: rounded
 * frame with a small human figure in shot, a play triangle, and a
 * progress bar — unmistakably a video of a person.
 */
export function VideoFrame({ width = 86, height = 58 }: VideoFrameProps) {
  const w = width
  const h = height
  // Figure proportions relative to the frame.
  const cx = -w * 0.16
  const headR = h * 0.11
  const headY = -h * 0.08
  return (
    <g aria-hidden>
      <rect
        x={-w / 2}
        y={-h / 2}
        width={w}
        height={h}
        rx={9}
        fill="var(--diagram-surface)"
        stroke="var(--diagram-accent-input)"
        strokeWidth={1.6}
      />
      {/* Human in shot: head + shoulders, cropped by the frame bottom. */}
      <g stroke="var(--diagram-accent-input)" fill="none" strokeWidth={1.6}>
        <circle cx={cx} cy={headY} r={headR} />
        <path
          d={`M ${cx - headR * 2.1} ${h / 2 - 9}
              Q ${cx - headR * 1.9} ${headY + headR * 1.6} ${cx} ${headY + headR * 1.5}
              Q ${cx + headR * 1.9} ${headY + headR * 1.6} ${cx + headR * 2.1} ${h / 2 - 9}`}
        />
      </g>
      {/* Play triangle */}
      <path
        d={`M ${w / 2 - 22} -6 L ${w / 2 - 11} 0.5 L ${w / 2 - 22} 7 Z`}
        fill="var(--diagram-accent-input)"
      />
      {/* Progress bar along the bottom edge */}
      <line
        x1={-w / 2 + 8}
        y1={h / 2 - 5}
        x2={w / 2 - 8}
        y2={h / 2 - 5}
        stroke="var(--diagram-accent-input)"
        strokeWidth={1.4}
        opacity={0.25}
        strokeLinecap="round"
      />
      <line
        x1={-w / 2 + 8}
        y1={h / 2 - 5}
        x2={-w * 0.1}
        y2={h / 2 - 5}
        stroke="var(--diagram-accent-input)"
        strokeWidth={1.4}
        opacity={0.7}
        strokeLinecap="round"
      />
    </g>
  )
}

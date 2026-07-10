import type { ReactNode } from 'react'

export type ModuleShape = 'trapezoid' | 'layers' | 'chip'

interface EncoderModuleProps {
  /** Left edge. */
  x: number
  /** Vertical center. */
  y: number
  length?: number
  /** Half-height of the wide face. */
  inletRadius?: number
  /** Half-height of the narrow (latent) face. */
  outletRadius?: number
  shape?: ModuleShape
  /** encode: wide→narrow, plug on the right. decode: mirrored. */
  direction?: 'encode' | 'decode'
  /** Module hue — used for the face edge and the active interior tint. */
  color?: string
  active?: boolean
  dashed?: boolean
}

/**
 * An encoder/decoder module with a plug stub that docks into the latent
 * board's sockets. Deliberately NOT the tapered pipe of the RL diagrams:
 * these are learned, swappable modules, drawn in standard ML iconography
 * (trapezoid) or as alternatives (layer stack, chip).
 */
export function EncoderModule({
  x,
  y,
  length = 105,
  inletRadius: H = 26,
  outletRadius: h = 12,
  shape = 'trapezoid',
  direction = 'encode',
  color = 'var(--diagram-accent-input)',
  active = false,
  dashed = false,
}: EncoderModuleProps) {
  const stroke = active ? 'var(--diagram-ink)' : 'var(--diagram-line)'
  const dash = dashed ? '5 4' : undefined
  const plugLen = 15
  const bodyLen = length - plugLen

  const common = {
    stroke,
    strokeWidth: 1.5,
    strokeDasharray: dash,
    strokeLinejoin: 'round' as const,
    style: { transition: 'stroke 600ms ease' },
  }

  let body: ReactNode
  if (shape === 'trapezoid') {
    const d = `M 0 ${-H} L ${bodyLen} ${-h} L ${bodyLen} ${h} L 0 ${H} Z`
    body = (
      <>
        <path d={d} fill="var(--diagram-surface)" {...common} />
        <path
          d={d}
          fill={color}
          stroke="none"
          opacity={active ? 0.13 : 0}
          style={{ transition: 'opacity 600ms ease' }}
        />
        {/* input face edge in the module's hue */}
        <rect x={0.75} y={-H + 2} width={3.5} height={H * 2 - 4} rx={1.75} fill={color} opacity={dashed ? 0.5 : 0.85} />
      </>
    )
  } else if (shape === 'layers') {
    const heights = [H * 2, H * 1.5, H * 1.05, h * 2 + 6]
    body = (
      <>
        <line x1={5} y1={0} x2={bodyLen - 4} y2={0} stroke={stroke} strokeWidth={1.2} opacity={0.5} strokeDasharray={dash} />
        {heights.map((hh, i) => (
          <rect
            key={i}
            x={i * 21}
            y={-hh / 2}
            width={11}
            height={hh}
            rx={5}
            fill="var(--diagram-surface)"
            {...common}
          />
        ))}
        <rect x={0.75} y={-H + 1} width={3.5} height={H * 2 - 2} rx={1.75} fill={color} opacity={dashed ? 0.5 : 0.85} />
      </>
    )
  } else {
    // chip
    body = (
      <>
        <rect x={0} y={-H + 3} width={bodyLen} height={H * 2 - 6} rx={8} fill="var(--diagram-surface)" {...common} />
        <rect x={-2.5} y={-11} width={6} height={22} rx={2.5} fill="var(--diagram-bg)" stroke={stroke} strokeWidth={1.3} strokeDasharray={dash} />
        {[26, 44, 62].map((cx, i) => (
          <path
            key={cx}
            d={`M ${cx - 4} -8 L ${cx + 4} 0 L ${cx - 4} 8`}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.4 + i * 0.25}
          />
        ))}
      </>
    )
  }

  return (
    <g
      transform={`translate(${x + length / 2} ${y}) scale(${direction === 'decode' ? -1 : 1} 1) translate(${-length / 2} 0)`}
      aria-hidden
    >
      {body}
      {/* plug stub that docks into a latent-board socket */}
      <rect
        x={bodyLen - 1}
        y={-7}
        width={plugLen}
        height={14}
        rx={3}
        fill="var(--diagram-surface)"
        {...common}
      />
    </g>
  )
}

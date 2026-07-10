import type { CSSVarStyle } from '../diagramTokens'

/** A skill hue an edge can permanently take on once learned. */
export interface EdgeSkill {
  color: string
  learned: boolean
}

interface NeuralNetworkProps {
  /** Nodes per layer, left to right. */
  layers?: number[]
  width?: number
  height?: number
  nodeRadius?: number
  /** Edges draw themselves in when true. */
  drawn: boolean
  /** Nodes light up in a staggered pattern when true. */
  pulsing?: boolean
  /** Accent colors cycled across pulsing nodes. */
  pulseColors?: string[]
  /**
   * Skills distributed across the edges (edge i ↦ skills[i % n]).
   * A learned skill tints its edges in its hue — the network visibly
   * accumulates abilities.
   */
  edgeSkills?: EdgeSkill[]
  edgeColor?: string
  nodeStroke?: string
}

/**
 * A small feed-forward network rendered around the local origin (0,0).
 * Wrap in a positioned <g> to place it. Edges draw in with a staggered
 * dash animation; nodes can pulse with per-node delays so activations
 * feel organic rather than mechanical.
 */
export function NeuralNetwork({
  layers = [3, 4, 3],
  width = 120,
  height = 110,
  nodeRadius = 7,
  drawn,
  pulsing = false,
  pulseColors = ['var(--diagram-accent-latent)', 'var(--diagram-accent-input)', 'var(--diagram-accent-action)'],
  edgeSkills,
  edgeColor = 'var(--diagram-line)',
  nodeStroke = 'var(--diagram-ink)',
}: NeuralNetworkProps) {
  const positions = layers.map((n, li) => {
    const x =
      layers.length === 1 ? 0 : -width / 2 + (width * li) / (layers.length - 1)
    return Array.from({ length: n }, (_, j) => ({
      x,
      y: n === 1 ? 0 : -height / 2 + (height * j) / (n - 1),
    }))
  })

  const edges: { x1: number; y1: number; x2: number; y2: number; d: number }[] =
    []
  for (let li = 0; li < positions.length - 1; li++) {
    for (const a of positions[li]) {
      for (const b of positions[li + 1]) {
        edges.push({
          x1: a.x,
          y1: a.y,
          x2: b.x,
          y2: b.y,
          d: li * 0.18 + edges.length * 0.012,
        })
      }
    }
  }

  let nodeIndex = 0
  const classNames = ['nn', drawn ? 'drawn' : '', pulsing ? 'pulsing' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <g className={classNames} aria-hidden>
      {edges.map((e, i) => {
        const skill = edgeSkills?.length
          ? edgeSkills[i % edgeSkills.length]
          : undefined
        return (
          <line
            key={`e${i}`}
            className="nn-edge"
            x1={e.x1}
            y1={e.y1}
            x2={e.x2}
            y2={e.y2}
            pathLength={1}
            stroke={skill?.learned ? skill.color : edgeColor}
            strokeOpacity={skill?.learned ? 0.75 : 1}
            strokeWidth={skill?.learned ? 1.4 : 1.1}
            style={{ '--d': `${e.d}s` } as CSSVarStyle}
          />
        )
      })}
      {positions.flat().map((p, i) => {
        const color = pulseColors[nodeIndex % pulseColors.length]
        const delay = (nodeIndex * 0.53) % 2.4
        nodeIndex++
        const style: CSSVarStyle = {
          '--d': `${delay}s`,
          '--pulse-color': color,
        }
        return (
          <g key={`n${i}`} transform={`translate(${p.x} ${p.y})`}>
            <circle
              className="nn-halo"
              r={nodeRadius * 2.1}
              fill={color}
              style={style}
            />
            <circle
              className="nn-node"
              r={nodeRadius}
              fill="var(--diagram-surface)"
              stroke={nodeStroke}
              strokeWidth={1.5}
              style={style}
            />
          </g>
        )
      })}
    </g>
  )
}

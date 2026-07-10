interface StageLabelProps {
  x: number
  y: number
  text: string
  active: boolean
  accent: string
}

/** Small-caps stage label with an accent dot that lights up when active. */
export function StageLabel({ x, y, text, active, accent }: StageLabelProps) {
  return (
    <g>
      <text
        className={`diagram-label${active ? ' active' : ''}`}
        x={x}
        y={y}
        textAnchor="middle"
      >
        {text}
      </text>
      <circle
        className={`diagram-label-dot${active ? ' active' : ''}`}
        cx={x}
        cy={y + 12}
        r={2.5}
        fill={accent}
      />
    </g>
  )
}

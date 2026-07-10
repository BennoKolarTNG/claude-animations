/**
 * A dancing human for "video" panels — either a solid silhouette (the
 * raw footage) or its ViTPose-style skeleton (dots + colored bones).
 *
 * Built on the same limb rig and CSS move classes as RobotDancer, so a
 * silhouette, a keypoint overlay and a skeleton twin mounted at the
 * same time dance in perfect frame-sync. Local origin at the feet;
 * ~78 units tall.
 */
interface HumanDancerProps {
  variant: 'solid' | 'dots' | 'bones' | 'skeleton'
  /** Per-side colors for skeleton variants (ViTPose convention). */
  colors?: { torso: string; left: string; right: string }
  dancing?: boolean
}

const DEFAULT_COLORS = { torso: '#3399ff', left: '#22c55e', right: '#f97316' }

export function HumanDancer({
  variant,
  colors = DEFAULT_COLORS,
  dancing = true,
}: HumanDancerProps) {
  const solid = variant === 'solid'
  const showDots = variant === 'dots' || variant === 'skeleton'
  const showBones = variant === 'bones' || variant === 'skeleton' || solid
  const boneW = solid ? 7 : 2.2
  const c = solid
    ? { torso: 'var(--diagram-ink)', left: 'var(--diagram-ink)', right: 'var(--diagram-ink)' }
    : colors

  const dot = (x: number, y: number, color: string, r = 2.6) => (
    <circle cx={x} cy={y} r={r} fill={color} />
  )

  return (
    <g className={`robot${dancing ? ' move-disco' : ''}`} aria-hidden>
      <g className="robot-sway">
        {/* legs pivot at the hips */}
        <g className="robot-leg robot-leg-left">
          {showBones && (
            <line x1={-6} y1={-30} x2={-10} y2={-2} stroke={c.left} strokeWidth={boneW} strokeLinecap="round" />
          )}
          {showDots && dot(-10, -2, c.left)}
        </g>
        <g className="robot-leg robot-leg-right">
          {showBones && (
            <line x1={6} y1={-30} x2={10} y2={-2} stroke={c.right} strokeWidth={boneW} strokeLinecap="round" />
          )}
          {showDots && dot(10, -2, c.right)}
        </g>

        <g className="robot-bounce">
          {/* arms pivot at the shoulders */}
          <g className="robot-arm robot-arm-left">
            {showBones && (
              <line x1={-11} y1={-50} x2={-16} y2={-30} stroke={c.left} strokeWidth={boneW * 0.85} strokeLinecap="round" />
            )}
            {showDots && dot(-16, -30, c.left)}
          </g>
          <g className="robot-arm robot-arm-right">
            {showBones && (
              <line x1={11} y1={-50} x2={16} y2={-30} stroke={c.right} strokeWidth={boneW * 0.85} strokeLinecap="round" />
            )}
            {showDots && dot(16, -30, c.right)}
          </g>

          {/* torso */}
          {solid ? (
            <rect x={-11} y={-56} width={22} height={28} rx={10} fill={c.torso} />
          ) : (
            showBones && (
              <g stroke={c.torso} strokeWidth={2.2} strokeLinecap="round">
                <line x1={-11} y1={-50} x2={11} y2={-50} />
                <line x1={0} y1={-50} x2={0} y2={-30} />
                <line x1={-6} y1={-30} x2={6} y2={-30} />
              </g>
            )
          )}
          {showDots && (
            <>
              {dot(-11, -50, c.torso)}
              {dot(11, -50, c.torso)}
              {dot(-6, -30, c.torso)}
              {dot(6, -30, c.torso)}
            </>
          )}

          <g className="robot-head">
            {solid ? (
              <circle cx={0} cy={-65} r={8.5} fill={c.torso} />
            ) : (
              <>
                {showBones && (
                  <line x1={0} y1={-56} x2={0} y2={-50} stroke={c.torso} strokeWidth={2.2} strokeLinecap="round" />
                )}
                {showDots && dot(0, -63, c.torso, 4)}
              </>
            )}
          </g>
        </g>
      </g>
    </g>
  )
}

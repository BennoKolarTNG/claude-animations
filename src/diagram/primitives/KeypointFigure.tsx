import type { CSSVarStyle } from '../diagramTokens'

/**
 * A minimal COCO-style human pose: named joint positions in local
 * coordinates (y down, origin at the pelvis, ~64 units tall).
 */
export interface Pose {
  head: [number, number]
  neck: [number, number]
  lShoulder: [number, number]
  rShoulder: [number, number]
  lElbow: [number, number]
  rElbow: [number, number]
  lWrist: [number, number]
  rWrist: [number, number]
  pelvis: [number, number]
  lHip: [number, number]
  rHip: [number, number]
  lKnee: [number, number]
  rKnee: [number, number]
  lAnkle: [number, number]
  rAnkle: [number, number]
}

type JointName = keyof Pose

/** Skeleton edges, grouped the way pose estimators color them:
 * torso, left limbs, right limbs. */
const BONES: { from: JointName; to: JointName; group: 'torso' | 'left' | 'right' }[] = [
  { from: 'head', to: 'neck', group: 'torso' },
  { from: 'neck', to: 'pelvis', group: 'torso' },
  { from: 'lShoulder', to: 'rShoulder', group: 'torso' },
  { from: 'lHip', to: 'rHip', group: 'torso' },
  { from: 'neck', to: 'lShoulder', group: 'torso' },
  { from: 'neck', to: 'rShoulder', group: 'torso' },
  { from: 'pelvis', to: 'lHip', group: 'torso' },
  { from: 'pelvis', to: 'rHip', group: 'torso' },
  { from: 'lShoulder', to: 'lElbow', group: 'left' },
  { from: 'lElbow', to: 'lWrist', group: 'left' },
  { from: 'lHip', to: 'lKnee', group: 'left' },
  { from: 'lKnee', to: 'lAnkle', group: 'left' },
  { from: 'rShoulder', to: 'rElbow', group: 'right' },
  { from: 'rElbow', to: 'rWrist', group: 'right' },
  { from: 'rHip', to: 'rKnee', group: 'right' },
  { from: 'rKnee', to: 'rAnkle', group: 'right' },
]

/** A handful of dance poses, reused across frames and diagrams. */
export const POSES: Record<string, Pose> = {
  // Arms up mid-groove, weight on the right leg.
  groove: {
    head: [2, -58], neck: [1, -48],
    lShoulder: [-9, -45], rShoulder: [11, -45],
    lElbow: [-18, -55], rElbow: [20, -52],
    lWrist: [-14, -68], rWrist: [30, -60],
    pelvis: [0, -26], lHip: [-7, -26], rHip: [7, -26],
    lKnee: [-10, -13], rKnee: [9, -13],
    lAnkle: [-14, 0], rAnkle: [8, 0],
  },
  // Classic disco point: one arm high, hips shifted.
  point: {
    head: [-3, -58], neck: [-2, -48],
    lShoulder: [-12, -45], rShoulder: [8, -45],
    lElbow: [-20, -36], rElbow: [18, -54],
    lWrist: [-24, -26], rWrist: [28, -66],
    pelvis: [-2, -26], lHip: [-9, -26], rHip: [5, -26],
    lKnee: [-11, -13], rKnee: [7, -13],
    lAnkle: [-12, 0], rAnkle: [10, 0],
  },
  // Side lunge, arms sweeping level.
  lunge: {
    head: [6, -55], neck: [5, -45],
    lShoulder: [-5, -42], rShoulder: [15, -42],
    lElbow: [-18, -44], rElbow: [28, -44],
    lWrist: [-30, -46], rWrist: [40, -46],
    pelvis: [4, -24], lHip: [-3, -24], rHip: [11, -24],
    lKnee: [-14, -12], rKnee: [16, -12],
    lAnkle: [-24, 0], rAnkle: [18, 0],
  },
  // Knee raised mid-step, arms counterposed.
  step: {
    head: [0, -57], neck: [0, -47],
    lShoulder: [-10, -44], rShoulder: [10, -44],
    lElbow: [-16, -34], rElbow: [16, -54],
    lWrist: [-12, -24], rWrist: [12, -62],
    pelvis: [0, -25], lHip: [-7, -25], rHip: [7, -25],
    lKnee: [-8, -12], rKnee: [12, -18],
    lAnkle: [-9, 0], rAnkle: [14, -8],
  },
  // Both arms overhead, feet together — a finish pose.
  reach: {
    head: [0, -60], neck: [0, -50],
    lShoulder: [-9, -47], rShoulder: [9, -47],
    lElbow: [-15, -58], rElbow: [15, -58],
    lWrist: [-11, -70], rWrist: [11, -70],
    pelvis: [0, -27], lHip: [-6, -27], rHip: [6, -27],
    lKnee: [-7, -13], rKnee: [7, -13],
    lAnkle: [-8, 0], rAnkle: [8, 0],
  },
}

export const POSE_SEQUENCE: Pose[] = [
  POSES.groove,
  POSES.point,
  POSES.lunge,
  POSES.step,
  POSES.reach,
]

interface KeypointFigureProps {
  pose: Pose
  /** Uniform scale (poses are ~64 units tall at scale 1). */
  scale?: number
  /** Show the joint dots. */
  dots?: boolean
  /** Show the skeleton bones. */
  bones?: boolean
  /** One color, or pose-estimator style per-group colors. */
  color?: string | { torso: string; left: string; right: string }
  /** Dashed bones + hollow dots — a generated/inferred pose. */
  ghost?: boolean
  dotRadius?: number
  boneWidth?: number
  /** Stagger class for pop-in animation (see .kp-pop in diagram.css). */
  popIn?: boolean
  /** Extra base delay (s) added to every element's pop stagger. */
  popDelay?: number
}

/**
 * A pose-estimation style human figure: joint keypoints and colored
 * skeleton bones, the way ViTPose/COCO overlays draw them. Poses are
 * plain data, so figures can be posed per frame, ghosted for generated
 * motion, or morphed by swapping poses (bones/dots transition).
 */
export function KeypointFigure({
  pose,
  scale = 1,
  dots = true,
  bones = true,
  color = 'var(--diagram-accent-input)',
  ghost = false,
  dotRadius = 2.2,
  boneWidth = 2,
  popIn = false,
  popDelay = 0,
}: KeypointFigureProps) {
  const c = (group: 'torso' | 'left' | 'right') =>
    typeof color === 'string' ? color : color[group]
  const P = (j: JointName): [number, number] => [
    pose[j][0] * scale,
    pose[j][1] * scale,
  ]
  const joints = Object.keys(pose) as JointName[]

  return (
    <g aria-hidden>
      {bones &&
        BONES.map((b, i) => {
          const [x1, y1] = P(b.from)
          const [x2, y2] = P(b.to)
          return (
            <line
              key={i}
              className={popIn ? 'kp-pop' : undefined}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={c(b.group)}
              strokeWidth={boneWidth}
              strokeLinecap="round"
              strokeDasharray={ghost ? '3 3' : undefined}
              opacity={ghost ? 0.65 : 1}
              style={
                popIn
                  ? ({ '--d': `${popDelay + 0.25 + i * 0.03}s` } as CSSVarStyle)
                  : undefined
              }
            />
          )
        })}
      {/* head marker: a slightly bigger dot reads as the head */}
      <circle
        className={popIn ? 'kp-pop' : undefined}
        cx={P('head')[0]}
        cy={P('head')[1] - 2.5 * scale}
        r={dotRadius * 1.9}
        fill={ghost ? 'none' : c('torso')}
        stroke={c('torso')}
        strokeWidth={ghost ? 1.4 : 0}
        strokeDasharray={ghost ? '2 2' : undefined}
        opacity={ghost ? 0.65 : 1}
        style={popIn ? ({ '--d': `${popDelay}s` } as CSSVarStyle) : undefined}
      />
      {dots &&
        joints.map((j, i) => {
          const [x, y] = P(j)
          const group =
            j.startsWith('l') ? 'left' : j.startsWith('r') ? 'right' : 'torso'
          return (
            <circle
              key={j}
              className={popIn ? 'kp-pop' : undefined}
              cx={x}
              cy={y}
              r={dotRadius}
              fill={ghost ? 'var(--diagram-surface)' : c(group)}
              stroke={ghost ? c(group) : 'none'}
              strokeWidth={ghost ? 1.2 : 0}
              opacity={ghost ? 0.65 : 1}
              style={
                popIn
                  ? ({ '--d': `${popDelay + i * 0.045}s` } as CSSVarStyle)
                  : undefined
              }
            />
          )
        })}
    </g>
  )
}

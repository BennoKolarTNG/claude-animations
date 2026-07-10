import { useRef } from 'react'
import { DiagramFrame } from './DiagramFrame'
import { Pipe } from './primitives/Pipe'
import { FlowParticles } from './primitives/FlowParticles'
import { NeuralNetwork } from './primitives/NeuralNetwork'
import { TrainingLoop } from './primitives/TrainingLoop'
import { RobotDancer, type RobotMove } from './primitives/RobotDancer'
import { MotionCard, type MotionPose } from './primitives/MotionCard'
import { WindGust } from './primitives/WindGust'
import { StageLabel } from './primitives/StageLabel'
import { useOnScreen, usePrefersReducedMotion, useTimeline } from './useTimeline'
import type { CSSVarStyle, DiagramTheme } from './diagramTokens'

/**
 * Each motion owns a hue. The network's edges gradually take on the hues
 * it has learned — and the out-of-distribution dances arrive in colors
 * the network has never seen.
 */
const SKILLS: { key: string; pose: MotionPose; color: string }[] = [
  { key: 'walk', pose: 'walk', color: '#4f8cff' }, // blue
  { key: 'wiggle', pose: 'wiggle', color: '#eab308' }, // yellow
  { key: 'jump', pose: 'jump', color: '#14b8a6' }, // teal
  { key: 'kick', pose: 'kick', color: '#dc2626' }, // red
]

/** Never-seen requests, performed one after another once deployed. */
const UNSEEN: {
  key: string
  pose: MotionPose
  color: string
  move: RobotMove
  x: number
}[] = [
  { key: 'sidewiggle', pose: 'sidewiggle', color: '#8b5cf6', move: 'sidewiggle', x: 664 },
  { key: 'wave', pose: 'wave', color: '#ec4899', move: 'wave', x: 744 },
  { key: 'leap', pose: 'leap', color: '#f97316', move: 'jump', x: 824 },
]

const PHASES = [
  { name: 'dataset', duration: 1700, caption: 'Not one clip — a whole library of motions.' },
  { name: 'trainWalk', duration: 2000, caption: 'Walking streams into the network…' },
  { name: 'trainWiggle', duration: 2000, caption: '…then the arm wiggle…' },
  { name: 'trainJump', duration: 2000, caption: '…then jumping…' },
  { name: 'trainKick', duration: 2000, caption: '…then kicking — and thousands more.' },
  { name: 'deploy', duration: 2400, caption: 'One policy now holds every motion.' },
  { name: 'ood1', duration: 2600, caption: 'An arm wiggle it never saw? No problem.' },
  { name: 'ood2', duration: 1400, caption: 'A wave it never learned…' },
  { name: 'wind', duration: 2600, caption: '…even as a gust of wind hits: stumble, recover, wave on.' },
  { name: 'ood3', duration: 2400, caption: 'A jump it was never taught — landed.' },
  { name: 'reset', duration: 900, caption: '…and the dataset keeps growing.' },
] as const

type PhaseName = (typeof PHASES)[number]['name']
const PHASE_INDEX = Object.fromEntries(
  PHASES.map((p, i) => [p.name, i]),
) as Record<PhaseName, number>

/** Which phase teaches which skill — one at a time. */
const SKILL_PHASE: PhaseName[] = ['trainWalk', 'trainWiggle', 'trainJump', 'trainKick']

/** Which phases each unseen request is being performed in. */
const UNSEEN_PHASES: PhaseName[][] = [['ood1'], ['ood2', 'wind'], ['ood3']]

// --- layout constants (SVG user units) --------------------------------------
const CARD = { x: 90, w: 64, h: 40, ys: [110, 158, 206, 254] }
const FUNNEL = { x: 170, length: 140, r1: 52, r2: 16, y: 190 }
const NET = { x: 470, y: 190, layers: [3, 5, 5, 3], w: 170, h: 160 }
const LOOP = { x: 606, y: 88, r: 22 }
const UNSEEN_Y = 104
const ROBOT = { x: 830, y: 306 }
const GROUND = { x1: 700, x2: 930, y: 306 }
const LABEL_Y = 356

export interface GeneralistMotionPolicyDiagramProps {
  title?: string
  showCaption?: boolean
  theme?: DiagramTheme
  className?: string
}

/**
 * The generalist counterpart to the specialist pipeline: a whole dataset
 * of motions streams, skill by skill, into ONE large network. Its edges
 * accumulate every skill's hue; once deployed, the robot performs a series
 * of never-seen motions — surviving a gust of wind along the way.
 */
export function GeneralistMotionPolicyDiagram({
  title = 'A generalist motion policy: many motion clips train one large network, which then performs a series of unseen motions and recovers from a shove of wind.',
  showCaption = true,
  theme,
  className,
}: GeneralistMotionPolicyDiagramProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const reducedMotion = usePrefersReducedMotion()
  const onScreen = useOnScreen(rootRef)
  const staticMode = reducedMotion
  const { phase, index } = useTimeline([...PHASES], !staticMode && onScreen)

  const at = (n: PhaseName) => !staticMode && phase === n
  const between = (a: PhaseName, b: PhaseName) =>
    !staticMode && index >= PHASE_INDEX[a] && index <= PHASE_INDEX[b]

  const training = between('trainWalk', 'trainKick')
  const learned = (skillIdx: number) =>
    staticMode ||
    (index >= PHASE_INDEX[SKILL_PHASE[skillIdx]] && phase !== 'reset')
  const streaming = (skillIdx: number) => at(SKILL_PHASE[skillIdx])
  const performing = (unseenIdx: number) =>
    UNSEEN_PHASES[unseenIdx].some((p) => at(p))
  const anyUnseenVisible = staticMode || between('ood1', 'ood3')

  // --- per-element visual state ---------------------------------------------
  const edgeSkills = SKILLS.map((s, i) => ({
    color: s.color,
    learned: learned(i),
  }))

  const activeUnseen = UNSEEN.findIndex((_, i) => performing(i))
  const netPulseColors = staticMode
    ? SKILLS.map((s) => s.color)
    : activeUnseen >= 0
      ? [UNSEEN[activeUnseen].color]
      : at('deploy')
        ? SKILLS.map((s) => s.color)
        : SKILLS.filter((_, i) => streaming(i)).map((s) => s.color)

  const robotMove: RobotMove =
    activeUnseen >= 0 ? UNSEEN[activeUnseen].move : 'wiggle'
  const robotAccent = activeUnseen >= 0 ? UNSEEN[activeUnseen].color : '#eab308'
  const robotActive = staticMode || between('deploy', 'ood3')

  // Map a card's vertical position to where its stream enters the funnel.
  const funnelEntryY = (cardY: number) =>
    FUNNEL.y + (cardY - FUNNEL.y) * 0.55

  const caption = staticMode
    ? 'One giant dataset, one policy, any motion.'
    : PHASES[index].caption

  return (
    <div ref={rootRef} className={className}>
      <DiagramFrame
        title={title}
        viewBox="0 40 960 340"
        theme={theme}
        caption={showCaption ? caption : undefined}
        captionKey={staticMode ? 'static' : index}
      >
        {/* --- dataset column ------------------------------------------------ */}
        {/* Implied volume: page-stack shadows behind the card column. */}
        {[12, 6].map((o, i) => (
          <rect
            key={o}
            x={CARD.x - CARD.w / 2 + o}
            y={CARD.ys[0] - CARD.h / 2 + o}
            width={CARD.w}
            height={CARD.ys[CARD.ys.length - 1] - CARD.ys[0] + CARD.h}
            rx={10}
            fill="var(--diagram-bg)"
            stroke="var(--diagram-line)"
            strokeWidth={1.2}
            opacity={i === 0 ? 0.4 : 0.7}
          />
        ))}
        {SKILLS.map((s, i) => {
          const visible = staticMode || phase !== 'reset'
          // While one clip streams in, the others step back a little.
          const dimmed = training && !streaming(i)
          const style: CSSVarStyle = {
            transform: `translate(${CARD.x}px, ${CARD.ys[i]}px)`,
            opacity: !visible ? 0 : dimmed ? 0.35 : 1,
            transitionDelay: at('dataset') ? `${i * 110}ms` : '0ms',
          }
          return (
            <g key={s.key} className="stage" style={style}>
              <MotionCard color={s.color} pose={s.pose} active={streaming(i)} />
            </g>
          )
        })}
        {/* …and many more */}
        {[-12, 0, 12].map((dx) => (
          <circle
            key={dx}
            cx={CARD.x + dx}
            cy={292}
            r={2.2}
            fill="var(--diagram-muted)"
            opacity={0.8}
          />
        ))}
        <text className="diagram-sublabel" x={CARD.x} y={318} textAnchor="middle">
          × 10,000 clips
        </text>

        {/* --- funnel + streams ---------------------------------------------- */}
        <Pipe
          x={FUNNEL.x}
          y={FUNNEL.y}
          length={FUNNEL.length}
          inletRadius={FUNNEL.r1}
          outletRadius={FUNNEL.r2}
          active={training || staticMode}
          accent="var(--diagram-glow)"
        />
        {SKILLS.map((s, i) => (
          <FlowParticles
            key={`card-stream-${s.key}`}
            x={CARD.x + CARD.w / 2 + 4}
            y={CARD.ys[i]}
            y2={funnelEntryY(CARD.ys[i])}
            dx={FUNNEL.x - CARD.x - CARD.w / 2 - 2}
            spreadStart={4}
            spreadEnd={3}
            count={4}
            duration={0.8}
            radius={2.1}
            color={s.color}
            active={streaming(i)}
          />
        ))}
        {SKILLS.map((s, i) => (
          <FlowParticles
            key={`funnel-stream-${s.key}`}
            x={FUNNEL.x + 6}
            y={FUNNEL.y}
            dx={FUNNEL.length - 8}
            spreadStart={34}
            spreadEnd={9}
            count={6}
            duration={1.0}
            color={s.color}
            active={streaming(i)}
          />
        ))}
        {SKILLS.map((s, i) => (
          <FlowParticles
            key={`net-stream-${s.key}`}
            x={FUNNEL.x + FUNNEL.length + 4}
            y={FUNNEL.y}
            dx={NET.x - NET.w / 2 - FUNNEL.x - FUNNEL.length - 10}
            spreadStart={8}
            spreadEnd={46}
            count={5}
            duration={0.9}
            color={s.color}
            active={streaming(i)}
          />
        ))}

        {/* --- the one big network -------------------------------------------- */}
        <g transform={`translate(${NET.x} ${NET.y})`}>
          <NeuralNetwork
            layers={NET.layers}
            width={NET.w}
            height={NET.h}
            nodeRadius={6.5}
            drawn={staticMode || phase !== 'reset'}
            pulsing={staticMode || netPulseColors.length > 0}
            pulseColors={netPulseColors.length ? netPulseColors : ['var(--diagram-accent-latent)']}
            edgeSkills={edgeSkills}
          />
        </g>

        {/* training-loop badge, spinning while data streams in */}
        <g
          className="stage"
          style={{
            transform: `translate(${LOOP.x}px, ${LOOP.y}px) scale(${training || staticMode ? 1 : 0.7})`,
            opacity: training ? 1 : staticMode ? 0.35 : 0,
          }}
        >
          <TrainingLoop radius={LOOP.r} spinning={training} strokeWidth={5} />
        </g>

        {/* --- never-seen requests --------------------------------------------- */}
        {UNSEEN.map((u, i) => {
          const firstPhase = UNSEEN_PHASES[i][0]
          const appeared =
            staticMode ||
            (index >= PHASE_INDEX[firstPhase] && phase !== 'reset')
          const isActive = performing(i)
          const dimmed = appeared && !isActive && !staticMode
          const style: CSSVarStyle = {
            transform: `translate(${u.x}px, ${UNSEEN_Y}px) scale(${appeared ? 1 : 0.5})`,
            opacity: !appeared ? 0 : dimmed ? 0.45 : 1,
          }
          return (
            <g key={u.key} className="stage stage-pop" style={style}>
              <MotionCard color={u.color} pose={u.pose} dashed active={isActive} />
            </g>
          )
        })}
        <text
          className="diagram-sublabel stage"
          x={744}
          y={UNSEEN_Y + 44}
          textAnchor="middle"
          style={{ opacity: anyUnseenVisible ? 0.9 : 0 }}
        >
          never seen in training
        </text>
        {/* request → robot: dashed thread from the active card */}
        {UNSEEN.map((u, i) => (
          <path
            key={`link-${u.key}`}
            d={`M ${u.x} ${UNSEEN_Y + 26} C ${u.x + 10} ${UNSEEN_Y + 80}, ${ROBOT.x - 55} ${ROBOT.y - 105}, ${ROBOT.x - 6} ${ROBOT.y - 80}`}
            fill="none"
            stroke={u.color}
            strokeWidth={1.3}
            strokeDasharray="3 5"
            strokeLinecap="round"
            className="stage"
            style={{ opacity: performing(i) || (staticMode && i === 1) ? 0.7 : 0 }}
          />
        ))}

        {/* policy → robot link */}
        <path
          d={`M ${NET.x + NET.w / 2 + 12} ${NET.y + 6} C 660 170, 730 200, ${ROBOT.x - 28} ${ROBOT.y - 62}`}
          fill="none"
          stroke="var(--diagram-muted)"
          strokeWidth={1.3}
          strokeDasharray="3 5"
          strokeLinecap="round"
          className="stage"
          style={{ opacity: robotActive ? 0.8 : 0 }}
        />

        {/* --- stage: ground, robot, wind -------------------------------------- */}
        <line
          x1={GROUND.x1}
          y1={GROUND.y}
          x2={GROUND.x2}
          y2={GROUND.y}
          stroke="var(--diagram-line)"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        <g transform={`translate(${ROBOT.x} ${ROBOT.y})`}>
          <RobotDancer
            dancing={!staticMode && between('deploy', 'ood3')}
            move={robotMove}
            active={robotActive}
            accent={robotAccent}
            stumbling={at('wind')}
          />
        </g>
        <WindGust x={884} y={238} active={at('wind')} />

        {/* --- labels ----------------------------------------------------------- */}
        <StageLabel x={CARD.x} y={LABEL_Y} text="dataset" active={at('dataset')} accent="var(--diagram-accent-input)" />
        <StageLabel x={FUNNEL.x + FUNNEL.length / 2 + 20} y={LABEL_Y} text="train at scale" active={training} accent="var(--diagram-accent-latent)" />
        <StageLabel x={NET.x} y={LABEL_Y} text="one policy" active={at('deploy')} accent="var(--diagram-accent-latent)" />
        <StageLabel x={ROBOT.x} y={LABEL_Y} text="any motion" active={between('ood1', 'ood3')} accent="#8b5cf6" />
      </DiagramFrame>
    </div>
  )
}

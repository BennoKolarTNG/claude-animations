import { useRef } from 'react'
import { DiagramFrame } from './DiagramFrame'
import { Pipe } from './primitives/Pipe'
import { VideoFrame } from './primitives/VideoFrame'
import { FlowParticles } from './primitives/FlowParticles'
import { NeuralNetwork } from './primitives/NeuralNetwork'
import { TrainingLoop } from './primitives/TrainingLoop'
import { RobotDancer, type RobotMove } from './primitives/RobotDancer'
import { StageLabel } from './primitives/StageLabel'
import { useOnScreen, usePrefersReducedMotion, useTimeline } from './useTimeline'
import type { CSSVarStyle, DiagramTheme } from './diagramTokens'

const PHASES = [
  { name: 'videoIn', duration: 1700, caption: 'Raw video streams into the system.' },
  { name: 'encode', duration: 1300, caption: 'A pipe-like encoder compresses each frame into latent tokens.' },
  { name: 'form', duration: 1900, caption: 'From the latents, a policy network takes shape.' },
  { name: 'train', duration: 3400, caption: 'Reinforcement learning tunes the policy, reward by reward.' },
  { name: 'emit', duration: 2300, caption: 'The trained policy is packaged for deployment.' },
  { name: 'live', duration: 4200, caption: 'Deployed on a robot, the policy acts in the world.' },
  { name: 'reset', duration: 900, caption: '…and new video streams in.' },
] as const

type PhaseName = (typeof PHASES)[number]['name']
const PHASE_INDEX = Object.fromEntries(
  PHASES.map((p, i) => [p.name, i]),
) as Record<PhaseName, number>

// --- layout constants (SVG user units, viewBox 0 0 960 360) ----------------
const AXIS_Y = 185
const VIDEO = { x: 96, y: AXIS_Y }
const ENCODER = { x: 168, length: 150, r1: 34, r2: 15 }
const CENTER = { x: 450, y: AXIS_Y }
const OUTPUT = { x: 560, length: 140, r1: 15, r2: 30 }
const TRAINED = { x: 795, y: 195 }
const ROBOT = { x: 890, y: 250 }
const GROUND_Y = 250
const LABEL_Y = 316

export interface EmbodiedAIPipelineDiagramProps {
  title?: string
  showCaption?: boolean
  /** Accent palette; defaults to the blue theme. */
  theme?: DiagramTheme
  /** How the robot celebrates once the policy is deployed. */
  robotMove?: RobotMove
  className?: string
}

/**
 * The full training-pipeline explainer: video → encoder pipe → policy
 * network → RL training loop → deployment pipe → trained network lighting
 * up beside a dancing robot. Loops forever while on screen; renders a
 * complete static diagram when the user prefers reduced motion.
 */
export function EmbodiedAIPipelineDiagram({
  title = 'How a robot learns from video: video is encoded into a policy network, tuned with reinforcement learning, and deployed to a robot.',
  showCaption = true,
  theme,
  robotMove = 'disco',
  className,
}: EmbodiedAIPipelineDiagramProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const reducedMotion = usePrefersReducedMotion()
  const onScreen = useOnScreen(rootRef)
  const staticMode = reducedMotion
  const { phase, index } = useTimeline([...PHASES], !staticMode && onScreen)

  const at = (n: PhaseName) => !staticMode && phase === n
  const between = (a: PhaseName, b: PhaseName) =>
    !staticMode && index >= PHASE_INDEX[a] && index <= PHASE_INDEX[b]

  // --- per-element visual state ---------------------------------------------
  const videoStyle: CSSVarStyle = staticMode
    ? { transform: `translate(${VIDEO.x}px, ${VIDEO.y}px)`, opacity: 1 }
    : at('videoIn')
      ? { transform: `translate(${VIDEO.x}px, ${VIDEO.y}px) scale(1)`, opacity: 1 }
      : at('encode')
        ? {
            transform: `translate(${ENCODER.x + 4}px, ${AXIS_Y}px) scale(0.3)`,
            opacity: 0,
            transition: 'opacity 800ms ease 250ms, transform 1000ms var(--diagram-ease)',
          }
        : { transform: `translate(${VIDEO.x - 42}px, ${VIDEO.y}px) scale(1)`, opacity: 0 }

  const centerNetVisible = staticMode || between('form', 'form')
  const centerNetStyle: CSSVarStyle = {
    transform: `translate(${CENTER.x}px, ${CENTER.y}px) scale(${
      centerNetVisible ? 1 : between('train', 'reset') ? 0.5 : 0.65
    })`,
    opacity: centerNetVisible ? 1 : 0,
  }

  const loopActive = at('train')
  const loopStyle: CSSVarStyle = {
    transform: `translate(${CENTER.x}px, ${CENTER.y}px) scale(${
      loopActive || staticMode ? 1 : between('emit', 'reset') ? 0.4 : 0.72
    })`,
    opacity: loopActive ? 1 : staticMode ? 0.3 : 0,
  }

  const trainedVisible = staticMode || between('emit', 'reset')
  const trainedFaded = at('reset')
  const trainedStyle: CSSVarStyle = {
    transform:
      trainedVisible || staticMode
        ? `translate(${TRAINED.x}px, ${TRAINED.y}px) scale(1)`
        : `translate(${TRAINED.x - 75}px, ${TRAINED.y}px) scale(0.4)`,
    opacity: trainedVisible && !trainedFaded ? 1 : 0,
    transitionDelay: at('emit') ? '900ms' : '0ms',
  }

  const linkVisible = staticMode || at('live')
  const robotActive = staticMode || between('live', 'reset')

  const caption = staticMode
    ? 'From raw video to embodied action: encode, train with RL, deploy.'
    : PHASES[index].caption

  return (
    <div ref={rootRef} className={className}>
      <DiagramFrame
        title={title}
        viewBox="0 52 960 296"
        theme={theme}
        caption={showCaption ? caption : undefined}
        captionKey={staticMode ? 'static' : index}
      >
        {/* --- persistent skeleton ------------------------------------------ */}
        <Pipe
          x={ENCODER.x}
          y={AXIS_Y}
          length={ENCODER.length}
          inletRadius={ENCODER.r1}
          outletRadius={ENCODER.r2}
          active={at('encode') || staticMode}
          accent="var(--diagram-glow)"
        />
        <Pipe
          x={OUTPUT.x}
          y={AXIS_Y}
          length={OUTPUT.length}
          inletRadius={OUTPUT.r1}
          outletRadius={OUTPUT.r2}
          active={at('emit') || staticMode}
          accent="var(--diagram-glow-latent)"
        />
        <line
          x1={742}
          y1={GROUND_Y}
          x2={930}
          y2={GROUND_Y}
          stroke="var(--diagram-line)"
          strokeWidth={1.5}
          strokeLinecap="round"
        />

        <StageLabel x={VIDEO.x} y={LABEL_Y} text="video in" active={at('videoIn')} accent="var(--diagram-accent-input)" />
        <StageLabel x={ENCODER.x + ENCODER.length / 2} y={LABEL_Y} text="encode" active={at('encode')} accent="var(--diagram-accent-input)" />
        <StageLabel x={CENTER.x} y={LABEL_Y} text="train" active={at('form') || at('train')} accent="var(--diagram-accent-latent)" />
        <StageLabel x={OUTPUT.x + OUTPUT.length / 2} y={LABEL_Y} text="deploy" active={at('emit')} accent="var(--diagram-accent-latent)" />
        <StageLabel x={845} y={LABEL_Y} text="act" active={at('live')} accent="var(--diagram-accent-action)" />

        {/* --- video input --------------------------------------------------- */}
        <g className="stage" style={videoStyle}>
          <VideoFrame />
        </g>

        {/* --- flows --------------------------------------------------------- */}
        <FlowParticles
          x={ENCODER.x + 6}
          y={AXIS_Y}
          dx={ENCODER.length - 10}
          spreadStart={22}
          spreadEnd={8}
          duration={1.1}
          color="var(--diagram-accent-input)"
          active={at('encode')}
        />
        <FlowParticles
          x={ENCODER.x + ENCODER.length + 4}
          y={AXIS_Y}
          dx={CENTER.x - ENCODER.x - ENCODER.length - 74}
          spreadStart={8}
          spreadEnd={3}
          count={5}
          duration={1.2}
          color="var(--diagram-accent-latent)"
          active={at('form')}
        />
        <FlowParticles
          x={OUTPUT.x + 8}
          y={AXIS_Y}
          dx={OUTPUT.length - 12}
          spreadStart={5}
          spreadEnd={18}
          count={6}
          color="var(--diagram-accent-latent)"
          active={at('emit')}
        />

        {/* --- center stage: policy network ⇄ RL loop ------------------------ */}
        <g className="stage" style={centerNetStyle}>
          <NeuralNetwork
            layers={[3, 4, 3]}
            width={120}
            height={110}
            drawn={staticMode || between('form', 'train')}
          />
        </g>
        <g className="stage" style={loopStyle}>
          <TrainingLoop spinning={loopActive} />
        </g>

        {/* policy shuttling from the loop into the deployment pipe */}
        <circle
          className={`shuttle-dot${at('emit') ? ' travelling' : ''}`}
          cx={CENTER.x}
          cy={AXIS_Y}
          r={6}
          fill="var(--diagram-accent-latent)"
          style={{ '--dx': `${OUTPUT.x + 8 - CENTER.x}px` } as CSSVarStyle}
        />

        {/* --- deployed network + robot -------------------------------------- */}
        <g className="stage stage-pop" style={trainedStyle}>
          <NeuralNetwork
            layers={[2, 3, 2]}
            width={82}
            height={78}
            nodeRadius={6}
            drawn={staticMode || between('emit', 'reset')}
            pulsing={staticMode || at('live')}
          />
        </g>
        <path
          d={`M ${TRAINED.x + 44} ${TRAINED.y + 4} C ${TRAINED.x + 70} ${TRAINED.y - 14}, ${ROBOT.x - 18} ${ROBOT.y - 84}, ${ROBOT.x - 2} ${ROBOT.y - 78}`}
          fill="none"
          stroke="var(--diagram-muted)"
          strokeWidth={1.3}
          strokeDasharray="3 5"
          strokeLinecap="round"
          className="stage"
          style={{ opacity: linkVisible ? 0.8 : 0 }}
        />
        <g transform={`translate(${ROBOT.x} ${ROBOT.y})`}>
          <RobotDancer
            dancing={at('live') || at('reset')}
            move={robotMove}
            active={robotActive}
          />
        </g>
      </DiagramFrame>
    </div>
  )
}

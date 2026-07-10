import { useRef } from 'react'
import { DiagramFrame } from './DiagramFrame'
import { FlowParticles } from './primitives/FlowParticles'
import { LatentRack } from './primitives/LatentRack'
import { Laptop } from './primitives/Laptop'
import { RobotDancer, type RobotMove } from './primitives/RobotDancer'
import { StageLabel } from './primitives/StageLabel'
import { TrainingLoop } from './primitives/TrainingLoop'
import { WifiWaves } from './primitives/WifiWaves'
import { WindGust } from './primitives/WindGust'
import { useOnScreen, usePrefersReducedMotion, useTimeline } from './useTimeline'
import type { CSSVarStyle, DiagramTheme } from './diagramTokens'

const STREAM_BLUE = '#4f8cff'
const LATENT = '#8b5cf6'
const ACTION = '#f59e0b'
const SENSOR = '#14b8a6'

const PHASES = [
  { name: 'ui', duration: 2200, caption: 'Pick a motion in the browser — the site is served by the robot itself.' },
  { name: 'stream', duration: 2400, caption: 'The motion streams over wifi, frame by frame…' },
  { name: 'decode', duration: 2400, caption: '…through SONIC’s latent space into live joint commands.' },
  { name: 'loop', duration: 3200, caption: 'Underneath, a 50 Hz feedback loop with joints and sensors keeps every step balanced.' },
  { name: 'shove', duration: 2800, caption: 'Shove it — the loop reacts before you can blink.' },
  { name: 'on', duration: 2400, caption: 'The dance goes on.' },
  { name: 'reset', duration: 1000, caption: 'Next motion?' },
] as const

type PhaseName = (typeof PHASES)[number]['name']
const PHASE_INDEX = Object.fromEntries(
  PHASES.map((p, i) => [p.name, i]),
) as Record<PhaseName, number>

// --- layout constants --------------------------------------------------------
const LAPTOP = { x: 150, ground: 318 }
const WIFI = { x: 248, y: 230 }
const PANEL = { x: 400, y: 92, w: 235, h: 118 }
const RACK = { x: 414, y: 174 }
const LOOP = { x: 700, y: 205, r: 17 }
const ROBOT = { x: 800, ground: 318 }
const LABEL_Y = 378

export interface DeploymentLoopDiagramProps {
  title?: string
  showCaption?: boolean
  theme?: DiagramTheme
  className?: string
}

/**
 * The live deployment pipeline: a browser UI (served from the robot's
 * own Jetson) streams the chosen motion over wifi into SONIC, which
 * decodes latents into joint commands — while a 50 Hz feedback loop
 * between policy, joints and sensors keeps the robot balanced, shove
 * included.
 */
export function DeploymentLoopDiagram({
  title = 'Deployment pipeline: a browser motion library hosted on the robot streams frames over wifi into the SONIC policy on the Jetson; joint commands flow down and sensor readings flow back in a 50 Hz feedback loop that recovers from a shove mid-dance.',
  showCaption = true,
  theme,
  className,
}: DeploymentLoopDiagramProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const reducedMotion = usePrefersReducedMotion()
  const onScreen = useOnScreen(rootRef)
  const staticMode = reducedMotion
  const { phase, index } = useTimeline([...PHASES], !staticMode && onScreen)

  const at = (n: PhaseName) => !staticMode && phase === n
  const since = (n: PhaseName) =>
    staticMode || (index >= PHASE_INDEX[n] && phase !== 'reset')

  const uiOn = since('ui') || staticMode
  const streaming = since('stream')
  const decoding = since('decode')
  const looping = since('loop')

  const robotMove: RobotMove = since('on') ? 'disco' : 'sidewiggle'
  const caption = staticMode
    ? 'Browser → wifi → SONIC on the Jetson → joints, in a 50 Hz loop.'
    : PHASES[index].caption

  return (
    <div ref={rootRef} className={className}>
      <DiagramFrame
        title={title}
        viewBox="0 50 960 348"
        theme={theme}
        caption={showCaption ? caption : undefined}
        captionKey={caption}
      >
        {/* --- the browser on a laptop --------------------------------------- */}
        <line x1={70} y1={LAPTOP.ground} x2={235} y2={LAPTOP.ground} stroke="var(--diagram-line)" strokeWidth={1.5} strokeLinecap="round" />
        <g transform={`translate(${LAPTOP.x} ${LAPTOP.ground})`}>
          <Laptop selected={5} accent={STREAM_BLUE} playing={streaming && !staticMode} active={uiOn} />
        </g>
        <text className="diagram-sublabel" x={LAPTOP.x} y={LAPTOP.ground + 16} textAnchor="middle">
          any browser · no install
        </text>

        {/* --- wifi + frame stream up to the robot's Jetson ------------------- */}
        <WifiWaves x={WIFI.x} y={WIFI.y} color={STREAM_BLUE} active={streaming && !staticMode} />
        <path
          d={`M ${WIFI.x + 20} ${WIFI.y - 10} C 300 170, 330 140, ${PANEL.x - 8} 140`}
          fill="none"
          stroke={STREAM_BLUE}
          strokeWidth={1.4}
          strokeDasharray="1 6"
          strokeLinecap="round"
          className="stage"
          style={{ opacity: streaming ? 0.5 : 0 }}
        />
        <FlowParticles x={WIFI.x + 22} y={WIFI.y - 14} y2={142} dx={PANEL.x - WIFI.x - 30} spreadStart={8} spreadEnd={5} count={6} duration={1.1} color={STREAM_BLUE} active={streaming && !staticMode} />

        {/* --- the on-robot stack: Jetson panel with SONIC + latents ---------- */}
        <rect x={PANEL.x} y={PANEL.y} width={PANEL.w} height={PANEL.h} rx={12} fill="var(--diagram-surface)" stroke={decoding ? 'var(--diagram-ink)' : 'var(--diagram-line)'} strokeWidth={1.5} style={{ transition: 'stroke 600ms ease' }} />
        <text x={PANEL.x + 14} y={PANEL.y + 25} fontFamily="var(--diagram-font-label)" fontSize={13.5} fontWeight={700} fill="var(--diagram-ink)">
          SONIC
        </text>
        <text x={PANEL.x + 14} y={PANEL.y + 42} fontFamily="var(--diagram-font-label)" fontSize={10} fontWeight={600} letterSpacing="0.06em" fill="var(--diagram-muted)">
          ON THE ROBOT&apos;S JETSON
        </text>
        {/* Jetson chip glyph */}
        <rect x={PANEL.x + PANEL.w - 46} y={PANEL.y + 14} width={32} height={24} rx={4} fill="var(--diagram-bg)" stroke="var(--diagram-muted)" strokeWidth={1.3} />
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <line x1={PANEL.x + PANEL.w - 40 + i * 10} y1={PANEL.y + 10} x2={PANEL.x + PANEL.w - 40 + i * 10} y2={PANEL.y + 14} stroke="var(--diagram-muted)" strokeWidth={1.3} />
            <line x1={PANEL.x + PANEL.w - 40 + i * 10} y1={PANEL.y + 38} x2={PANEL.x + PANEL.w - 40 + i * 10} y2={PANEL.y + 42} stroke="var(--diagram-muted)" strokeWidth={1.3} />
          </g>
        ))}
        <LatentRack x={RACK.x} y={RACK.y} cells={11} cellSize={13} gap={3} color={LATENT} mode={decoding && !staticMode ? 'live' : staticMode ? 'hold' : 'idle'} pattern={[1, 3, 6, 8, 10]} />

        {/* --- commands down, sensors back: the 50 Hz loop --------------------- */}
        <path d={`M ${PANEL.x + PANEL.w + 4} 140 C 690 142, 740 180, ${ROBOT.x - 24} ${ROBOT.ground - 66}`} fill="none" stroke={ACTION} strokeWidth={1.4} strokeLinecap="round" className="stage" style={{ opacity: decoding ? 0.55 : 0 }} />
        <FlowParticles x={PANEL.x + PANEL.w + 6} y={140} y2={ROBOT.ground - 68} dx={ROBOT.x - PANEL.x - PANEL.w - 32} spreadStart={5} spreadEnd={4} count={8} duration={0.6} color={ACTION} active={decoding && !staticMode} />
        {/* sensor readings return */}
        <path d={`M ${ROBOT.x - 40} ${ROBOT.ground - 46} C 720 262, 670 240, ${PANEL.x + PANEL.w - 30} ${PANEL.y + PANEL.h + 4}`} fill="none" stroke={SENSOR} strokeWidth={1.4} strokeDasharray="4 4" strokeLinecap="round" className="stage" style={{ opacity: looping ? 0.55 : 0 }} />
        <FlowParticles x={ROBOT.x - 42} y={ROBOT.ground - 48} y2={PANEL.y + PANEL.h + 8} dx={-(ROBOT.x - 42 - (PANEL.x + PANEL.w - 32))} spreadStart={4} spreadEnd={4} count={7} duration={0.6} radius={2} color={SENSOR} active={looping && !staticMode} />

        {/* loop badge + frequency */}
        <g className="stage" style={{ transform: `translate(${LOOP.x}px, ${LOOP.y}px) scale(${looping || staticMode ? 1 : 0.6})`, opacity: looping ? 1 : staticMode ? 0.5 : 0 }}>
          <TrainingLoop radius={LOOP.r} spinning={looping && !staticMode} strokeWidth={4} color={SENSOR} />
        </g>
        <text className="math-label" x={LOOP.x} y={LOOP.y + 44} textAnchor="middle" style={{ opacity: looping ? 1 : 0.3, fill: SENSOR, transition: 'opacity 600ms ease' } as CSSVarStyle}>
          50<tspan className="math-sub" dy={3}> Hz</tspan>
        </text>

        {/* --- the robot on stage ---------------------------------------------- */}
        <line x1={700} y1={ROBOT.ground} x2={930} y2={ROBOT.ground} stroke="var(--diagram-line)" strokeWidth={1.5} strokeLinecap="round" />
        <g transform={`translate(${ROBOT.x} ${ROBOT.ground})`}>
          <RobotDancer dancing={!staticMode && decoding} move={robotMove} active={decoding} accent={ACTION} stumbling={at('shove')} />
        </g>
        <WindGust x={870} y={ROBOT.ground - 68} active={at('shove')} />

        {/* --- labels ------------------------------------------------------------ */}
        <StageLabel x={LAPTOP.x} y={LABEL_Y} text="pick a motion" active={at('ui')} accent={STREAM_BLUE} />
        <StageLabel x={WIFI.x + 70} y={LABEL_Y} text="stream" active={at('stream')} accent={STREAM_BLUE} />
        <StageLabel x={PANEL.x + PANEL.w / 2} y={LABEL_Y} text="decode on-board" active={at('decode')} accent={LATENT} />
        <StageLabel x={LOOP.x} y={LABEL_Y} text="feedback loop" active={at('loop') || at('shove')} accent={SENSOR} />
        <StageLabel x={ROBOT.x + 60} y={LABEL_Y} text="dance" active={at('on')} accent={ACTION} />
      </DiagramFrame>
    </div>
  )
}

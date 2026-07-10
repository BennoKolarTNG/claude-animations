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
  { name: 'host', duration: 2200, caption: 'The G1’s own Jetson hosts both runtimes: the website and SONIC itself.' },
  { name: 'serve', duration: 2400, caption: 'Through an external router, every browser on the network gets the site — notebook or phone.' },
  { name: 'pick', duration: 2000, caption: 'Pick a dance on any device…' },
  { name: 'stream', duration: 2400, caption: '…and it streams back through the router into the website runtime…' },
  { name: 'decode', duration: 2400, caption: '…which feeds SONIC frame by frame: latents in, joint commands out.' },
  { name: 'loop', duration: 3000, caption: 'On the robot, SONIC and the joints close a 50 Hz feedback loop.' },
  { name: 'shove', duration: 2800, caption: 'Shove it — the loop recovers before you can blink.' },
  { name: 'on', duration: 2200, caption: 'The dance goes on.' },
  { name: 'reset', duration: 1000, caption: 'Next motion?' },
] as const

type PhaseName = (typeof PHASES)[number]['name']
const PHASE_INDEX = Object.fromEntries(
  PHASES.map((p, i) => [p.name, i]),
) as Record<PhaseName, number>

// --- layout constants --------------------------------------------------------
const LAPTOP = { x: 138, ground: 218 }
const PHONE = { x: 138, y: 330 }
const ROUTER = { x: 330, y: 268 }
const PANEL = { x: 442, y: 78, w: 258, h: 152 }
const ROW1 = { y: 112, h: 48 }
const ROW2 = { y: 168, h: 52 }
const ROBOT = { x: 806, ground: 362, scale: 1.45 }
const TORSO_BOX = { x: ROBOT.x - 26, y: 296, w: 52, h: 52 }
const LOOP = { x: 712, y: 292, r: 15 }
const LABEL_Y = 408

export interface DeploymentLoopDiagramProps {
  title?: string
  showCaption?: boolean
  theme?: DiagramTheme
  className?: string
}

/** A phone showing the same motion-library site, local origin center. */
function Phone({ playing, active }: { playing: boolean; active: boolean }) {
  const stroke = active ? 'var(--diagram-ink)' : 'var(--diagram-line)'
  return (
    <g aria-hidden>
      <rect x={-17} y={-31} width={34} height={62} rx={7} fill="var(--diagram-surface)" stroke={stroke} strokeWidth={1.6} style={{ transition: 'stroke 600ms ease' }} />
      <line x1={-5} y1={-25} x2={5} y2={-25} stroke={stroke} strokeWidth={1.5} strokeLinecap="round" />
      {Array.from({ length: 6 }, (_, i) => {
        const r = Math.floor(i / 2)
        const c = i % 2
        const isSel = i === 3
        return (
          <rect
            key={i}
            className={isSel && playing ? 'laptop-tile-playing' : undefined}
            x={-12 + c * 13}
            y={-18 + r * 14}
            width={11}
            height={11}
            rx={2.5}
            fill={isSel ? STREAM_BLUE : 'var(--diagram-line)'}
            opacity={isSel ? 0.9 : 0.35}
          />
        )
      })}
    </g>
  )
}

/** Small router: box, two antennas, status LEDs. */
function Router({ active }: { active: boolean }) {
  const stroke = active ? 'var(--diagram-ink)' : 'var(--diagram-line)'
  return (
    <g aria-hidden>
      <line x1={-16} y1={-14} x2={-22} y2={-34} stroke={stroke} strokeWidth={1.8} strokeLinecap="round" style={{ transition: 'stroke 600ms ease' }} />
      <circle cx={-22.8} cy={-36.5} r={2.2} fill={active ? STREAM_BLUE : 'var(--diagram-line)'} style={{ transition: 'fill 600ms ease' }} />
      <line x1={16} y1={-14} x2={22} y2={-34} stroke={stroke} strokeWidth={1.8} strokeLinecap="round" style={{ transition: 'stroke 600ms ease' }} />
      <circle cx={22.8} cy={-36.5} r={2.2} fill={active ? STREAM_BLUE : 'var(--diagram-line)'} style={{ transition: 'fill 600ms ease' }} />
      <rect x={-32} y={-14} width={64} height={26} rx={7} fill="var(--diagram-surface)" stroke={stroke} strokeWidth={1.6} style={{ transition: 'stroke 600ms ease' }} />
      {[0, 1, 2, 3].map((i) => (
        <circle key={i} cx={-18 + i * 12} cy={-1} r={2} fill={active ? STREAM_BLUE : 'var(--diagram-line)'} opacity={active ? 0.85 : 0.5} style={{ transition: 'fill 600ms ease' }} />
      ))}
    </g>
  )
}

/**
 * The live deployment network: the G1's Jetson hosts BOTH the motion
 * website and the SONIC runtime (shown as a zoom-callout out of the
 * robot's torso). An external router serves the site to a notebook and
 * a phone; the picked motion streams back through the router into the
 * website runtime, into SONIC, and out to the joints in a 50 Hz
 * feedback loop — shove included.
 */
export function DeploymentLoopDiagram({
  title = 'Deployment network: the robot’s Jetson hosts the motion website and the SONIC runtime; an external router serves the site to a notebook and a phone on the same network; the chosen motion streams back through the router into the website runtime, then SONIC, then the joints, closing a 50 Hz feedback loop that recovers from a shove.',
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

  const serving = since('serve')
  const picking = since('pick')
  const streaming = since('stream')
  const decoding = since('decode')
  const looping = since('loop')

  const robotMove: RobotMove = since('on') ? 'disco' : 'sidewiggle'
  const caption = staticMode
    ? 'Robot-hosted website → router → any browser; picks stream back into SONIC and the joints.'
    : PHASES[index].caption

  return (
    <div ref={rootRef} className={className}>
      <DiagramFrame
        title={title}
        viewBox="0 52 960 372"
        theme={theme}
        caption={showCaption ? caption : undefined}
        captionKey={caption}
      >
        {/* --- the on-board panel: a zoom INTO the robot ----------------------- */}
        {/* lens lines: this panel lives inside the torso */}
        <path d={`M ${PANEL.x + PANEL.w} ${PANEL.y + 6} L ${TORSO_BOX.x} ${TORSO_BOX.y}`} stroke="var(--diagram-muted)" strokeWidth={1.2} strokeDasharray="4 4" opacity={0.7} />
        <path d={`M ${PANEL.x + PANEL.w} ${PANEL.y + PANEL.h - 6} L ${TORSO_BOX.x} ${TORSO_BOX.y + TORSO_BOX.h}`} stroke="var(--diagram-muted)" strokeWidth={1.2} strokeDasharray="4 4" opacity={0.7} />
        <rect x={TORSO_BOX.x} y={TORSO_BOX.y} width={TORSO_BOX.w} height={TORSO_BOX.h} rx={9} fill="none" stroke="var(--diagram-muted)" strokeWidth={1.3} strokeDasharray="4 4" opacity={0.85} />

        <rect x={PANEL.x} y={PANEL.y} width={PANEL.w} height={PANEL.h} rx={13} fill="var(--diagram-surface)" stroke={since('host') ? 'var(--diagram-ink)' : 'var(--diagram-line)'} strokeWidth={1.5} style={{ transition: 'stroke 600ms ease' }} />
        <text x={PANEL.x + 14} y={PANEL.y + 24} fontFamily="var(--diagram-font-label)" fontSize={10.5} fontWeight={700} letterSpacing="0.1em" fill="var(--diagram-ink)">
          ON THE G1 · JETSON
        </text>
        {/* Jetson chip glyph */}
        <rect x={PANEL.x + PANEL.w - 44} y={PANEL.y + 10} width={30} height={20} rx={4} fill="var(--diagram-bg)" stroke="var(--diagram-muted)" strokeWidth={1.3} />
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <line x1={PANEL.x + PANEL.w - 38 + i * 9} y1={PANEL.y + 7} x2={PANEL.x + PANEL.w - 38 + i * 9} y2={PANEL.y + 10} stroke="var(--diagram-muted)" strokeWidth={1.2} />
            <line x1={PANEL.x + PANEL.w - 38 + i * 9} y1={PANEL.y + 30} x2={PANEL.x + PANEL.w - 38 + i * 9} y2={PANEL.y + 33} stroke="var(--diagram-muted)" strokeWidth={1.2} />
          </g>
        ))}

        {/* runtime 1: the website */}
        <rect x={PANEL.x + 12} y={ROW1.y} width={PANEL.w - 24} height={ROW1.h} rx={9} fill="var(--diagram-bg)" stroke={streaming ? STREAM_BLUE : 'var(--diagram-line)'} strokeWidth={1.4} style={{ transition: 'stroke 500ms ease' }} />
        <text x={PANEL.x + 24} y={ROW1.y + 20} fontFamily="var(--diagram-font-label)" fontSize={11} fontWeight={700} fill="var(--diagram-ink)">
          WEBSITE RUNTIME
        </text>
        <text x={PANEL.x + 24} y={ROW1.y + 36} className="diagram-sublabel">
          serves the motion library
        </text>
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={PANEL.x + PANEL.w - 82 + i * 16} y={ROW1.y + 14} width={12} height={12} rx={2.5} fill={i === 1 ? STREAM_BLUE : 'var(--diagram-line)'} opacity={i === 1 ? 0.9 : 0.4} className={i === 1 && streaming && !staticMode ? 'laptop-tile-playing' : undefined} />
        ))}

        {/* frames flowing website → SONIC */}
        <FlowParticles x={PANEL.x + 60} y={ROW1.y + ROW1.h + 2} dx={0.001} y2={ROW2.y - 2} spreadStart={30} spreadEnd={30} count={4} duration={0.6} radius={1.9} shape="square" color={STREAM_BLUE} active={decoding && !staticMode} />

        {/* runtime 2: SONIC */}
        <rect x={PANEL.x + 12} y={ROW2.y} width={PANEL.w - 24} height={ROW2.h} rx={9} fill="var(--diagram-bg)" stroke={decoding ? LATENT : 'var(--diagram-line)'} strokeWidth={1.4} style={{ transition: 'stroke 500ms ease' }} />
        <text x={PANEL.x + 24} y={ROW2.y + 21} fontFamily="var(--diagram-font-label)" fontSize={11} fontWeight={700} fill="var(--diagram-ink)">
          SONIC RUNTIME
        </text>
        <LatentRack x={PANEL.x + 138} y={ROW2.y + 27} cells={6} cellSize={11} gap={3} color={LATENT} mode={decoding && !staticMode ? 'live' : staticMode ? 'hold' : 'idle'} pattern={[0, 2, 5]} />

        {/* --- clients: notebook + phone, same site, same network -------------- */}
        <line x1={70} y1={LAPTOP.ground} x2={216} y2={LAPTOP.ground} stroke="var(--diagram-line)" strokeWidth={1.5} strokeLinecap="round" />
        <g transform={`translate(${LAPTOP.x} ${LAPTOP.ground}) scale(0.85)`}>
          <Laptop selected={5} accent={STREAM_BLUE} playing={picking && !staticMode} active={serving} />
        </g>
        <text className="diagram-sublabel" x={LAPTOP.x} y={LAPTOP.ground + 15} textAnchor="middle">
          notebook
        </text>
        <g transform={`translate(${PHONE.x} ${PHONE.y})`}>
          <Phone playing={picking && !staticMode} active={serving} />
        </g>
        <text className="diagram-sublabel" x={PHONE.x} y={PHONE.y + 48} textAnchor="middle">
          phone · same network
        </text>

        {/* --- the external router --------------------------------------------- */}
        <g transform={`translate(${ROUTER.x} ${ROUTER.y})`}>
          <Router active={serving} />
        </g>
        <text className="diagram-sublabel" x={ROUTER.x} y={ROUTER.y + 30} textAnchor="middle">
          external router
        </text>
        {/* wifi both ways */}
        <g transform={`translate(${ROUTER.x - 44} ${ROUTER.y - 24}) scale(-1 1)`}>
          <WifiWaves x={0} y={0} color={STREAM_BLUE} active={serving && !staticMode} count={2} />
        </g>
        <WifiWaves x={ROUTER.x + 44} y={ROUTER.y - 24} color={STREAM_BLUE} active={serving && !staticMode} count={2} />

        {/* hosting: website runtime → router (the site being served) */}
        <path d={`M ${PANEL.x - 4} ${ROW1.y + 24} C 402 148, 366 190, ${ROUTER.x + 12} ${ROUTER.y - 40}`} fill="none" stroke={STREAM_BLUE} strokeWidth={1.3} strokeDasharray="1 5" strokeLinecap="round" className="stage" style={{ opacity: serving ? 0.55 : 0 }} />
        <FlowParticles x={PANEL.x - 6} y={ROW1.y + 22} y2={ROUTER.y - 38} dx={-(PANEL.x - 18 - ROUTER.x)} spreadStart={5} spreadEnd={4} count={4} duration={0.9} radius={2} color={STREAM_BLUE} active={serving && !staticMode && !streaming} />
        {/* router → clients */}
        <FlowParticles x={ROUTER.x - 40} y={ROUTER.y - 18} y2={LAPTOP.ground - 46} dx={-(ROUTER.x - 40 - LAPTOP.x - 60)} spreadStart={4} spreadEnd={8} count={4} duration={0.8} radius={2} color={STREAM_BLUE} active={serving && !staticMode && !streaming} />
        <FlowParticles x={ROUTER.x - 40} y={ROUTER.y + 2} y2={PHONE.y} dx={-(ROUTER.x - 40 - PHONE.x - 24)} spreadStart={4} spreadEnd={6} count={4} duration={0.8} radius={2} color={STREAM_BLUE} active={serving && !staticMode && !streaming} />

        {/* streaming back: client → router → website runtime */}
        <FlowParticles x={LAPTOP.x + 62} y={LAPTOP.ground - 42} y2={ROUTER.y - 20} dx={ROUTER.x - 42 - LAPTOP.x - 62} spreadStart={6} spreadEnd={4} count={5} duration={0.7} color={STREAM_BLUE} active={streaming && !staticMode} />
        <FlowParticles x={ROUTER.x + 14} y={ROUTER.y - 38} y2={ROW1.y + 22} dx={PANEL.x - 8 - ROUTER.x - 14} spreadStart={4} spreadEnd={4} count={5} duration={0.7} color={STREAM_BLUE} active={streaming && !staticMode} />

        {/* --- SONIC ↔ joints: the on-robot feedback loop ----------------------- */}
        <path d={`M ${PANEL.x + PANEL.w - 40} ${PANEL.y + PANEL.h + 4} C 680 260, 720 280, ${TORSO_BOX.x - 4} ${TORSO_BOX.y + 30}`} fill="none" stroke={ACTION} strokeWidth={1.4} strokeLinecap="round" className="stage" style={{ opacity: looping ? 0.55 : 0 }} />
        <FlowParticles x={PANEL.x + PANEL.w - 42} y={PANEL.y + PANEL.h + 6} y2={TORSO_BOX.y + 28} dx={TORSO_BOX.x - PANEL.x - PANEL.w + 34} spreadStart={4} spreadEnd={3} count={7} duration={0.55} color={ACTION} active={looping && !staticMode} />
        <path d={`M ${TORSO_BOX.x - 2} ${TORSO_BOX.y + 44} C 700 330, 660 290, ${PANEL.x + PANEL.w - 70} ${PANEL.y + PANEL.h + 6}`} fill="none" stroke={SENSOR} strokeWidth={1.4} strokeDasharray="4 4" strokeLinecap="round" className="stage" style={{ opacity: looping ? 0.55 : 0 }} />
        <FlowParticles x={TORSO_BOX.x - 4} y={TORSO_BOX.y + 42} y2={PANEL.y + PANEL.h + 10} dx={-(TORSO_BOX.x - 4 - PANEL.x - PANEL.w + 72)} spreadStart={3} spreadEnd={3} count={6} duration={0.55} radius={1.9} color={SENSOR} active={looping && !staticMode} />
        <g className="stage" style={{ transform: `translate(${LOOP.x}px, ${LOOP.y}px) scale(${looping || staticMode ? 1 : 0.6})`, opacity: looping ? 1 : staticMode ? 0.5 : 0 }}>
          <TrainingLoop radius={LOOP.r} spinning={looping && !staticMode} strokeWidth={4} color={SENSOR} />
        </g>
        <text className="math-label" x={LOOP.x} y={LOOP.y + 38} textAnchor="middle" style={{ opacity: looping ? 1 : 0.3, fill: SENSOR, transition: 'opacity 600ms ease' } as CSSVarStyle}>
          50<tspan className="math-sub" dy={3}> Hz</tspan>
        </text>

        {/* --- the robot, front and center-right, bigger ------------------------- */}
        <line x1={690} y1={ROBOT.ground} x2={946} y2={ROBOT.ground} stroke="var(--diagram-line)" strokeWidth={1.5} strokeLinecap="round" />
        <g transform={`translate(${ROBOT.x} ${ROBOT.ground}) scale(${ROBOT.scale})`}>
          <RobotDancer dancing={!staticMode && looping} move={robotMove} active={decoding} accent={ACTION} stumbling={at('shove')} />
        </g>
        <WindGust x={906} y={ROBOT.ground - 96} active={at('shove')} />

        {/* --- labels -------------------------------------------------------------- */}
        <StageLabel x={LAPTOP.x} y={LABEL_Y} text="any browser" active={at('serve') || at('pick')} accent={STREAM_BLUE} />
        <StageLabel x={ROUTER.x} y={LABEL_Y} text="router" active={at('stream')} accent={STREAM_BLUE} />
        <StageLabel x={PANEL.x + PANEL.w / 2} y={LABEL_Y} text="hosted on the g1" active={at('host') || at('decode')} accent={LATENT} />
        <StageLabel x={ROBOT.x} y={LABEL_Y} text="dance" active={at('loop') || at('shove') || at('on')} accent={ACTION} />
      </DiagramFrame>
    </div>
  )
}

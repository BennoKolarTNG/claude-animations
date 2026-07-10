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
const TEAL = '#14b8a6'

const PHASES = [
  { name: 'host', duration: 2200, caption: 'Website and SONIC run together on the G1’s own Jetson — robot and server are one thing.' },
  { name: 'network', duration: 2200, caption: 'One network: the robot, an external router, a notebook, a phone.' },
  { name: 'pick', duration: 1800, caption: 'Tap a dance…' },
  { name: 'stream', duration: 2200, caption: '…the request travels to the router, which relays the signal…' },
  { name: 'toServer', duration: 2200, caption: '…on to the website runtime, back on the robot.' },
  { name: 'decode', duration: 2200, caption: 'The website hands it across the gap to SONIC, frame by frame.' },
  { name: 'loop', duration: 3000, caption: 'SONIC feeds the joints over one fast line — a 50 Hz loop.' },
  { name: 'shove', duration: 2800, caption: 'Shove it — the loop recovers before you can blink.' },
  { name: 'on', duration: 2000, caption: 'The dance goes on.' },
  { name: 'reset', duration: 1000, caption: 'Next motion?' },
] as const

type PhaseName = (typeof PHASES)[number]['name']
const PHASE_INDEX = Object.fromEntries(
  PHASES.map((p, i) => [p.name, i]),
) as Record<PhaseName, number>

// --- layout constants --------------------------------------------------------
const LAPTOP = { x: 150, ground: 212 }
const PHONE = { x: 150, y: 330 }
const ROUTER = { x: 330, y: 262 }
const PANEL = { x: 510, y: 60, w: 310, h: 178 }
const WEB = { y: 96, h: 52 }
const SONIC = { y: 168, h: 56 }
const GAP_Y = { from: WEB.y + WEB.h, to: SONIC.y }
const ROBOT = { x: 852, ground: 386, scale: 1.7 }
const HEAD_TOP = ROBOT.ground - 75 * ROBOT.scale
const LOOP = { x: 744, y: 286, r: 14 }
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

/** A quiet dotted network link. */
function NetLink({ d, on }: { d: string; on: boolean }) {
  return (
    <path
      d={d}
      fill="none"
      stroke="var(--diagram-muted)"
      strokeWidth={1.3}
      strokeDasharray="2 5"
      strokeLinecap="round"
      className="stage"
      style={{ opacity: on ? 0.65 : 0 }}
    />
  )
}

/**
 * The deployment network: notebook and phone sit on dotted network
 * links to an external router; a tap sends the request along the links
 * to the router, which relays it to the website runtime on the G1's
 * Jetson — teal, like the robot itself, because they are one machine.
 * The website hands frames across a small gap to SONIC, and SONIC feeds
 * the joints over a single fast teal line with a spinning 50 Hz loop.
 */
export function DeploymentLoopDiagram({
  title = 'Deployment network: notebook and phone connect over dotted network links to an external router; a tap streams the chosen dance to the website runtime hosted on the robot’s Jetson, across a gap into SONIC, and down one fast teal 50 Hz line into the joints — recovering even from a shove.',
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

  const networked = since('network')
  const picking = since('pick')
  const decoding = since('decode')
  const looping = since('loop')

  const robotMove: RobotMove = since('on') ? 'disco' : 'sidewiggle'
  const caption = staticMode
    ? 'Tap on any device → router → website on the G1 → SONIC → joints, at 50 Hz.'
    : PHASES[index].caption

  return (
    <div ref={rootRef} className={className}>
      <DiagramFrame
        title={title}
        viewBox="0 46 960 380"
        theme={theme}
        caption={showCaption ? caption : undefined}
        captionKey={caption}
      >
        {/* --- the network fabric: quiet dotted links -------------------------- */}
        <NetLink d={`M ${LAPTOP.x + 58} ${LAPTOP.ground - 40} L ${ROUTER.x - 36} ${ROUTER.y - 18}`} on={networked} />
        <NetLink d={`M ${PHONE.x + 24} ${PHONE.y - 6} L ${ROUTER.x - 36} ${ROUTER.y + 2}`} on={networked} />
        <NetLink d={`M ${ROUTER.x + 30} ${ROUTER.y - 26} L ${PANEL.x - 6} ${WEB.y + 26}`} on={networked} />

        {/* --- the server on the robot: one teal machine ------------------------ */}
        <rect x={PANEL.x} y={PANEL.y} width={PANEL.w} height={PANEL.h} rx={13} fill="var(--diagram-surface)" stroke={TEAL} strokeWidth={1.8} />
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

        {/* website runtime */}
        <rect x={PANEL.x + 14} y={WEB.y} width={PANEL.w - 28} height={WEB.h} rx={9} fill="var(--diagram-bg)" stroke={since('toServer') ? STREAM_BLUE : 'var(--diagram-line)'} strokeWidth={1.4} style={{ transition: 'stroke 500ms ease' }} />
        <text x={PANEL.x + 26} y={WEB.y + 21} fontFamily="var(--diagram-font-label)" fontSize={11} fontWeight={700} fill="var(--diagram-ink)">
          WEBSITE RUNTIME
        </text>
        <text x={PANEL.x + 26} y={WEB.y + 37} className="diagram-sublabel">
          serves the motion library
        </text>
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={PANEL.x + PANEL.w - 92 + i * 17} y={WEB.y + 16} width={13} height={13} rx={2.5} fill={i === 1 ? STREAM_BLUE : 'var(--diagram-line)'} opacity={i === 1 ? 0.9 : 0.4} className={i === 1 && since('toServer') && !staticMode ? 'laptop-tile-playing' : undefined} />
        ))}

        {/* the gap: frames hop from website to SONIC */}
        <FlowParticles x={PANEL.x + 40} y={GAP_Y.from + 2} dx={0.001} y2={GAP_Y.to - 2} spreadStart={0} spreadEnd={0} count={1} duration={0.5} radius={2} shape="square" color={STREAM_BLUE} active={decoding && !staticMode} />
        <FlowParticles x={PANEL.x + 120} y={GAP_Y.from + 2} dx={0.001} y2={GAP_Y.to - 2} spreadStart={0} spreadEnd={0} count={1} duration={0.55} radius={2} shape="square" color={STREAM_BLUE} active={decoding && !staticMode} />
        <FlowParticles x={PANEL.x + 200} y={GAP_Y.from + 2} dx={0.001} y2={GAP_Y.to - 2} spreadStart={0} spreadEnd={0} count={1} duration={0.45} radius={2} shape="square" color={STREAM_BLUE} active={decoding && !staticMode} />
        <FlowParticles x={PANEL.x + 272} y={GAP_Y.from + 2} dx={0.001} y2={GAP_Y.to - 2} spreadStart={0} spreadEnd={0} count={1} duration={0.6} radius={2} shape="square" color={STREAM_BLUE} active={decoding && !staticMode} />

        {/* SONIC runtime */}
        <rect x={PANEL.x + 14} y={SONIC.y} width={PANEL.w - 28} height={SONIC.h} rx={9} fill="var(--diagram-bg)" stroke={decoding ? LATENT : 'var(--diagram-line)'} strokeWidth={1.4} style={{ transition: 'stroke 500ms ease' }} />
        <text x={PANEL.x + 26} y={SONIC.y + 23} fontFamily="var(--diagram-font-label)" fontSize={11} fontWeight={700} fill="var(--diagram-ink)">
          SONIC RUNTIME
        </text>
        <LatentRack x={PANEL.x + 158} y={SONIC.y + 28} cells={7} cellSize={12} gap={3} color={LATENT} mode={decoding && !staticMode ? 'live' : staticMode ? 'hold' : 'idle'} pattern={[0, 2, 4, 6]} />

        {/* --- clients ----------------------------------------------------------- */}
        <line x1={82} y1={LAPTOP.ground} x2={228} y2={LAPTOP.ground} stroke="var(--diagram-line)" strokeWidth={1.5} strokeLinecap="round" />
        <g transform={`translate(${LAPTOP.x} ${LAPTOP.ground}) scale(0.85)`}>
          <Laptop selected={5} accent={STREAM_BLUE} playing={picking && !staticMode} active={networked} />
        </g>
        <text className="diagram-sublabel" x={LAPTOP.x} y={LAPTOP.ground + 15} textAnchor="middle">
          notebook
        </text>
        <g transform={`translate(${PHONE.x} ${PHONE.y})`}>
          <Phone playing={picking && !staticMode} active={networked} />
        </g>
        <text className="diagram-sublabel" x={PHONE.x} y={PHONE.y + 48} textAnchor="middle">
          phone · same network
        </text>
        {/* the tap */}
        <circle
          className={`click-ring${at('pick') ? ' tapping' : ''}`}
          cx={138}
          cy={166}
          r={15}
          fill="none"
          stroke={STREAM_BLUE}
          strokeWidth={2.2}
        />
        <circle cx={138} cy={166} r={3} fill={STREAM_BLUE} className="stage" style={{ opacity: at('pick') ? 0.9 : 0 }} />

        {/* --- the router --------------------------------------------------------- */}
        <g transform={`translate(${ROUTER.x} ${ROUTER.y})`}>
          <Router active={networked} />
        </g>
        <text className="diagram-sublabel" x={ROUTER.x} y={ROUTER.y + 30} textAnchor="middle">
          external router
        </text>
        {/* the router emits when relaying */}
        <g transform={`translate(${ROUTER.x - 44} ${ROUTER.y - 24}) scale(-1 1)`}>
          <WifiWaves x={0} y={0} color={STREAM_BLUE} active={(at('stream') || at('toServer')) && !staticMode} count={2} />
        </g>
        <WifiWaves x={ROUTER.x + 44} y={ROUTER.y - 24} color={STREAM_BLUE} active={(at('stream') || at('toServer')) && !staticMode} count={2} />

        {/* the request: device → router → website, along the dotted links */}
        <FlowParticles x={LAPTOP.x + 56} y={LAPTOP.ground - 40} y2={ROUTER.y - 19} dx={ROUTER.x - 38 - LAPTOP.x - 56} spreadStart={2} spreadEnd={2} count={5} duration={0.7} color={STREAM_BLUE} active={since('stream') && !staticMode} />
        <FlowParticles x={ROUTER.x + 32} y={ROUTER.y - 27} y2={WEB.y + 25} dx={PANEL.x - 8 - ROUTER.x - 32} spreadStart={2} spreadEnd={2} count={5} duration={0.7} color={STREAM_BLUE} active={since('toServer') && !staticMode} />

        {/* --- one machine: reverse-L dotted tether + one teal data line ---------- */}
        {/* out of the Jetson's right side, over, and down into the robot's head */}
        <path
          d={`M ${PANEL.x + PANEL.w + 2} 150 L ${ROBOT.x} 150 L ${ROBOT.x} ${HEAD_TOP - 6}`}
          fill="none"
          stroke="var(--diagram-muted)"
          strokeWidth={1.3}
          strokeDasharray="2 5"
          strokeLinecap="round"
          opacity={0.75}
        />
        {/* data: from the bottom of the SONIC section to the robot's left middle */}
        <path
          d={`M ${PANEL.x + 170} ${PANEL.y + PANEL.h + 2} C ${PANEL.x + 180} 300, ${ROBOT.x - 110} 334, ${ROBOT.x - 36} ${ROBOT.ground - 54}`}
          fill="none"
          stroke={TEAL}
          strokeWidth={1.6}
          strokeLinecap="round"
          className="stage"
          style={{ opacity: looping ? 0.7 : 0.25 }}
        />
        {/* fast traffic both ways on the one line */}
        <FlowParticles x={PANEL.x + 172} y={PANEL.y + PANEL.h + 8} y2={ROBOT.ground - 56} dx={ROBOT.x - 40 - PANEL.x - 172} spreadStart={3} spreadEnd={3} count={7} duration={0.5} radius={2.1} color={TEAL} active={looping && !staticMode} />
        <g opacity={0.55}>
          <FlowParticles x={ROBOT.x - 44} y={ROBOT.ground - 60} y2={PANEL.y + PANEL.h + 12} dx={-(ROBOT.x - 44 - PANEL.x - 176)} spreadStart={3} spreadEnd={3} count={6} duration={0.5} radius={1.8} color={TEAL} active={looping && !staticMode} />
        </g>
        <g className="stage" style={{ transform: `translate(${LOOP.x}px, ${LOOP.y}px) scale(${looping || staticMode ? 1 : 0.6})`, opacity: looping ? 1 : staticMode ? 0.5 : 0 }}>
          <TrainingLoop radius={LOOP.r} spinning={looping && !staticMode} strokeWidth={4} color={TEAL} />
        </g>
        <text className="math-label" x={LOOP.x - 4} y={LOOP.y + 40} textAnchor="middle" style={{ opacity: looping ? 1 : 0.3, fill: TEAL, transition: 'opacity 600ms ease' } as CSSVarStyle}>
          50<tspan className="math-sub" dy={3}> Hz</tspan>
        </text>

        {/* --- the robot: big, right under its Jetson, teal-lit -------------------- */}
        <line x1={720} y1={ROBOT.ground} x2={950} y2={ROBOT.ground} stroke="var(--diagram-line)" strokeWidth={1.5} strokeLinecap="round" />
        <g transform={`translate(${ROBOT.x} ${ROBOT.ground}) scale(${ROBOT.scale})`}>
          <RobotDancer dancing={!staticMode && looping} move={robotMove} active accent={TEAL} stumbling={at('shove')} />
        </g>
        <WindGust x={936} y={ROBOT.ground - 116} active={at('shove')} />

        {/* --- labels --------------------------------------------------------------- */}
        <StageLabel x={LAPTOP.x} y={LABEL_Y} text="any browser" active={at('network') || at('pick')} accent={STREAM_BLUE} />
        <StageLabel x={ROUTER.x} y={LABEL_Y} text="router" active={at('stream')} accent={STREAM_BLUE} />
        <StageLabel x={PANEL.x + PANEL.w / 2 - 40} y={LABEL_Y} text="hosted on the g1" active={at('host') || at('toServer') || at('decode')} accent={TEAL} />
        <StageLabel x={ROBOT.x} y={LABEL_Y} text="dance" active={at('loop') || at('shove') || at('on')} accent={TEAL} />
      </DiagramFrame>
    </div>
  )
}

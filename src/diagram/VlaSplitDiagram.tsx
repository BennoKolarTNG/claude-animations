import { useRef, type ReactNode } from 'react'
import { DiagramFrame } from './DiagramFrame'
import { FlowParticles } from './primitives/FlowParticles'
import { LatentRack } from './primitives/LatentRack'
import { RobotDancer, type RobotMove } from './primitives/RobotDancer'
import { StageLabel } from './primitives/StageLabel'
import { useOnScreen, usePrefersReducedMotion, useTimeline } from './useTimeline'
import type { CSSVarStyle, DiagramTheme } from './diagramTokens'

// NVIDIA's GR00T figures color-code System 2 magenta/pink and System 1
// teal — we keep that coding for instant recognition.
const S2_PINK = '#d946ef'
const S1_TEAL = '#14b8a6'
const VISION_TOKEN = '#a78bfa'
const TEXT_TOKEN = '#3b5bdb'
const LATENT = '#8b5cf6'

const PHASES = [
  { name: 'intro', duration: 1800, caption: 'One robot, two brains.' },
  { name: 'sonic', duration: 3000, caption: 'SONIC balances the lower body — the fast System 1, always on at 50 Hz.' },
  { name: 'groot', duration: 3200, caption: 'Gr00t reads the camera and the instruction and works the arms — System 2, ~10 Hz.' },
  { name: 'teleop', duration: 2400, caption: 'Classically, Gr00t’s commands would detour through a teleop data format…' },
  { name: 'direct', duration: 3000, caption: '…but Gr00t can be finetuned to write SONIC’s latent space directly.' },
  { name: 'act', duration: 2800, caption: 'One brain for the task, one for the body — speaking the same latents.' },
  { name: 'reset', duration: 1000, caption: 'Task and balance, hand in hand.' },
] as const

type PhaseName = (typeof PHASES)[number]['name']
const PHASE_INDEX = Object.fromEntries(
  PHASES.map((p, i) => [p.name, i]),
) as Record<PhaseName, number>

// --- layout constants --------------------------------------------------------
const CAM = { x: 85, y: 108, w: 74, h: 54 }
const PROMPT = { x: 85, y: 182 }
const GROOT = { x: 170, y: 70, w: 225, h: 118 }
const SONIC = { x: 170, y: 248, w: 225, h: 104 }
const RACK = { x: 182, y: 322 }
const TELEOP = { x: 283, y: 218 }
const ROBOT = { x: 800, ground: 348 }
const ZONE = { x: 752, w: 96, top: 266, waist: 324, bottom: 352 }
const LABEL_Y = 388

/** Rounded module block with bold title + colored System subtitle. */
function ModuleBlock({
  x,
  y,
  w,
  h,
  title,
  subtitle,
  accent,
  active,
  children,
}: {
  x: number
  y: number
  w: number
  h: number
  title: string
  subtitle: string
  accent: string
  active: boolean
  children?: ReactNode
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={12}
        fill="var(--diagram-surface)"
        stroke={active ? 'var(--diagram-ink)' : 'var(--diagram-line)'}
        strokeWidth={1.5}
        style={{ transition: 'stroke 600ms ease' }}
      />
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={12}
        fill={accent}
        opacity={active ? 0.07 : 0}
        style={{ transition: 'opacity 600ms ease' }}
      />
      <text
        x={x + 14}
        y={y + 26}
        fontFamily="var(--diagram-font-label)"
        fontSize={14.5}
        fontWeight={700}
        fill="var(--diagram-ink)"
      >
        {title}
      </text>
      <text
        x={x + 14}
        y={y + 43}
        fontFamily="var(--diagram-font-label)"
        fontSize={10}
        fontWeight={600}
        letterSpacing="0.06em"
        fill={accent}
      >
        {subtitle}
      </text>
      {children}
    </g>
  )
}

export interface VlaSplitDiagramProps {
  title?: string
  showCaption?: boolean
  theme?: DiagramTheme
  className?: string
}

/**
 * VLAs on humanoids, GR00T-figure style: Gr00t (System 2, magenta,
 * ~10 Hz) reads a camera frame and a language instruction and drives the
 * upper body; SONIC (System 1, teal, 50 Hz) keeps the lower body
 * balanced. The punchline: instead of detouring through a teleop data
 * format, Gr00t writes SONIC's purple latent space directly.
 */
export function VlaSplitDiagram({
  title = 'A Gr00t vision-language-action model drives the robot’s upper body at ~10 Hz while SONIC balances the lower body at 50 Hz; a teleop-format detour is crossed out as Gr00t learns to write SONIC’s latent space directly.',
  showCaption = true,
  theme,
  className,
}: VlaSplitDiagramProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const reducedMotion = usePrefersReducedMotion()
  const onScreen = useOnScreen(rootRef)
  const staticMode = reducedMotion
  const { phase, index } = useTimeline([...PHASES], !staticMode && onScreen)

  const at = (n: PhaseName) => !staticMode && phase === n
  const since = (n: PhaseName) =>
    staticMode || (index >= PHASE_INDEX[n] && phase !== 'reset')

  const sonicOn = since('sonic')
  const grootOn = since('groot')
  const teleopShown = since('teleop')
  const directOn = since('direct')

  const robotMove: RobotMove = grootOn ? 'embodied' : 'balance'
  const caption = staticMode
    ? 'Gr00t works the arms, SONIC keeps the balance — via one latent space.'
    : PHASES[index].caption

  const zoneStyle = (on: boolean): CSSVarStyle => ({
    opacity: on ? 1 : 0.18,
    transition: 'opacity 700ms ease',
  })

  return (
    <div ref={rootRef} className={className}>
      <DiagramFrame
        title={title}
        viewBox="0 40 960 368"
        theme={theme}
        caption={showCaption ? caption : undefined}
        captionKey={caption}
      >
        {/* --- inputs: camera frame + language instruction ------------------- */}
        <g className="stage" style={{ opacity: grootOn || at('intro') || staticMode ? 1 : 0.45 }}>
          <rect
            x={CAM.x - CAM.w / 2}
            y={CAM.y - CAM.h / 2}
            width={CAM.w}
            height={CAM.h}
            rx={7}
            fill="var(--diagram-surface)"
            stroke={VISION_TOKEN}
            strokeWidth={1.6}
          />
          {/* viewfinder corners */}
          {[
            [-1, -1],
            [1, -1],
            [-1, 1],
            [1, 1],
          ].map(([sx, sy], i) => (
            <path
              key={i}
              d={`M ${CAM.x + sx * (CAM.w / 2 - 6)} ${CAM.y + sy * (CAM.h / 2 - 13)} L ${CAM.x + sx * (CAM.w / 2 - 6)} ${CAM.y + sy * (CAM.h / 2 - 6)} L ${CAM.x + sx * (CAM.w / 2 - 13)} ${CAM.y + sy * (CAM.h / 2 - 6)}`}
              fill="none"
              stroke={VISION_TOKEN}
              strokeWidth={1.4}
              opacity={0.7}
            />
          ))}
          {/* the scene: a cup on a table */}
          <line x1={CAM.x - 24} y1={CAM.y + 13} x2={CAM.x + 24} y2={CAM.y + 13} stroke="var(--diagram-muted)" strokeWidth={1.6} strokeLinecap="round" />
          <rect x={CAM.x - 5} y={CAM.y + 1} width={11} height={12} rx={2} fill="none" stroke="var(--diagram-ink)" strokeWidth={1.6} />
          <path d={`M ${CAM.x + 6} ${CAM.y + 4} a 4 4 0 0 1 0 7`} fill="none" stroke="var(--diagram-ink)" strokeWidth={1.5} />
          <text className="diagram-sublabel" x={CAM.x} y={CAM.y + CAM.h / 2 + 13} textAnchor="middle">
            camera
          </text>

          <text
            x={PROMPT.x}
            y={PROMPT.y + 14}
            textAnchor="middle"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            fontSize={10.5}
            fill={TEXT_TOKEN}
          >
            "pick up
          </text>
          <text
            x={PROMPT.x}
            y={PROMPT.y + 27}
            textAnchor="middle"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            fontSize={10.5}
            fill={TEXT_TOKEN}
          >
            the cup"
          </text>
        </g>

        {/* token streams into Gr00t (modality-colored squares) */}
        <FlowParticles x={CAM.x + CAM.w / 2 + 4} y={CAM.y} y2={GROOT.y + 44} dx={GROOT.x - CAM.x - CAM.w / 2 - 8} spreadStart={6} spreadEnd={4} count={4} duration={0.9} radius={2} shape="square" color={VISION_TOKEN} active={grootOn && !staticMode} />
        <FlowParticles x={PROMPT.x + 42} y={PROMPT.y + 18} y2={GROOT.y + 88} dx={GROOT.x - PROMPT.x - 46} spreadStart={4} spreadEnd={3} count={4} duration={0.9} radius={2} shape="square" color={TEXT_TOKEN} active={grootOn && !staticMode} />

        {/* --- the two systems ------------------------------------------------ */}
        <ModuleBlock x={GROOT.x} y={GROOT.y} w={GROOT.w} h={GROOT.h} title="GR00T" subtitle="SYSTEM 2 · VISION-LANGUAGE · ~10 HZ" accent={S2_PINK} active={grootOn}>
          {/* token strip: vision + text tokens lined up inside */}
          {Array.from({ length: 9 }, (_, i) => (
            <rect
              key={i}
              x={GROOT.x + 14 + i * 15}
              y={GROOT.y + 62}
              width={11}
              height={11}
              rx={2}
              fill={i < 5 ? VISION_TOKEN : TEXT_TOKEN}
              opacity={grootOn ? 0.85 : 0.25}
              style={{ transition: `opacity 500ms ease ${i * 60}ms` }}
            />
          ))}
          <text className="diagram-sublabel" x={GROOT.x + 14} y={GROOT.y + 96}>
            sees the scene · plans the task
          </text>
        </ModuleBlock>

        <ModuleBlock x={SONIC.x} y={SONIC.y} w={SONIC.w} h={SONIC.h} title="SONIC" subtitle="SYSTEM 1 · WHOLE-BODY CONTROL · 50 HZ" accent={S1_TEAL} active={sonicOn}>
          <LatentRack x={RACK.x} y={RACK.y} cells={8} cellSize={12} gap={3} color={LATENT} mode={sonicOn && !staticMode ? 'live' : staticMode ? 'hold' : 'idle'} pattern={[0, 2, 5, 7]} />
        </ModuleBlock>

        {/* --- the teleop detour, then the direct latent write ---------------- */}
        <g className="stage" style={{ opacity: teleopShown ? (directOn ? 0.45 : 1) : 0 }}>
          <line x1={TELEOP.x} y1={GROOT.y + GROOT.h + 2} x2={TELEOP.x} y2={TELEOP.y - 14} stroke="var(--diagram-muted)" strokeWidth={1.3} strokeDasharray="3 4" />
          <line x1={TELEOP.x} y1={TELEOP.y + 14} x2={TELEOP.x} y2={SONIC.y - 2} stroke="var(--diagram-muted)" strokeWidth={1.3} strokeDasharray="3 4" />
          <rect x={TELEOP.x - 44} y={TELEOP.y - 13} width={88} height={26} rx={6} fill="var(--diagram-surface)" stroke="var(--diagram-muted)" strokeWidth={1.4} />
          <text x={TELEOP.x} y={TELEOP.y + 3.5} textAnchor="middle" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={10} fill="var(--diagram-muted)">
            teleop.json
          </text>
        </g>
        {/* strike-through once the direct path exists */}
        <g className="stage" style={{ opacity: directOn && !staticMode ? 1 : staticMode ? 0.9 : 0 }}>
          <line x1={TELEOP.x - 50} y1={TELEOP.y + 10} x2={TELEOP.x + 50} y2={TELEOP.y - 10} stroke="#ef4444" strokeWidth={2.4} strokeLinecap="round" />
        </g>

        {/* direct write: Gr00t → SONIC's latent rack */}
        <path
          d={`M ${GROOT.x + GROOT.w - 42} ${GROOT.y + GROOT.h + 2} C ${GROOT.x + GROOT.w - 30} ${TELEOP.y + 10}, ${RACK.x + 130} ${SONIC.y + 30}, ${RACK.x + 122} ${RACK.y - 12}`}
          fill="none"
          stroke={S2_PINK}
          strokeWidth={1.6}
          strokeDasharray="5 4"
          strokeLinecap="round"
          className="stage"
          style={{ opacity: directOn ? 0.9 : 0 }}
        />
        <FlowParticles x={GROOT.x + GROOT.w - 44} y={GROOT.y + GROOT.h + 6} y2={RACK.y - 16} dx={16} spreadStart={3} spreadEnd={2} count={3} duration={1.0} radius={2} shape="square" color={S2_PINK} active={directOn && !staticMode} />

        {/* --- command arrows to the split body -------------------------------- */}
        <path d={`M ${GROOT.x + GROOT.w + 4} 120 C 560 130, 660 215, ${ZONE.x - 6} 292`} fill="none" stroke={S2_PINK} strokeWidth={1.4} strokeLinecap="round" className="stage" style={{ opacity: grootOn ? 0.55 : 0 }} />
        <FlowParticles x={GROOT.x + GROOT.w + 6} y={120} y2={292} dx={ZONE.x - GROOT.x - GROOT.w - 14} spreadStart={5} spreadEnd={4} count={5} duration={1.7} color={S2_PINK} active={grootOn && !staticMode} />
        <text className="math-label" x={585} y={168} textAnchor="middle" style={{ opacity: grootOn ? 1 : 0.35, fill: S2_PINK, transition: 'opacity 600ms ease' }}>
          ~10<tspan className="math-sub" dy={3}> Hz</tspan>
        </text>

        <path d={`M ${SONIC.x + SONIC.w + 4} 300 C 560 302, 660 322, ${ZONE.x - 6} 334`} fill="none" stroke={S1_TEAL} strokeWidth={1.4} strokeLinecap="round" className="stage" style={{ opacity: sonicOn ? 0.55 : 0 }} />
        <FlowParticles x={SONIC.x + SONIC.w + 6} y={300} y2={334} dx={ZONE.x - SONIC.x - SONIC.w - 14} spreadStart={5} spreadEnd={3} count={9} duration={0.55} color={S1_TEAL} active={sonicOn && !staticMode} />
        <text className="math-label" x={585} y={286} textAnchor="middle" style={{ opacity: sonicOn ? 1 : 0.35, fill: S1_TEAL, transition: 'opacity 600ms ease' }}>
          50<tspan className="math-sub" dy={3}> Hz</tspan>
        </text>

        {/* --- the split-body robot -------------------------------------------- */}
        <rect x={ZONE.x} y={ZONE.top} width={ZONE.w} height={ZONE.waist - ZONE.top} rx={10} fill={S2_PINK} style={{ ...zoneStyle(grootOn), fillOpacity: 0.08 } as CSSVarStyle} stroke="none" />
        <rect x={ZONE.x} y={ZONE.waist} width={ZONE.w} height={ZONE.bottom - ZONE.waist} rx={10} fill={S1_TEAL} style={{ ...zoneStyle(sonicOn), fillOpacity: 0.1 } as CSSVarStyle} stroke="none" />
        <line x1={ZONE.x - 8} y1={ZONE.waist} x2={ZONE.x + ZONE.w + 8} y2={ZONE.waist} stroke="var(--diagram-muted)" strokeWidth={1.2} strokeDasharray="4 4" opacity={0.8} />

        <line x1={705} y1={ROBOT.ground} x2={905} y2={ROBOT.ground} stroke="var(--diagram-line)" strokeWidth={1.5} strokeLinecap="round" />
        <g transform={`translate(${ROBOT.x} ${ROBOT.ground})`}>
          <RobotDancer dancing={!staticMode && sonicOn} move={robotMove} active={sonicOn} accent={grootOn ? S2_PINK : S1_TEAL} />
        </g>

        {/* --- labels ------------------------------------------------------------ */}
        <StageLabel x={CAM.x} y={LABEL_Y} text="see & read" active={at('groot')} accent={VISION_TOKEN} />
        <StageLabel x={GROOT.x + GROOT.w / 2} y={LABEL_Y} text="two systems" active={at('sonic') || at('groot')} accent={S2_PINK} />
        <StageLabel x={TELEOP.x + 170} y={LABEL_Y} text="one latent language" active={at('teleop') || at('direct')} accent={LATENT} />
        <StageLabel x={ROBOT.x} y={LABEL_Y} text="one body" active={at('act')} accent={S1_TEAL} />
      </DiagramFrame>
    </div>
  )
}

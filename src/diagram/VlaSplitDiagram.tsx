import { useRef, type ReactNode } from 'react'
import { DiagramFrame } from './DiagramFrame'
import { EncoderModule } from './primitives/EncoderModule'
import { FlowParticles } from './primitives/FlowParticles'
import { LatentRack } from './primitives/LatentRack'
import { RobotDancer, type RobotMove } from './primitives/RobotDancer'
import { StageLabel } from './primitives/StageLabel'
import { useOnScreen, usePrefersReducedMotion, useTimeline } from './useTimeline'
import type { CSSVarStyle, DiagramTheme } from './diagramTokens'

// NVIDIA's GR00T figures color-code System 2 magenta and System 1 teal;
// SONIC's latent space stays purple, the kinematic planner blue.
const S2_PINK = '#d946ef'
const S1_TEAL = '#14b8a6'
const VISION_TOKEN = '#a78bfa'
const TEXT_TOKEN = '#3b5bdb'
const STATE_RED = '#ef4444'
const PLANNER_BLUE = '#4f8cff'
const LATENT = '#8b5cf6'
const ACTION = '#f59e0b'

const PHASES = [
  { name: 'inputs', duration: 2600, caption: 'Gr00t sees three things: the camera image, the instruction, and the robot’s own state.' },
  { name: 'system2', duration: 2600, caption: 'System 2 — a vision-language model — reads all three and plans, at ~10 Hz.' },
  { name: 'system1', duration: 2600, caption: 'System 1 turns the plan into a chunk of upper-body actions.' },
  { name: 'lower', duration: 2400, caption: 'Meanwhile a kinematic planner produces the lower body: stance, steps, balance targets.' },
  { name: 'hybrid', duration: 3600, caption: 'Both streams meet in SONIC’s Hybrid Encoder — the upper body wrapped as teleop data.' },
  { name: 'decode', duration: 3200, caption: '…fused into the latents and decoded: arms on task, legs on balance.' },
  { name: 'direct', duration: 3200, caption: 'The upgrade: finetuned Gr00t emits SONIC’s latent tokens directly — whole body, no teleop format, no encoder, no planner.' },
  { name: 'act', duration: 2600, caption: 'Task above, balance below — one latent language in between.' },
  { name: 'reset', duration: 1000, caption: 'Two systems, one body.' },
] as const

type PhaseName = (typeof PHASES)[number]['name']
const PHASE_INDEX = Object.fromEntries(
  PHASES.map((p, i) => [p.name, i]),
) as Record<PhaseName, number>

// --- layout constants --------------------------------------------------------
const IN_X = 96
const CAM = { y: 106, w: 112, h: 64 }
const PROMPT = { y: 196 }
const STATE = { y: 272, w: 112, h: 64 }
const GROOT = { x: 186, y: 70, w: 240, h: 212 }
const S2 = { x: GROOT.x + 14, y: 100, w: GROOT.w - 28, h: 62 }
const S1 = { x: GROOT.x + 14, y: 176, w: GROOT.w - 28, h: 62 }
const CHUNK = { x: 246, y: 306, w: 150, h: 50 }
const PLANNER = { x: 246, y: 386, w: 170, h: 46 }
const TOP_Y = CHUNK.y + CHUNK.h / 2 // upper-body stream lane
const BOT_Y = PLANNER.y + PLANNER.h / 2 // lower-body stream lane
const TELEOP = { x: 505, y: TOP_Y, w: 130, h: 58 }
const HENC = { x: 598, y: (TOP_Y + BOT_Y) / 2, len: 74 }
const SONIC = { x: 636, y: 262, w: 176, h: 196 }
const RACK = { x: 736, y: 322 }
const ROBOT = { x: 900, ground: 454, scale: 1.5 }
const ZONE = { x: 856, w: 88, top: 336, waist: 408, bottom: 458 }
const LABEL_Y = 484

/** Rounded sub-block with bold title + colored subtitle. */
function SubBlock({
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
      <rect x={x} y={y} width={w} height={h} rx={9} fill="var(--diagram-bg)" stroke={active ? accent : 'var(--diagram-line)'} strokeWidth={1.4} style={{ transition: 'stroke 500ms ease' }} />
      <text x={x + 12} y={y + 21} fontFamily="var(--diagram-font-label)" fontSize={11} fontWeight={700} fill="var(--diagram-ink)">
        {title}
      </text>
      <text x={x + 12} y={y + 36} fontFamily="var(--diagram-font-label)" fontSize={9} fontWeight={600} letterSpacing="0.05em" fill={accent}>
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
 * The Gr00t × SONIC intersection, drawn concretely: GR00T's three-point
 * input space feeds System 2 then System 1, emitting an upper-body
 * action chunk; a kinematic planner produces the lower body. The two
 * streams run in parallel — the upper one through a teleop card (VR
 * headset + tracked joints that light up with the flow) — into SONIC's
 * Hybrid Encoder, which straddles the block's edge like an adapter.
 * Inside, a vertical latent rack decodes to a big task/balance robot.
 * The finale routes the upper stream up and around the struck teleop
 * card — finetuned Gr00t speaks latents natively.
 */
export function VlaSplitDiagram({
  title = 'Gr00t on SONIC: camera image, language instruction and robot state feed System 2 then System 1, producing an upper-body action chunk; a kinematic planner produces the lower body; both streams enter SONIC’s Hybrid Encoder in parallel — the upper one wrapped as teleop data until Gr00t is finetuned to bypass it — and the vertical latent space decodes into a task-and-balance robot.',
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

  const directOn = since('direct')
  const robotOn = since('decode')
  const teleopFlow = since('hybrid') && !directOn && !staticMode

  /** Staged focus: full opacity while relevant, dimmed otherwise. */
  const focus = (...names: PhaseName[]): CSSVarStyle => ({
    opacity: staticMode || phase === 'act' || names.some((n) => at(n)) ? 1 : 0.3,
    transition: 'opacity 600ms ease',
  })

  const robotMove: RobotMove = 'embodied'
  const caption = staticMode
    ? 'Three inputs → System 2 → System 1 → (teleop →) Hybrid Encoder → latents → whole body.'
    : PHASES[index].caption

  return (
    <div ref={rootRef} className={className}>
      <DiagramFrame
        title={title}
        viewBox="0 42 960 462"
        theme={theme}
        caption={showCaption ? caption : undefined}
        captionKey={caption}
      >
        {/* ================= the three-point input space ================= */}
        <g className="stage" style={focus('inputs', 'system2')}>
          <rect x={IN_X - CAM.w / 2} y={CAM.y - CAM.h / 2} width={CAM.w} height={CAM.h} rx={8} fill="var(--diagram-surface)" stroke={VISION_TOKEN} strokeWidth={1.6} />
          <line x1={IN_X - 30} y1={CAM.y + 16} x2={IN_X + 30} y2={CAM.y + 16} stroke="var(--diagram-muted)" strokeWidth={1.5} strokeLinecap="round" />
          <rect x={IN_X - 6} y={CAM.y + 2} width={12} height={13} rx={2} fill="none" stroke="var(--diagram-ink)" strokeWidth={1.6} />
          <path d={`M ${IN_X + 6} ${CAM.y + 5} a 4 4 0 0 1 0 8`} fill="none" stroke="var(--diagram-ink)" strokeWidth={1.5} />
          <path d={`M ${IN_X - 40} ${CAM.y - 20} l 0 -6 l 6 0`} fill="none" stroke={VISION_TOKEN} strokeWidth={1.4} />
          <path d={`M ${IN_X + 40} ${CAM.y - 20} l 0 -6 l -6 0`} fill="none" stroke={VISION_TOKEN} strokeWidth={1.4} />
          <text className="diagram-sublabel" x={IN_X} y={CAM.y + CAM.h / 2 + 14} textAnchor="middle">
            image observation
          </text>

          <text x={IN_X} y={PROMPT.y} textAnchor="middle" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={11} fill={TEXT_TOKEN}>
            "pick up
          </text>
          <text x={IN_X} y={PROMPT.y + 14} textAnchor="middle" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={11} fill={TEXT_TOKEN}>
            the cup"
          </text>
          <text className="diagram-sublabel" x={IN_X} y={PROMPT.y + 34} textAnchor="middle">
            language instruction
          </text>

          <rect x={IN_X - STATE.w / 2} y={STATE.y - STATE.h / 2} width={STATE.w} height={STATE.h} rx={8} fill="var(--diagram-surface)" stroke={STATE_RED} strokeWidth={1.6} />
          <g transform={`translate(${IN_X - 20} ${STATE.y + 24}) scale(0.42)`}>
            <RobotDancer dancing={false} active={false} />
          </g>
          <text className="math-label" x={IN_X + 22} y={STATE.y + 4} textAnchor="middle" style={{ fill: STATE_RED }}>
            q<tspan className="math-sub" dy={3}>t</tspan>
          </text>
          <text className="diagram-sublabel" x={IN_X} y={STATE.y + STATE.h / 2 + 14} textAnchor="middle">
            robot state · joints
          </text>
        </g>

        {/* input token streams into System 2 */}
        <FlowParticles x={IN_X + CAM.w / 2 + 4} y={CAM.y} y2={S2.y + 20} dx={GROOT.x - IN_X - CAM.w / 2 - 10} spreadStart={5} spreadEnd={4} count={4} duration={0.85} radius={2} shape="square" color={VISION_TOKEN} active={since('system2') && !staticMode} />
        <FlowParticles x={IN_X + 42} y={PROMPT.y + 4} y2={S2.y + 32} dx={GROOT.x - IN_X - 46} spreadStart={4} spreadEnd={3} count={4} duration={0.85} radius={2} shape="square" color={TEXT_TOKEN} active={since('system2') && !staticMode} />
        <FlowParticles x={IN_X + STATE.w / 2 + 4} y={STATE.y} y2={S2.y + 46} dx={GROOT.x - IN_X - STATE.w / 2 - 10} spreadStart={4} spreadEnd={3} count={3} duration={0.85} radius={2} shape="square" color={STATE_RED} active={since('system2') && !staticMode} />

        {/* ================= GR00T: two systems, one model ================= */}
        <g className="stage" style={focus('system2', 'system1', 'direct')}>
          <rect x={GROOT.x} y={GROOT.y} width={GROOT.w} height={GROOT.h} rx={13} fill="var(--diagram-surface)" stroke={since('system2') ? 'var(--diagram-ink)' : 'var(--diagram-line)'} strokeWidth={1.5} style={{ transition: 'stroke 600ms ease' }} />
          <text x={GROOT.x + 14} y={GROOT.y + 24} fontFamily="var(--diagram-font-label)" fontSize={13.5} fontWeight={700} fill="var(--diagram-ink)">
            GR00T
          </text>
          <SubBlock x={S2.x} y={S2.y} w={S2.w} h={S2.h} title="SYSTEM 2" subtitle="VISION-LANGUAGE MODEL · ~10 HZ" accent={S2_PINK} active={since('system2')}>
            {Array.from({ length: 8 }, (_, i) => (
              <rect key={i} x={S2.x + 12 + i * 14} y={S2.y + 42} width={10} height={10} rx={2} fill={i < 4 ? VISION_TOKEN : i < 7 ? TEXT_TOKEN : STATE_RED} opacity={since('system2') ? 0.85 : 0.25} style={{ transition: `opacity 400ms ease ${i * 50}ms` }} />
            ))}
          </SubBlock>
          <line x1={GROOT.x + GROOT.w / 2} y1={S2.y + S2.h + 3} x2={GROOT.x + GROOT.w / 2} y2={S1.y - 3} stroke={S2_PINK} strokeWidth={1.6} strokeLinecap="round" opacity={since('system1') ? 0.8 : 0.25} style={{ transition: 'opacity 500ms ease' }} />
          <path d={`M ${GROOT.x + GROOT.w / 2 - 4} ${S1.y - 8} l 4 5 l 4 -5`} fill="none" stroke={S2_PINK} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" opacity={since('system1') ? 0.8 : 0.25} style={{ transition: 'opacity 500ms ease' }} />
          <SubBlock x={S1.x} y={S1.y} w={S1.w} h={S1.h} title="SYSTEM 1" subtitle="ACTION HEAD · FAST" accent={directOn && !staticMode ? LATENT : S1_TEAL} active={since('system1')}>
            {/* classic output: the denoising strip… */}
            <g className="stage" style={{ opacity: directOn && !staticMode ? 0 : 1 }}>
              {Array.from({ length: 8 }, (_, i) => (
                <rect key={i} x={S1.x + 12 + i * 14} y={S1.y + 42} width={10} height={10} rx={2} fill={S1_TEAL} opacity={since('system1') ? 0.2 + i * 0.1 : 0.15} style={{ transition: `opacity 400ms ease ${i * 50}ms` }} />
              ))}
            </g>
            {/* …which the finetune turns into SONIC's OWN latent cells:
                same purple, same pattern, breathing in sync with the bar
                (mounted on the same clock, revealed at direct). */}
            <g className="stage" style={{ opacity: directOn && !staticMode ? 1 : staticMode ? 0.9 : 0 }}>
              <LatentRack x={S1.x + 2} y={S1.y + 47} cells={7} cellSize={11} gap={3} color={LATENT} mode={since('hybrid') && !staticMode ? 'live' : staticMode ? 'hold' : 'idle'} pattern={[0, 2, 4, 6]} board={false} />
            </g>
          </SubBlock>
        </g>

        {/* ================= the action chunk, below GR00T =================
            Classic-path equipment: dims once the head emits latents. */}
        <g className="stage" style={{ ...focus('system1', 'hybrid', 'decode'), opacity: directOn && !staticMode ? 0.3 : (focus('system1', 'hybrid', 'decode').opacity as number) }}>
          <rect x={CHUNK.x} y={CHUNK.y} width={CHUNK.w} height={CHUNK.h} rx={10} fill="var(--diagram-surface)" stroke={S1_TEAL} strokeWidth={1.5} strokeDasharray="6 4" />
          <text className="math-label" x={CHUNK.x + 52} y={CHUNK.y + 24} textAnchor="middle">
            a<tspan className="math-sub" dy={3}>t</tspan>
            <tspan dy={-3}> … </tspan>a<tspan className="math-sub" dy={3}>t+H</tspan>
          </text>
          <text className="diagram-sublabel" x={CHUNK.x + 12} y={CHUNK.y + 42}>
            upper-body actions
          </text>
        </g>
        {/* System 1 → chunk (classic mode) */}
        <FlowParticles x={GROOT.x + GROOT.w / 2 - 30} y={GROOT.y + GROOT.h + 4} dx={0.001} y2={CHUNK.y - 4} spreadStart={26} spreadEnd={26} count={3} duration={0.5} radius={2} shape="square" color={S1_TEAL} active={since('system1') && !directOn && !staticMode} />

        {/* ================= the kinematic planner (lower body) ============
            Absorbed once the latents are whole-body: dims in direct mode. */}
        <g className="stage" style={{ ...focus('lower', 'hybrid', 'decode'), opacity: directOn && !staticMode ? 0.3 : (focus('lower', 'hybrid', 'decode').opacity as number) }}>
          <rect x={PLANNER.x} y={PLANNER.y} width={PLANNER.w} height={PLANNER.h} rx={10} fill="var(--diagram-surface)" stroke={since('lower') ? PLANNER_BLUE : 'var(--diagram-line)'} strokeWidth={1.5} style={{ transition: 'stroke 500ms ease' }} />
          <text x={PLANNER.x + 12} y={PLANNER.y + 20} fontFamily="var(--diagram-font-label)" fontSize={10.5} fontWeight={700} fill="var(--diagram-ink)">
            KINEMATIC PLANNER
          </text>
          <text x={PLANNER.x + 12} y={PLANNER.y + 36} className="diagram-sublabel">
            lower body · stance &amp; steps
          </text>
        </g>

        {/* ================= two parallel streams into the adapter ========== */}
        {/* the teleop wrapper: VR headset + tracked joints, alive with flow */}
        <g className="stage" style={{ ...focus('hybrid', 'decode', 'direct'), opacity: directOn && !staticMode ? 0.35 : (focus('hybrid', 'decode', 'direct').opacity as number) }}>
          <rect x={TELEOP.x - TELEOP.w / 2} y={TELEOP.y - TELEOP.h / 2} width={TELEOP.w} height={TELEOP.h} rx={9} fill="var(--diagram-surface)" stroke="var(--diagram-muted)" strokeWidth={1.4} />
          {/* VR headset */}
          <rect x={TELEOP.x - 46} y={TELEOP.y - 17} width={34} height={17} rx={7} fill="none" stroke="var(--diagram-ink)" strokeWidth={1.6} />
          <path d={`M ${TELEOP.x - 33} ${TELEOP.y} q 4 -4 8 0`} fill="none" stroke="var(--diagram-ink)" strokeWidth={1.5} />
          <path d={`M ${TELEOP.x - 46} ${TELEOP.y - 11} q -7 0 -7 5`} fill="none" stroke="var(--diagram-ink)" strokeWidth={1.4} />
          <path d={`M ${TELEOP.x - 12} ${TELEOP.y - 11} q 7 0 7 5`} fill="none" stroke="var(--diagram-ink)" strokeWidth={1.4} />
          {/* tracked joints: a little arm that lights up with the data */}
          <g stroke={S1_TEAL} strokeWidth={1.8} strokeLinecap="round">
            <line x1={TELEOP.x + 8} y1={TELEOP.y - 12} x2={TELEOP.x + 24} y2={TELEOP.y - 2} />
            <line x1={TELEOP.x + 24} y1={TELEOP.y - 2} x2={TELEOP.x + 42} y2={TELEOP.y - 10} />
          </g>
          {[0, 1, 2].map((i) => (
            <circle
              key={i}
              className={`teleop-joint${teleopFlow ? ' flowing' : ''}`}
              cx={TELEOP.x + 8 + i * 17}
              cy={TELEOP.y - 12 + (i === 1 ? 10 : i === 2 ? 2 : 0)}
              r={3.2}
              fill={S1_TEAL}
              opacity={0.45}
              style={{ '--d': `${i * 0.22}s` } as CSSVarStyle}
            />
          ))}
          <text x={TELEOP.x} y={TELEOP.y + 20} textAnchor="middle" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={9.5} fill="var(--diagram-muted)">
            teleop.json
          </text>
        </g>
        <line x1={TELEOP.x - 58} y1={TELEOP.y + 22} x2={TELEOP.x + 58} y2={TELEOP.y - 22} stroke={STATE_RED} strokeWidth={2.4} strokeLinecap="round" className="stage" style={{ opacity: directOn && !staticMode ? 1 : 0 }} />

        {/* upper stream: chunk → teleop → encoder (classic) */}
        <FlowParticles x={CHUNK.x + CHUNK.w + 6} y={TOP_Y} dx={TELEOP.x - TELEOP.w / 2 - CHUNK.x - CHUNK.w - 12} spreadStart={3} spreadEnd={3} count={4} duration={0.65} radius={2} shape="square" color={S1_TEAL} active={teleopFlow} />
        <FlowParticles x={TELEOP.x + TELEOP.w / 2 + 4} y={TOP_Y} y2={HENC.y - 18} dx={HENC.x - 4 - TELEOP.x - TELEOP.w / 2} spreadStart={3} spreadEnd={3} count={3} duration={0.55} radius={2} shape="square" color={S1_TEAL} active={teleopFlow} />
        {/* the finetuned path: the head's lit cells and SONIC's lit cells
            are ONE space — the ribbon runs square-to-square, cell strip
            to cell column, through both blocks' walls */}
        <path
          d={`M ${S1.x + 108} ${S1.y + 40} C 500 154, ${RACK.x + 8} 166, ${RACK.x + 8} ${RACK.y + 12} L ${RACK.x - 8} ${RACK.y + 12} C ${RACK.x - 8} 174, 500 170, ${S1.x + 108} ${S1.y + 54} Z`}
          fill={LATENT}
          stroke="none"
          className="stage"
          style={{ opacity: directOn ? 0.09 : 0 }}
        />
        <path
          d={`M ${S1.x + 110} ${S1.y + 47} C 500 162, ${RACK.x} 170, ${RACK.x} ${RACK.y + 12}`}
          fill="none"
          stroke={LATENT}
          strokeWidth={1.7}
          strokeDasharray="5 4"
          strokeLinecap="round"
          className="stage"
          style={{ opacity: directOn ? 0.9 : 0 }}
        />
        <text className="math-label" x={555} y={168} textAnchor="middle" style={{ opacity: directOn ? 1 : 0, fill: LATENT, transition: 'opacity 500ms ease' }}>
          z<tspan className="math-sub" dy={3}>t</tspan>
          <tspan dy={-3}> … </tspan>z<tspan className="math-sub" dy={3}>t+H</tspan>
        </text>
        <FlowParticles x={S1.x + 112} y={S1.y + 44} y2={184} dx={565 - S1.x - 114} spreadStart={3} spreadEnd={3} count={3} duration={0.5} radius={2} shape="square" color={LATENT} active={directOn && !staticMode} />
        <FlowParticles x={570} y={184} y2={202} dx={RACK.x - 12 - 570} spreadStart={3} spreadEnd={3} count={3} duration={0.5} radius={2} shape="square" color={LATENT} active={directOn && !staticMode} />
        <FlowParticles x={RACK.x} y={214} dx={0.001} y2={RACK.y + 8} spreadStart={2} spreadEnd={2} count={3} duration={0.5} radius={2} shape="square" color={LATENT} active={directOn && !staticMode} />

        {/* lower stream: planner → encoder (absorbed in direct mode) */}
        <FlowParticles x={PLANNER.x + PLANNER.w + 6} y={BOT_Y} y2={HENC.y + 20} dx={HENC.x - 4 - PLANNER.x - PLANNER.w - 10} spreadStart={3} spreadEnd={3} count={5} duration={0.7} radius={2} color={PLANNER_BLUE} active={since('hybrid') && !directOn && !staticMode} />

        {/* ================= SONIC: adapter + vertical latents ============== */}
        <g className="stage" style={focus('hybrid', 'decode', 'direct')}>
          <rect x={SONIC.x} y={SONIC.y} width={SONIC.w} height={SONIC.h} rx={13} fill="var(--diagram-surface)" stroke={since('hybrid') ? LATENT : 'var(--diagram-line)'} strokeWidth={1.5} style={{ transition: 'stroke 600ms ease' }} />
          <text x={SONIC.x + 16} y={SONIC.y + 26} fontFamily="var(--diagram-font-label)" fontSize={13.5} fontWeight={700} fill="var(--diagram-ink)">
            SONIC
          </text>
          <text x={SONIC.x + 16} y={SONIC.y + 42} fontFamily="var(--diagram-font-label)" fontSize={9} fontWeight={600} letterSpacing="0.05em" fill={LATENT}>
            50 HZ
          </text>
          <LatentRack x={RACK.x} y={RACK.y} cells={7} cellSize={13} gap={3} color={LATENT} mode={since('hybrid') && !staticMode ? 'live' : staticMode ? 'hold' : 'idle'} pattern={[0, 2, 4, 6]} vertical />
        </g>
        {/* the Hybrid Encoder straddles SONIC's edge: an adapter for 2
            streams — bypassed entirely once Gr00t speaks latents */}
        <g className="stage" style={{ ...focus('hybrid', 'decode'), opacity: directOn && !staticMode ? 0.3 : (focus('hybrid', 'decode').opacity as number) }}>
          <text className="diagram-sublabel" x={HENC.x + 2} y={HENC.y - 52}>
            hybrid encoder
          </text>
          <EncoderModule x={HENC.x} y={HENC.y} length={HENC.len} inletRadius={42} outletRadius={11} shape="trapezoid" color={LATENT} active={since('hybrid') && !directOn} />
        </g>
        {/* encoder → vertical rack */}
        <FlowParticles x={HENC.x + HENC.len + 4} y={HENC.y} y2={RACK.y + 62} dx={RACK.x - 22 - HENC.x - HENC.len} spreadStart={4} spreadEnd={4} count={4} duration={0.6} radius={2} color={LATENT} active={since('hybrid') && !directOn && !staticMode} />

        {/* ================= decode → the split body ======================== */}
        <FlowParticles x={SONIC.x + SONIC.w + 4} y={RACK.y + 62} y2={ZONE.waist - 12} dx={ZONE.x + 12 - SONIC.x - SONIC.w} spreadStart={3} spreadEnd={3} count={6} duration={0.55} color={ACTION} active={robotOn && !staticMode} />
        <text className="math-label" x={SONIC.x + SONIC.w + 20} y={RACK.y + 36} textAnchor="middle" style={{ opacity: robotOn ? 1 : 0.35, transition: 'opacity 500ms ease' }}>
          D<tspan className="math-sub" dy={3}>c</tspan>
        </text>

        <g className="stage" style={focus('decode', 'direct')}>
          <rect x={ZONE.x} y={ZONE.top} width={ZONE.w} height={ZONE.waist - ZONE.top} rx={9} fill={S1_TEAL} fillOpacity={robotOn ? 0.1 : 0.02} stroke="none" style={{ transition: 'fill-opacity 600ms ease' }} />
          <rect x={ZONE.x} y={ZONE.waist} width={ZONE.w} height={ZONE.bottom - ZONE.waist} rx={9} fill={PLANNER_BLUE} fillOpacity={robotOn ? 0.1 : 0.02} stroke="none" style={{ transition: 'fill-opacity 600ms ease' }} />
          <line x1={ZONE.x - 6} y1={ZONE.waist} x2={ZONE.x + ZONE.w + 6} y2={ZONE.waist} stroke="var(--diagram-muted)" strokeWidth={1.2} strokeDasharray="4 4" opacity={0.8} />
          <text className="diagram-sublabel" x={ZONE.x - 8} y={ZONE.top + 34} textAnchor="end" style={{ fill: S1_TEAL }}>
            task
          </text>
          <text className="diagram-sublabel" x={ZONE.x - 8} y={ZONE.waist + 26} textAnchor="end" style={{ fill: PLANNER_BLUE }}>
            balance
          </text>
        </g>
        <line x1={840} y1={ROBOT.ground} x2={954} y2={ROBOT.ground} stroke="var(--diagram-line)" strokeWidth={1.5} strokeLinecap="round" />
        <g transform={`translate(${ROBOT.x} ${ROBOT.ground}) scale(${ROBOT.scale})`}>
          <RobotDancer dancing={!staticMode && robotOn} move={robotMove} active={robotOn} accent={ACTION} />
        </g>

        {/* ================= labels ========================================== */}
        <StageLabel x={IN_X} y={LABEL_Y} text="3 inputs" active={at('inputs')} accent={VISION_TOKEN} />
        <StageLabel x={GROOT.x + GROOT.w / 2} y={LABEL_Y} text="two systems" active={at('system2') || at('system1')} accent={S2_PINK} />
        <StageLabel x={SONIC.x + SONIC.w / 2} y={LABEL_Y} text="one latent space" active={at('hybrid') || at('direct')} accent={LATENT} />
        <StageLabel x={ROBOT.x - 4} y={LABEL_Y} text="one body" active={at('decode') || at('act')} accent={ACTION} />
      </DiagramFrame>
    </div>
  )
}

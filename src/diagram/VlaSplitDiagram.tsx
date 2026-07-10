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
  { name: 'hybrid', duration: 2800, caption: 'SONIC’s Hybrid Encoder fuses both halves into the latent space…' },
  { name: 'decode', duration: 2600, caption: '…decoded into whole-body commands: arms on task, legs on balance.' },
  { name: 'direct', duration: 3000, caption: 'The upgrade: finetune Gr00t on the latent space itself — teleop format and encoder detour disappear.' },
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
const GROOT = { x: 186, y: 70, w: 240, h: 240 }
const S2 = { x: GROOT.x + 14, y: 104, w: GROOT.w - 28, h: 66 }
const S1 = { x: GROOT.x + 14, y: 190, w: GROOT.w - 28, h: 66 }
const CHUNK = { x: 452, y: 116, w: 128, h: 56 }
const TELEOP = { x: 630, y: 210 }
const SONIC = { x: 562, y: 268, w: 270, h: 152 }
const HENC = { x: 580, y: 358, len: 64 }
const RACK = { x: 664, y: 358 }
const PLANNER = { x: 300, y: 352, w: 168, h: 48 }
const ROBOT = { x: 902, ground: 452, scale: 1.15 }
const ZONE = { x: 862, w: 80, top: 364, waist: 422, bottom: 456 }
const LABEL_Y = 482

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
 * input space (image / language / robot state) feeds System 2 then
 * System 1, emitting an upper-body action chunk; a kinematic planner
 * produces the lower body; SONIC's Hybrid Encoder fuses both into the
 * latent space and decodes whole-body commands. The finale bypasses the
 * teleop-format + encoder detour by finetuning Gr00t on the latents.
 * Each phase pulls focus — everything else dims.
 */
export function VlaSplitDiagram({
  title = 'Gr00t on SONIC: camera image, language instruction and robot state feed System 2 then System 1, producing an upper-body action chunk; a kinematic planner produces the lower body; SONIC’s Hybrid Encoder fuses both into the latent space, decoded into whole-body commands — until Gr00t is finetuned to write the latents directly, bypassing the teleop detour.',
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

  /** Staged focus: full opacity while relevant, dimmed otherwise. */
  const focus = (...names: PhaseName[]): CSSVarStyle => ({
    opacity: staticMode || phase === 'act' || names.some((n) => at(n)) ? 1 : 0.3,
    transition: 'opacity 600ms ease',
  })

  const robotMove: RobotMove = 'embodied'
  const caption = staticMode
    ? 'Three inputs → System 2 → System 1 → (teleop → Hybrid Encoder →) latents → whole body.'
    : PHASES[index].caption

  return (
    <div ref={rootRef} className={className}>
      <DiagramFrame
        title={title}
        viewBox="0 42 960 460"
        theme={theme}
        caption={showCaption ? caption : undefined}
        captionKey={caption}
      >
        {/* ================= the three-point input space ================= */}
        <g className="stage" style={focus('inputs', 'system2')}>
          {/* 1 · image observation */}
          <rect x={IN_X - CAM.w / 2} y={CAM.y - CAM.h / 2} width={CAM.w} height={CAM.h} rx={8} fill="var(--diagram-surface)" stroke={VISION_TOKEN} strokeWidth={1.6} />
          <line x1={IN_X - 30} y1={CAM.y + 16} x2={IN_X + 30} y2={CAM.y + 16} stroke="var(--diagram-muted)" strokeWidth={1.5} strokeLinecap="round" />
          <rect x={IN_X - 6} y={CAM.y + 2} width={12} height={13} rx={2} fill="none" stroke="var(--diagram-ink)" strokeWidth={1.6} />
          <path d={`M ${IN_X + 6} ${CAM.y + 5} a 4 4 0 0 1 0 8`} fill="none" stroke="var(--diagram-ink)" strokeWidth={1.5} />
          <path d={`M ${IN_X - 40} ${CAM.y - 20} l 0 -6 l 6 0`} fill="none" stroke={VISION_TOKEN} strokeWidth={1.4} />
          <path d={`M ${IN_X + 40} ${CAM.y - 20} l 0 -6 l -6 0`} fill="none" stroke={VISION_TOKEN} strokeWidth={1.4} />
          <text className="diagram-sublabel" x={IN_X} y={CAM.y + CAM.h / 2 + 14} textAnchor="middle">
            image observation
          </text>

          {/* 2 · language instruction */}
          <text x={IN_X} y={PROMPT.y} textAnchor="middle" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={11} fill={TEXT_TOKEN}>
            "pick up
          </text>
          <text x={IN_X} y={PROMPT.y + 14} textAnchor="middle" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={11} fill={TEXT_TOKEN}>
            the cup"
          </text>
          <text className="diagram-sublabel" x={IN_X} y={PROMPT.y + 34} textAnchor="middle">
            language instruction
          </text>

          {/* 3 · robot state */}
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
        <FlowParticles x={IN_X + 42} y={PROMPT.y + 4} y2={S2.y + 34} dx={GROOT.x - IN_X - 46} spreadStart={4} spreadEnd={3} count={4} duration={0.85} radius={2} shape="square" color={TEXT_TOKEN} active={since('system2') && !staticMode} />
        <FlowParticles x={IN_X + STATE.w / 2 + 4} y={STATE.y} y2={S2.y + 50} dx={GROOT.x - IN_X - STATE.w / 2 - 10} spreadStart={4} spreadEnd={3} count={3} duration={0.85} radius={2} shape="square" color={STATE_RED} active={since('system2') && !staticMode} />

        {/* ================= GR00T: two systems, one model ================= */}
        <g className="stage" style={focus('system2', 'system1')}>
          <rect x={GROOT.x} y={GROOT.y} width={GROOT.w} height={GROOT.h} rx={13} fill="var(--diagram-surface)" stroke={since('system2') ? 'var(--diagram-ink)' : 'var(--diagram-line)'} strokeWidth={1.5} style={{ transition: 'stroke 600ms ease' }} />
          <text x={GROOT.x + 14} y={GROOT.y + 25} fontFamily="var(--diagram-font-label)" fontSize={13.5} fontWeight={700} fill="var(--diagram-ink)">
            GR00T
          </text>
          <SubBlock x={S2.x} y={S2.y} w={S2.w} h={S2.h} title="SYSTEM 2" subtitle="VISION-LANGUAGE MODEL · ~10 HZ" accent={S2_PINK} active={since('system2')}>
            {Array.from({ length: 8 }, (_, i) => (
              <rect key={i} x={S2.x + 12 + i * 14} y={S2.y + 44} width={10} height={10} rx={2} fill={i < 4 ? VISION_TOKEN : i < 7 ? TEXT_TOKEN : STATE_RED} opacity={since('system2') ? 0.85 : 0.25} style={{ transition: `opacity 400ms ease ${i * 50}ms` }} />
            ))}
          </SubBlock>
          {/* plan flows down into System 1 */}
          <line x1={GROOT.x + GROOT.w / 2} y1={S2.y + S2.h + 3} x2={GROOT.x + GROOT.w / 2} y2={S1.y - 3} stroke={S2_PINK} strokeWidth={1.6} strokeLinecap="round" opacity={since('system1') ? 0.8 : 0.25} style={{ transition: 'opacity 500ms ease' }} />
          <path d={`M ${GROOT.x + GROOT.w / 2 - 4} ${S1.y - 8} l 4 5 l 4 -5`} fill="none" stroke={S2_PINK} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" opacity={since('system1') ? 0.8 : 0.25} style={{ transition: 'opacity 500ms ease' }} />
          <SubBlock x={S1.x} y={S1.y} w={S1.w} h={S1.h} title="SYSTEM 1" subtitle="ACTION HEAD · FAST" accent={S1_TEAL} active={since('system1')}>
            {/* denoising strip: cream → saturated */}
            {Array.from({ length: 8 }, (_, i) => (
              <rect key={i} x={S1.x + 12 + i * 14} y={S1.y + 44} width={10} height={10} rx={2} fill={S1_TEAL} opacity={since('system1') ? 0.2 + i * 0.1 : 0.15} style={{ transition: `opacity 400ms ease ${i * 50}ms` }} />
            ))}
          </SubBlock>
        </g>

        {/* ================= the action chunk ================= */}
        <g className="stage" style={focus('system1', 'hybrid', 'direct')}>
          <rect x={CHUNK.x} y={CHUNK.y} width={CHUNK.w} height={CHUNK.h} rx={10} fill="var(--diagram-surface)" stroke={S1_TEAL} strokeWidth={1.5} strokeDasharray="6 4" />
          <text className="math-label" x={CHUNK.x + CHUNK.w / 2} y={CHUNK.y + 26} textAnchor="middle">
            a<tspan className="math-sub" dy={3}>t</tspan>
            <tspan dy={-3}> … </tspan>a<tspan className="math-sub" dy={3}>t+H</tspan>
          </text>
          <text className="diagram-sublabel" x={CHUNK.x + CHUNK.w / 2} y={CHUNK.y + 44} textAnchor="middle">
            upper-body actions
          </text>
        </g>
        <FlowParticles x={GROOT.x + GROOT.w + 4} y={S1.y + 24} y2={CHUNK.y + 30} dx={CHUNK.x - GROOT.x - GROOT.w - 8} spreadStart={4} spreadEnd={4} count={4} duration={0.7} radius={2} shape="square" color={S1_TEAL} active={since('system1') && !staticMode} />

        {/* ================= the kinematic planner (lower body) ============ */}
        <g className="stage" style={focus('lower', 'hybrid')}>
          <rect x={PLANNER.x} y={PLANNER.y} width={PLANNER.w} height={PLANNER.h} rx={10} fill="var(--diagram-surface)" stroke={since('lower') ? PLANNER_BLUE : 'var(--diagram-line)'} strokeWidth={1.5} style={{ transition: 'stroke 500ms ease' }} />
          <text x={PLANNER.x + 12} y={PLANNER.y + 20} fontFamily="var(--diagram-font-label)" fontSize={10.5} fontWeight={700} fill="var(--diagram-ink)">
            KINEMATIC PLANNER
          </text>
          <text x={PLANNER.x + 12} y={PLANNER.y + 36} className="diagram-sublabel">
            lower body · stance &amp; steps
          </text>
          {/* little gait ticks, tucked in the top-right corner */}
          {[0, 1, 2].map((i) => (
            <path key={i} d={`M ${PLANNER.x + PLANNER.w - 42 + i * 11} ${PLANNER.y + 16} q 3 -8 6 0`} fill="none" stroke={PLANNER_BLUE} strokeWidth={1.5} strokeLinecap="round" opacity={since('lower') ? 0.8 : 0.3} style={{ transition: 'opacity 500ms ease' }} />
          ))}
        </g>

        {/* ================= SONIC: hybrid encoder → latents ================ */}
        <g className="stage" style={focus('hybrid', 'decode', 'direct')}>
          <rect x={SONIC.x} y={SONIC.y} width={SONIC.w} height={SONIC.h} rx={13} fill="var(--diagram-surface)" stroke={since('hybrid') ? LATENT : 'var(--diagram-line)'} strokeWidth={1.5} style={{ transition: 'stroke 600ms ease' }} />
          <text x={SONIC.x + 14} y={SONIC.y + 24} fontFamily="var(--diagram-font-label)" fontSize={13.5} fontWeight={700} fill="var(--diagram-ink)">
            SONIC
          </text>
          <text x={SONIC.x + 78} y={SONIC.y + 24} fontFamily="var(--diagram-font-label)" fontSize={9.5} fontWeight={600} letterSpacing="0.06em" fill={LATENT}>
            WHOLE-BODY CONTROL · 50 HZ
          </text>
          <g className="stage" style={{ opacity: directOn && !staticMode ? 0.3 : 1, transition: 'opacity 600ms ease' }}>
            <text className="diagram-sublabel" x={HENC.x + 2} y={SONIC.y + 52}>
              hybrid encoder
            </text>
            <EncoderModule x={HENC.x} y={HENC.y} length={HENC.len} inletRadius={21} outletRadius={9} shape="trapezoid" color={LATENT} active={since('hybrid') && !directOn} />
          </g>
          <LatentRack x={RACK.x} y={RACK.y} cells={7} cellSize={13} gap={3} color={LATENT} mode={since('hybrid') && !staticMode ? 'live' : staticMode ? 'hold' : 'idle'} pattern={[0, 2, 4, 6]} />
        </g>

        {/* ================= the teleop-format middleman ==================== */}
        <g className="stage" style={{ ...focus('hybrid', 'direct'), opacity: directOn && !staticMode ? 0.35 : (focus('hybrid', 'direct').opacity as number) }}>
          <path d={`M ${CHUNK.x + CHUNK.w / 2} ${CHUNK.y + CHUNK.h + 2} C 530 196, 560 208, ${TELEOP.x - 50} ${TELEOP.y}`} fill="none" stroke="var(--diagram-muted)" strokeWidth={1.2} strokeDasharray="3 4" />
          <path d={`M ${TELEOP.x + 12} ${TELEOP.y + 14} C 640 244, 620 300, ${HENC.x + 34} ${HENC.y - 24}`} fill="none" stroke="var(--diagram-muted)" strokeWidth={1.2} strokeDasharray="3 4" />
          <rect x={TELEOP.x - 46} y={TELEOP.y - 13} width={92} height={26} rx={6} fill="var(--diagram-surface)" stroke="var(--diagram-muted)" strokeWidth={1.4} />
          <text x={TELEOP.x} y={TELEOP.y + 3.5} textAnchor="middle" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={10} fill="var(--diagram-muted)">
            teleop.json
          </text>
        </g>
        <line x1={TELEOP.x - 52} y1={TELEOP.y + 11} x2={TELEOP.x + 52} y2={TELEOP.y - 11} stroke={STATE_RED} strokeWidth={2.4} strokeLinecap="round" className="stage" style={{ opacity: directOn ? 1 : 0 }} />

        {/* upper body flow: chunk → teleop → hybrid encoder (classic path) */}
        <FlowParticles x={CHUNK.x + CHUNK.w / 2 + 10} y={CHUNK.y + CHUNK.h + 6} y2={TELEOP.y - 6} dx={TELEOP.x - 60 - CHUNK.x - CHUNK.w / 2} spreadStart={3} spreadEnd={3} count={4} duration={0.7} radius={2} shape="square" color={S1_TEAL} active={since('hybrid') && !directOn && !staticMode} />
        <FlowParticles x={TELEOP.x + 14} y={TELEOP.y + 16} y2={HENC.y - 20} dx={HENC.x + 30 - TELEOP.x - 14} spreadStart={3} spreadEnd={3} count={4} duration={0.7} radius={2} shape="square" color={S1_TEAL} active={since('hybrid') && !directOn && !staticMode} />
        {/* lower body flow: planner → hybrid encoder */}
        <FlowParticles x={PLANNER.x + PLANNER.w + 4} y={PLANNER.y + 24} y2={HENC.y + 6} dx={HENC.x - 6 - PLANNER.x - PLANNER.w} spreadStart={4} spreadEnd={3} count={4} duration={0.7} radius={2} color={PLANNER_BLUE} active={since('hybrid') && !staticMode} />

        {/* the direct latent write */}
        <path d={`M ${CHUNK.x + CHUNK.w - 20} ${CHUNK.y + CHUNK.h + 2} C 640 210, 700 260, ${RACK.x + 56} ${RACK.y - 16}`} fill="none" stroke={S2_PINK} strokeWidth={1.7} strokeDasharray="5 4" strokeLinecap="round" className="stage" style={{ opacity: directOn ? 0.9 : 0 }} />
        <FlowParticles x={CHUNK.x + CHUNK.w - 18} y={CHUNK.y + CHUNK.h + 6} y2={RACK.y - 18} dx={RACK.x + 52 - CHUNK.x - CHUNK.w + 14} spreadStart={4} spreadEnd={3} count={5} duration={0.8} radius={2} shape="square" color={S2_PINK} active={directOn && !staticMode} />

        {/* ================= decode → the split body ======================== */}
        <path d={`M ${SONIC.x + SONIC.w + 2} ${RACK.y} C 856 366, 866 380, ${ZONE.x + 14} ${ZONE.waist - 12}`} fill="none" stroke={ACTION} strokeWidth={1.5} strokeLinecap="round" className="stage" style={{ opacity: robotOn ? 0.6 : 0 }} />
        <FlowParticles x={SONIC.x + SONIC.w + 4} y={RACK.y} y2={ZONE.waist - 14} dx={ZONE.x + 10 - SONIC.x - SONIC.w} spreadStart={3} spreadEnd={3} count={6} duration={0.55} color={ACTION} active={robotOn && !staticMode} />
        <text className="math-label" x={SONIC.x + SONIC.w + 28} y={RACK.y - 14} textAnchor="middle" style={{ opacity: robotOn ? 1 : 0.35, transition: 'opacity 500ms ease' }}>
          D<tspan className="math-sub" dy={3}>c</tspan>
        </text>

        <g className="stage" style={focus('decode', 'direct')}>
          <rect x={ZONE.x} y={ZONE.top} width={ZONE.w} height={ZONE.waist - ZONE.top} rx={9} fill={S2_PINK} fillOpacity={robotOn ? 0.08 : 0.02} stroke="none" style={{ transition: 'fill-opacity 600ms ease' }} />
          <rect x={ZONE.x} y={ZONE.waist} width={ZONE.w} height={ZONE.bottom - ZONE.waist} rx={9} fill={PLANNER_BLUE} fillOpacity={robotOn ? 0.1 : 0.02} stroke="none" style={{ transition: 'fill-opacity 600ms ease' }} />
          <line x1={ZONE.x - 6} y1={ZONE.waist} x2={ZONE.x + ZONE.w + 6} y2={ZONE.waist} stroke="var(--diagram-muted)" strokeWidth={1.2} strokeDasharray="4 4" opacity={0.8} />
          <text className="diagram-sublabel" x={ZONE.x - 8} y={ZONE.top + 30} textAnchor="end" style={{ fill: S2_PINK }}>
            task
          </text>
          <text className="diagram-sublabel" x={ZONE.x - 8} y={ZONE.waist + 22} textAnchor="end" style={{ fill: PLANNER_BLUE }}>
            balance
          </text>
        </g>
        <line x1={846} y1={ROBOT.ground} x2={952} y2={ROBOT.ground} stroke="var(--diagram-line)" strokeWidth={1.5} strokeLinecap="round" />
        <g transform={`translate(${ROBOT.x} ${ROBOT.ground}) scale(${ROBOT.scale})`}>
          <RobotDancer dancing={!staticMode && robotOn} move={robotMove} active={robotOn} accent={ACTION} />
        </g>

        {/* ================= labels ========================================== */}
        <StageLabel x={IN_X} y={LABEL_Y} text="3 inputs" active={at('inputs')} accent={VISION_TOKEN} />
        <StageLabel x={GROOT.x + GROOT.w / 2} y={LABEL_Y} text="two systems" active={at('system2') || at('system1')} accent={S2_PINK} />
        <StageLabel x={SONIC.x + SONIC.w / 2 - 30} y={LABEL_Y} text="one latent space" active={at('hybrid') || at('direct')} accent={LATENT} />
        <StageLabel x={ROBOT.x - 4} y={LABEL_Y} text="one body" active={at('decode') || at('act')} accent={ACTION} />
      </DiagramFrame>
    </div>
  )
}

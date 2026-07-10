import { useRef } from 'react'
import { DiagramFrame } from './DiagramFrame'
import { EncoderModule } from './primitives/EncoderModule'
import { FlowParticles } from './primitives/FlowParticles'
import { LatentRack } from './primitives/LatentRack'
import { RobotDancer } from './primitives/RobotDancer'
import { useOnScreen, usePrefersReducedMotion, useTimeline } from './useTimeline'
import type { DiagramTheme } from './diagramTokens'

const S2_PINK = '#d946ef'
const S1_TEAL = '#14b8a6'
const LATENT = '#8b5cf6'
const ACTION = '#f59e0b'
const STATE_RED = '#ef4444'

const PHASES = [
  { name: 'today', duration: 4200, caption: 'Today: Gr00t’s actions detour through a teleop format and SONIC’s Hybrid Encoder into the latents.' },
  { name: 'finetuned', duration: 4200, caption: 'Finetuned: Gr00t learns to write the latent space directly — the middlemen disappear.' },
  { name: 'compare', duration: 3200, caption: 'Same dance, half the pipeline: more direct, more accurate.' },
  { name: 'reset', duration: 1000, caption: 'Cut out the middleman.' },
] as const

type PhaseName = (typeof PHASES)[number]['name']
const PHASE_INDEX = Object.fromEntries(
  PHASES.map((p, i) => [p.name, i]),
) as Record<PhaseName, number>

const ROW1_Y = 150
const ROW2_Y = 300
const GROOT_X = 90
const TELEOP_X = 300
const HENC_X = 420
const RACK_X = 560
const DEC_X = 710
const ROBOT_X = 880

export interface VlaEvolutionDiagramProps {
  title?: string
  showCaption?: boolean
  theme?: DiagramTheme
  className?: string
}

function GrootChip({ x, y, active, finetuned }: { x: number; y: number; active: boolean; finetuned?: boolean }) {
  return (
    <g>
      <rect x={x - 62} y={y - 30} width={124} height={60} rx={11} fill="var(--diagram-surface)" stroke={active ? 'var(--diagram-ink)' : 'var(--diagram-line)'} strokeWidth={1.5} style={{ transition: 'stroke 500ms ease' }} />
      <text x={x} y={y - 4} textAnchor="middle" fontFamily="var(--diagram-font-label)" fontSize={12.5} fontWeight={700} fill="var(--diagram-ink)">
        GR00T
      </text>
      <text x={x} y={y + 14} textAnchor="middle" fontFamily="var(--diagram-font-label)" fontSize={8.5} fontWeight={600} letterSpacing="0.06em" fill={finetuned ? S2_PINK : 'var(--diagram-muted)'}>
        {finetuned ? 'FINETUNED ON LATENTS' : 'SYSTEM 2 + SYSTEM 1'}
      </text>
      {finetuned && (
        <path d={`M ${x + 44} ${y - 22} l 2.2 5.4 l 5.4 2.2 l -5.4 2.2 l -2.2 5.4 l -2.2 -5.4 l -5.4 -2.2 l 5.4 -2.2 Z`} fill={S2_PINK} opacity={0.9} />
      )}
    </g>
  )
}

/**
 * Variant B: the Gr00t × SONIC story as a before/after. Row one plays
 * the classic chain (Gr00t → teleop format → Hybrid Encoder → latents →
 * decoder → robot); row two slides in with the finetuned shortcut
 * (Gr00t → latents directly), while the middlemen above gray out and
 * the teleop card takes a strike. Both rows end in the same dance.
 */
export function VlaEvolutionDiagram({
  title = 'Before and after: classically Gr00t’s upper-body actions pass through a teleop data format and SONIC’s Hybrid Encoder into the latent space; after finetuning on the latents, Gr00t writes them directly and the middlemen disappear — same dance, half the pipeline.',
  showCaption = true,
  theme,
  className,
}: VlaEvolutionDiagramProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const reducedMotion = usePrefersReducedMotion()
  const onScreen = useOnScreen(rootRef)
  const staticMode = reducedMotion
  const { phase, index } = useTimeline([...PHASES], !staticMode && onScreen)

  const at = (n: PhaseName) => !staticMode && phase === n
  const since = (n: PhaseName) =>
    staticMode || (index >= PHASE_INDEX[n] && phase !== 'reset')

  const todayOn = since('today')
  const fineOn = since('finetuned')
  const caption = staticMode
    ? 'Top: via teleop format + Hybrid Encoder. Bottom: finetuned, straight into the latents.'
    : PHASES[index].caption

  const row = (on: boolean, dimmed: boolean) => ({
    opacity: !on ? 0.15 : dimmed ? 0.35 : 1,
    transition: 'opacity 700ms ease',
  })
  const r1 = row(todayOn, fineOn && !staticMode)
  const r2 = row(fineOn, false)

  return (
    <div ref={rootRef} className={className}>
      <DiagramFrame
        title={title}
        viewBox="0 60 960 330"
        theme={theme}
        caption={showCaption ? caption : undefined}
        captionKey={caption}
      >
        {/* ============ row 1: today ============ */}
        <text className="diagram-sublabel" x={40} y={ROW1_Y - 52} style={r1}>
          TODAY
        </text>
        <g className="stage" style={r1}>
          <GrootChip x={GROOT_X + 30} y={ROW1_Y} active={todayOn && !fineOn} />
          {/* teleop format */}
          <rect x={TELEOP_X - 48} y={ROW1_Y - 14} width={96} height={28} rx={6} fill="var(--diagram-surface)" stroke="var(--diagram-muted)" strokeWidth={1.4} />
          <text x={TELEOP_X} y={ROW1_Y + 4} textAnchor="middle" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={10} fill="var(--diagram-muted)">
            teleop.json
          </text>
          {/* hybrid encoder */}
          <text className="diagram-sublabel" x={HENC_X + 34} y={ROW1_Y - 32} textAnchor="middle">
            hybrid encoder
          </text>
          <EncoderModule x={HENC_X} y={ROW1_Y} length={70} inletRadius={22} outletRadius={9} shape="trapezoid" color={LATENT} active={todayOn && !fineOn} />
          <LatentRack x={RACK_X} y={ROW1_Y} cells={6} cellSize={13} gap={3} color={LATENT} mode={todayOn && !staticMode ? 'live' : staticMode ? 'hold' : 'idle'} pattern={[0, 2, 5]} />
          <text className="math-label" x={DEC_X + 36} y={ROW1_Y - 32} textAnchor="middle">
            D<tspan className="math-sub" dy={3}>c</tspan>
          </text>
          <EncoderModule x={DEC_X} y={ROW1_Y} length={70} inletRadius={9} outletRadius={22} shape="trapezoid" direction="decode" color={ACTION} active={todayOn && !fineOn} />
          <line x1={ROBOT_X - 40} y1={ROW1_Y + 44} x2={ROBOT_X + 46} y2={ROW1_Y + 44} stroke="var(--diagram-line)" strokeWidth={1.5} strokeLinecap="round" />
          <g transform={`translate(${ROBOT_X} ${ROW1_Y + 44}) scale(0.92)`}>
            <RobotDancer dancing={!staticMode && todayOn && !fineOn} move="embodied" active={todayOn} accent={ACTION} />
          </g>
        </g>
        {/* flows row 1 */}
        <FlowParticles x={GROOT_X + 96} y={ROW1_Y} dx={TELEOP_X - 54 - GROOT_X - 100} spreadStart={3} spreadEnd={3} count={4} duration={0.7} radius={2} shape="square" color={S1_TEAL} active={todayOn && !fineOn && !staticMode} />
        <FlowParticles x={TELEOP_X + 52} y={ROW1_Y} dx={HENC_X - 6 - TELEOP_X - 52} spreadStart={3} spreadEnd={3} count={3} duration={0.7} radius={2} shape="square" color={S1_TEAL} active={todayOn && !fineOn && !staticMode} />
        <FlowParticles x={RACK_X + 128} y={ROW1_Y} dx={DEC_X - 6 - RACK_X - 128} spreadStart={3} spreadEnd={3} count={3} duration={0.6} radius={2} color={LATENT} active={todayOn && !fineOn && !staticMode} />
        <FlowParticles x={DEC_X + 74} y={ROW1_Y} y2={ROW1_Y + 4} dx={ROBOT_X - 34 - DEC_X - 74} spreadStart={3} spreadEnd={3} count={4} duration={0.6} color={ACTION} active={todayOn && !fineOn && !staticMode} />
        {/* strike the middlemen once finetuned */}
        <line x1={TELEOP_X - 54} y1={ROW1_Y + 12} x2={TELEOP_X + 54} y2={ROW1_Y - 12} stroke={STATE_RED} strokeWidth={2.4} strokeLinecap="round" className="stage" style={{ opacity: fineOn && !staticMode ? 1 : 0 }} />
        <line x1={HENC_X - 4} y1={ROW1_Y + 26} x2={HENC_X + 74} y2={ROW1_Y - 26} stroke={STATE_RED} strokeWidth={2.4} strokeLinecap="round" className="stage" style={{ opacity: fineOn && !staticMode ? 1 : 0 }} />

        {/* ============ row 2: finetuned ============ */}
        <text className="diagram-sublabel" x={40} y={ROW2_Y - 52} style={r2}>
          FINETUNED
        </text>
        <g className="stage" style={r2}>
          <GrootChip x={GROOT_X + 30} y={ROW2_Y} active={fineOn} finetuned />
          <LatentRack x={RACK_X} y={ROW2_Y} cells={6} cellSize={13} gap={3} color={LATENT} mode={fineOn && !staticMode ? 'live' : staticMode ? 'hold' : 'idle'} pattern={[1, 3, 4]} />
          <text className="math-label" x={DEC_X + 36} y={ROW2_Y - 32} textAnchor="middle">
            D<tspan className="math-sub" dy={3}>c</tspan>
          </text>
          <EncoderModule x={DEC_X} y={ROW2_Y} length={70} inletRadius={9} outletRadius={22} shape="trapezoid" direction="decode" color={ACTION} active={fineOn} />
          <line x1={ROBOT_X - 40} y1={ROW2_Y + 44} x2={ROBOT_X + 46} y2={ROW2_Y + 44} stroke="var(--diagram-line)" strokeWidth={1.5} strokeLinecap="round" />
          <g transform={`translate(${ROBOT_X} ${ROW2_Y + 44}) scale(0.92)`}>
            <RobotDancer dancing={!staticMode && fineOn} move="embodied" active={fineOn} accent={ACTION} />
          </g>
          {/* one long direct line where the middlemen used to be */}
          <path d={`M ${GROOT_X + 96} ${ROW2_Y} L ${RACK_X - 6} ${ROW2_Y}`} fill="none" stroke={S2_PINK} strokeWidth={1.7} strokeDasharray="5 4" strokeLinecap="round" />
        </g>
        <FlowParticles x={GROOT_X + 98} y={ROW2_Y} dx={RACK_X - 10 - GROOT_X - 98} spreadStart={3} spreadEnd={3} count={6} duration={0.9} radius={2} shape="square" color={S2_PINK} active={fineOn && !staticMode} />
        <FlowParticles x={RACK_X + 128} y={ROW2_Y} dx={DEC_X - 6 - RACK_X - 128} spreadStart={3} spreadEnd={3} count={3} duration={0.6} radius={2} color={LATENT} active={fineOn && !staticMode} />
        <FlowParticles x={DEC_X + 74} y={ROW2_Y} y2={ROW2_Y + 4} dx={ROBOT_X - 34 - DEC_X - 74} spreadStart={3} spreadEnd={3} count={4} duration={0.6} color={ACTION} active={fineOn && !staticMode} />

        {/* the payoff note */}
        <text className="diagram-sublabel" x={(TELEOP_X + HENC_X + 35) / 2} y={ROW2_Y + 24} textAnchor="middle" style={{ opacity: at('compare') || staticMode ? 0.95 : 0, transition: 'opacity 600ms ease', fill: S2_PINK }}>
          no conversion · no information lost
        </text>
      </DiagramFrame>
    </div>
  )
}

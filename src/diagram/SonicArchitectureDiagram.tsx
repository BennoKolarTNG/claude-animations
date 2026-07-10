import { useRef, type ReactNode } from 'react'
import { DiagramFrame } from './DiagramFrame'
import { EncoderModule, type ModuleShape } from './primitives/EncoderModule'
import { FlowParticles } from './primitives/FlowParticles'
import { LatentRack, type LatentRackMode } from './primitives/LatentRack'
import { RobotDancer, type RobotMove } from './primitives/RobotDancer'
import { StageLabel } from './primitives/StageLabel'
import { useOnScreen, usePrefersReducedMotion, useTimeline } from './useTimeline'
import type { CSSVarStyle, DiagramTheme } from './diagramTokens'

const ROBOT_BLUE = '#4f8cff'
const SMPL_RED = '#ef4444'
const LATENT = '#8b5cf6'
const ACTION = '#f59e0b'
const NEW_GREEN = '#22c55e'
const GRAY = 'var(--diagram-muted)'

/** Different inputs light different cells — but always the same purple. */
const PATTERN_ROBOT = [0, 2, 3, 6, 9, 10]
const PATTERN_SMPL = [1, 3, 5, 7, 8, 11]
const PATTERN_NEXT = [0, 4, 6, 8, 10]

/**
 * Each source streams for ~10s: ~1s of encoding latency, then the decoder
 * starts emitting while the encoder is STILL feeding — the latent space
 * as a live translator, not a batch pipeline.
 */
/** Crossover micro-phases: the outgoing encoder overlaps the incoming
 * one for a beat, then hands off — no hard cut, no long double-feed. */
const PHASES = [
  { name: 'intro', duration: 1800, caption: 'SONIC: one learned latent language for whole-body control.' },
  { name: 'blueIn', duration: 1200, caption: 'A G1 motion file starts streaming through its encoder…' },
  { name: 'blueLive', duration: 8800, caption: '…and the latent space translates it live — joint commands out while frames still come in.' },
  { name: 'xover1', duration: 250, caption: 'Now a human SMPL clip streams in…' },
  { name: 'redIn', duration: 950, caption: 'Now a human SMPL clip streams in…' },
  { name: 'redLive', duration: 8800, caption: '…same cells, same decoder. The latent space doesn’t care who is talking.' },
  { name: 'xover2', duration: 250, caption: 'Any future encoder can start feeding…' },
  { name: 'grayIn', duration: 950, caption: 'Any future encoder can start feeding…' },
  { name: 'grayLive', duration: 8800, caption: '…teleop, gen-AI, whatever comes next — translated live all the same.' },
  { name: 'xover3', duration: 250, caption: 'And with a decoder trained for a new humanoid…' },
  { name: 'dualIn', duration: 950, caption: 'And with a decoder trained for a new humanoid…' },
  { name: 'dualLive', duration: 8800, caption: '…the same stream drives a whole different robot, in step with the G1.' },
  { name: 'reset', duration: 1500, caption: '…mix and match.' },
] as const

type PhaseName = (typeof PHASES)[number]['name']
const PHASE_INDEX = Object.fromEntries(
  PHASES.map((p, i) => [p.name, i]),
) as Record<PhaseName, number>

// --- layout constants (SVG user units) --------------------------------------
const CARD = { x: 82, w: 60, h: 44 }
const ENC = { x: 150, length: 105, r1: 26, r2: 12 }
const ROW_ROBOT = 125
const ROW_SMPL = 225
const ROW_GHOST = 315
const RACK = { x: 320, y: 196, cells: 12, cellSize: 18, gap: 4 }
const RACK_RIGHT = 600
const DEC = { x: 660, length: 105, r1: 12, r2: 24 }
const DEC_REAL_Y = 155
const DEC_GHOST_Y = 298
const REAL_ROBOT = { x: 872, ground: 240 }
const NEW_ROBOT = { x: 872, ground: 362 }
const LABEL_Y = 408

/** LaTeX-flavored module annotation, e.g. ℰ_Robot. */
function MathLabel({
  x,
  y,
  base,
  sub,
  opacity = 1,
}: {
  x: number
  y: number
  base: string
  sub: string
  opacity?: number
}) {
  return (
    <text className="math-label" x={x} y={y} textAnchor="middle" style={{ opacity }}>
      {base}
      <tspan className="math-sub" dy={3.5}>
        {sub}
      </tspan>
    </text>
  )
}

/** A small motion file: rounded card + glyph + filename underneath. */
function FileCard({
  y,
  color,
  active,
  dimmed,
  dashed,
  filename,
  children,
}: {
  y: number
  color: string
  active?: boolean
  dimmed?: boolean
  dashed?: boolean
  filename: string
  children: ReactNode
}) {
  const style: CSSVarStyle = {
    transform: `translate(${CARD.x}px, ${y}px)`,
    opacity: dimmed ? 0.4 : 1,
  }
  return (
    <g className="stage" style={style}>
      <g className={`motion-card${active ? ' active' : ''}`}>
        <rect
          className="motion-card-halo"
          x={-CARD.w / 2 - 3}
          y={-CARD.h / 2 - 3}
          width={CARD.w + 6}
          height={CARD.h + 6}
          rx={11}
          fill="none"
          stroke={color}
          strokeWidth={5}
        />
        <rect
          x={-CARD.w / 2}
          y={-CARD.h / 2}
          width={CARD.w}
          height={CARD.h}
          rx={8}
          fill="var(--diagram-surface)"
          stroke={color}
          strokeWidth={1.6}
          strokeDasharray={dashed ? '5 4' : undefined}
        />
        {children}
      </g>
      <text className="diagram-sublabel" y={CARD.h / 2 + 14} textAnchor="middle">
        {filename}
      </text>
    </g>
  )
}

/** Socket notch on the latent board — the "plug in here" affordance. */
function Socket({ x, y }: { x: number; y: number }) {
  return (
    <rect
      x={x}
      y={y - 11}
      width={13}
      height={22}
      rx={3.5}
      fill="var(--diagram-bg)"
      stroke="var(--diagram-line)"
      strokeWidth={1.5}
    />
  )
}

export interface SonicArchitectureDiagramProps {
  title?: string
  showCaption?: boolean
  theme?: DiagramTheme
  /** Module silhouette for encoders/decoders. */
  moduleShape?: ModuleShape
  className?: string
}

/**
 * NVIDIA SONIC's encoder–latent–decoder architecture as a LIVE translator:
 * each input streams continuously while the decoder emits in parallel, the
 * purple latent cells breathing the whole time. Finale: a new decoder
 * drives a second, green humanoid in sync while the G1 grays out.
 */
export function SonicArchitectureDiagram({
  title = 'SONIC architecture: robot-file and SMPL encoders stream through one purple latent space that translates live into robot joint commands; new encoders and a new decoder driving a second humanoid show the expandability.',
  showCaption = true,
  theme,
  moduleShape = 'trapezoid',
  className,
}: SonicArchitectureDiagramProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const reducedMotion = usePrefersReducedMotion()
  const onScreen = useOnScreen(rootRef)
  const staticMode = reducedMotion
  const { phase, index } = useTimeline([...PHASES], !staticMode && onScreen)

  const at = (n: PhaseName) => !staticMode && phase === n

  // Which source is streaming. The outgoing encoder only overlaps the
  // incoming one during the brief crossover phase.
  const blueFeeding = at('blueIn') || at('blueLive') || at('xover1')
  const redFeeding =
    at('xover1') || at('redIn') || at('redLive') || at('xover2') ||
    at('xover3') || at('dualIn') || at('dualLive')
  const grayFeeding = at('xover2') || at('grayIn') || at('grayLive') || at('xover3')
  const anyFeeding = blueFeeding || redFeeding || grayFeeding

  // Once decoding starts (~1s after the first frames), it never pauses:
  // particles, latent glow and dancing carry through every source switch.
  const g1Decoding =
    !staticMode && index >= PHASE_INDEX.blueLive && phase !== 'reset'
  const dualPhase = at('dualIn') || at('dualLive')

  const rackMode: LatentRackMode = staticMode
    ? 'hold'
    : anyFeeding
      ? 'live'
      : 'idle'
  const rackPattern = staticMode
    ? PATTERN_ROBOT
    : dualPhase
      ? PATTERN_SMPL
      : grayFeeding
        ? PATTERN_NEXT
        : redFeeding
          ? PATTERN_SMPL
          : PATTERN_ROBOT

  // The G1 dances continuously: it keeps performing the previous motion
  // through each ramp-in, then CROSSFADES straight into the next move
  // when its stream goes live (RobotDancer glides pose→pose, no stop at
  // rest). Only before the finale does it rest — both robots then enter
  // disco from idle in the same render, so their animations share one
  // clock and stay in perfect sync.
  const settling = at('dualIn')
  const g1Move: RobotMove =
    index >= PHASE_INDEX.dualLive
      ? 'disco'
      : index >= PHASE_INDEX.grayLive
        ? 'wave'
        : index >= PHASE_INDEX.redLive
          ? 'sidewiggle'
          : 'kick'
  const g1Dancing = g1Decoding && !settling
  const g1Active = staticMode || (index >= PHASE_INDEX.blueLive && !dualPhase && phase !== 'reset')

  const caption = staticMode
    ? 'Encoders in, one live latent translator, decoders out — mix and match.'
    : PHASES[index].caption

  return (
    <div ref={rootRef} className={className}>
      <DiagramFrame
        title={title}
        viewBox="0 74 960 352"
        theme={theme}
        caption={showCaption ? caption : undefined}
        captionKey={caption}
      >
        {/* --- input files ---------------------------------------------------- */}
        <FileCard
          y={ROW_ROBOT}
          color={ROBOT_BLUE}
          active={blueFeeding}
          dimmed={anyFeeding && !blueFeeding}
          filename="motion_042.csv"
        >
          <g stroke={ROBOT_BLUE} strokeWidth={1.7} strokeLinecap="round" fill="none">
            <path d="M -20 -9 q 5 -8 10 0 t 10 0 t 10 0" />
            <path d="M -20 1 q 5 7 10 0 t 10 0 t 10 0" opacity={0.7} />
            <path d="M -20 11 h 40" strokeDasharray="3 4" opacity={0.5} />
          </g>
        </FileCard>
        <FileCard
          y={ROW_SMPL}
          color={SMPL_RED}
          active={redFeeding}
          dimmed={anyFeeding && !redFeeding}
          filename="dance_07.smpl"
        >
          <g stroke={SMPL_RED} strokeWidth={1.9} strokeLinecap="round" fill="none">
            <circle cx={0} cy={-10} r={3.1} />
            <path d="M 0 -6.5 L 0 3" />
            <path d="M 0 -3.5 L -8 1.5" />
            <path d="M 0 -3.5 L 8 1.5" />
            <path d="M 0 3 L -5.5 12" />
            <path d="M 0 3 L 5.5 12" />
          </g>
        </FileCard>
        <FileCard
          y={ROW_GHOST}
          color="var(--diagram-muted)"
          dashed
          active={grayFeeding}
          dimmed={anyFeeding && !grayFeeding}
          filename="your_input ⋯"
        >
          <text
            textAnchor="middle"
            y={7}
            fontSize={20}
            fill="var(--diagram-muted)"
            fontFamily="var(--diagram-font-label)"
          >
            +
          </text>
        </FileCard>

        {/* --- encoders --------------------------------------------------------- */}
        <EncoderModule x={ENC.x} y={ROW_ROBOT} length={ENC.length} inletRadius={ENC.r1} outletRadius={ENC.r2} shape={moduleShape} color={ROBOT_BLUE} active={blueFeeding} />
        <EncoderModule x={ENC.x} y={ROW_SMPL} length={ENC.length} inletRadius={ENC.r1} outletRadius={ENC.r2} shape={moduleShape} color={SMPL_RED} active={redFeeding} />
        <EncoderModule x={ENC.x} y={ROW_GHOST} length={ENC.length} inletRadius={ENC.r1} outletRadius={ENC.r2} shape={moduleShape} color={GRAY} active={grayFeeding} dashed />
        <MathLabel x={ENC.x + 52} y={ROW_ROBOT - 40} base="ℰ" sub="Robot" />
        <MathLabel x={ENC.x + 52} y={ROW_SMPL - 40} base="ℰ" sub="Human" />
        <MathLabel x={ENC.x + 52} y={ROW_GHOST - 40} base="ℰ" sub="next" opacity={grayFeeding ? 0.9 : 0.45} />

        {/* ghost encoder → socket dock, while it feeds */}
        <path
          d="M 258 315 C 288 310, 302 250, 309 212"
          fill="none"
          stroke="var(--diagram-muted)"
          strokeWidth={1.3}
          strokeDasharray="3 5"
          strokeLinecap="round"
          className="stage"
          style={{ opacity: grayFeeding || staticMode ? 0.7 : 0 }}
        />

        {/* --- latent space ------------------------------------------------------ */}
        <Socket x={306} y={RACK.y} />
        <Socket x={RACK_RIGHT - 1} y={RACK.y} />
        <LatentRack
          x={RACK.x}
          y={RACK.y}
          cells={RACK.cells}
          cellSize={RACK.cellSize}
          gap={RACK.gap}
          color={LATENT}
          mode={rackMode}
          pattern={rackPattern}
        />

        {/* --- encode flows (continuous while a source streams) ------------------ */}
        <FlowParticles x={CARD.x + CARD.w / 2 + 4} y={ROW_ROBOT} dx={ENC.x - CARD.x - CARD.w / 2 - 6} spreadStart={10} spreadEnd={8} count={4} duration={0.8} radius={2.1} color={ROBOT_BLUE} active={blueFeeding} />
        <FlowParticles x={ENC.x + 4} y={ROW_ROBOT} dx={ENC.length - 6} spreadStart={16} spreadEnd={5} count={5} duration={0.9} color={ROBOT_BLUE} active={blueFeeding} />
        <FlowParticles x={ENC.x + ENC.length + 4} y={ROW_ROBOT} y2={RACK.y - 5} dx={47} spreadStart={4} spreadEnd={3} count={4} duration={0.7} color={ROBOT_BLUE} active={blueFeeding} />

        <FlowParticles x={CARD.x + CARD.w / 2 + 4} y={ROW_SMPL} dx={ENC.x - CARD.x - CARD.w / 2 - 6} spreadStart={10} spreadEnd={8} count={4} duration={0.8} radius={2.1} color={SMPL_RED} active={redFeeding} />
        <FlowParticles x={ENC.x + 4} y={ROW_SMPL} dx={ENC.length - 6} spreadStart={16} spreadEnd={5} count={5} duration={0.9} color={SMPL_RED} active={redFeeding} />
        <FlowParticles x={ENC.x + ENC.length + 4} y={ROW_SMPL} y2={RACK.y + 5} dx={47} spreadStart={4} spreadEnd={3} count={4} duration={0.7} color={SMPL_RED} active={redFeeding} />

        <FlowParticles x={CARD.x + CARD.w / 2 + 4} y={ROW_GHOST} dx={ENC.x - CARD.x - CARD.w / 2 - 6} spreadStart={10} spreadEnd={8} count={4} duration={0.8} radius={2.1} color={GRAY} active={grayFeeding} />
        <FlowParticles x={ENC.x + 4} y={ROW_GHOST} dx={ENC.length - 6} spreadStart={16} spreadEnd={5} count={5} duration={0.9} color={GRAY} active={grayFeeding} />
        <FlowParticles x={ENC.x + ENC.length + 4} y={ROW_GHOST} y2={RACK.y + 9} dx={47} spreadStart={4} spreadEnd={3} count={4} duration={0.7} color={GRAY} active={grayFeeding} />

        {/* --- decoders ----------------------------------------------------------- */}
        <EncoderModule x={DEC.x} y={DEC_REAL_Y} length={DEC.length} inletRadius={DEC.r2} outletRadius={DEC.r1} shape={moduleShape} direction="decode" color={ACTION} active={g1Decoding && !dualPhase} />
        <MathLabel x={DEC.x + 52} y={DEC_REAL_Y - 38} base="D" sub="c" />
        <g className="stage" style={{ opacity: dualPhase || staticMode ? 1 : 0 }}>
          <EncoderModule x={DEC.x} y={DEC_GHOST_Y} length={DEC.length} inletRadius={DEC.r2} outletRadius={DEC.r1} shape={moduleShape} direction="decode" color={NEW_GREEN} active={at('dualLive')} />
        </g>
        <MathLabel x={DEC.x + 52} y={DEC_GHOST_Y - 38} base="D" sub="new" opacity={dualPhase || staticMode ? 0.9 : 0} />

        {/* --- decode flows (start after ~1s of latency, then run in parallel) ---- */}
        <FlowParticles x={614} y={RACK.y - 4} y2={DEC_REAL_Y + 2} dx={42} spreadStart={4} spreadEnd={3} count={4} duration={0.7} color={LATENT} active={g1Decoding} />
        <FlowParticles x={DEC.x + 4} y={DEC_REAL_Y} dx={DEC.length - 6} spreadStart={6} spreadEnd={14} count={5} duration={0.9} color={dualPhase ? GRAY : ACTION} active={g1Decoding} />
        <FlowParticles x={DEC.x + DEC.length + 6} y={DEC_REAL_Y} y2={REAL_ROBOT.ground - 60} dx={70} spreadStart={10} spreadEnd={6} count={4} duration={0.8} color={dualPhase ? GRAY : ACTION} active={g1Decoding} />
        <FlowParticles x={614} y={RACK.y + 4} y2={DEC_GHOST_Y - 2} dx={42} spreadStart={4} spreadEnd={3} count={4} duration={0.7} color={LATENT} active={at('dualLive')} />
        <FlowParticles x={DEC.x + 4} y={DEC_GHOST_Y} dx={DEC.length - 6} spreadStart={6} spreadEnd={14} count={5} duration={0.9} color={NEW_GREEN} active={at('dualLive')} />
        <FlowParticles x={DEC.x + DEC.length + 6} y={DEC_GHOST_Y} y2={NEW_ROBOT.ground - 55} dx={70} spreadStart={10} spreadEnd={6} count={4} duration={0.8} color={NEW_GREEN} active={at('dualLive')} />

        {/* --- robots -------------------------------------------------------------- */}
        <line x1={798} y1={REAL_ROBOT.ground} x2={942} y2={REAL_ROBOT.ground} stroke="var(--diagram-line)" strokeWidth={1.5} strokeLinecap="round" />
        <g transform={`translate(${REAL_ROBOT.x} ${REAL_ROBOT.ground})`}>
          <RobotDancer dancing={g1Dancing} move={g1Move} active={g1Active} accent={ACTION} />
        </g>
        <g className="stage" style={{ opacity: dualPhase || staticMode ? 1 : 0 }}>
          <line x1={798} y1={NEW_ROBOT.ground} x2={942} y2={NEW_ROBOT.ground} stroke="var(--diagram-line)" strokeWidth={1.5} strokeLinecap="round" />
          <g transform={`translate(${NEW_ROBOT.x} ${NEW_ROBOT.ground})`}>
            <RobotDancer
              variant="ghost"
              dancing={!staticMode && at('dualLive')}
              move="disco"
              active={dualPhase || staticMode}
              accent={NEW_GREEN}
            />
          </g>
        </g>

        {/* --- labels ---------------------------------------------------------------- */}
        <StageLabel x={CARD.x} y={LABEL_Y} text="inputs" active={anyFeeding} accent={ROBOT_BLUE} />
        <StageLabel x={ENC.x + ENC.length / 2} y={LABEL_Y} text="encode" active={anyFeeding} accent={ROBOT_BLUE} />
        <StageLabel x={460} y={LABEL_Y} text="latent space" active={anyFeeding} accent={LATENT} />
        <StageLabel x={DEC.x + DEC.length / 2} y={LABEL_Y} text="decode" active={g1Decoding} accent={ACTION} />
        <StageLabel x={REAL_ROBOT.x} y={LABEL_Y} text="act" active={g1Decoding} accent={ACTION} />
      </DiagramFrame>
    </div>
  )
}

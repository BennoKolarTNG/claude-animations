import { useRef } from 'react'
import { DiagramFrame } from './DiagramFrame'
import { EncoderModule } from './primitives/EncoderModule'
import { FlowParticles } from './primitives/FlowParticles'
import { HumanDancer } from './primitives/HumanDancer'
import { LatentRack } from './primitives/LatentRack'
import { RobotDancer } from './primitives/RobotDancer'
import { StageLabel } from './primitives/StageLabel'
import { useOnScreen, usePrefersReducedMotion, useTimeline } from './useTimeline'
import type { DiagramTheme } from './diagramTokens'

const VIDEO_BLUE = '#4f8cff'
const GENMO_GREEN = '#22c55e'
const SMPL_RED = '#ef4444'
const LATENT = '#8b5cf6'
const ACTION = '#f59e0b'

const PHASES = [
  { name: 'video', duration: 2200, caption: 'A human dances on video — one clip from the library.' },
  { name: 'extract', duration: 2600, caption: 'GENMO watches, and pulls the skeleton out of the pixels…' },
  { name: 'smpl', duration: 2200, caption: '…and writes it down as SMPL, the universal motion format.' },
  { name: 'encode', duration: 2400, caption: 'The file streams through SONIC’s human encoder…' },
  { name: 'latent', duration: 2400, caption: '…lighting up the latent space, frame by frame…' },
  { name: 'act', duration: 3400, caption: '…decoded straight into the joints. The robot dances the same dance.' },
  { name: 'again', duration: 2000, caption: 'And the next clip is already queued.' },
  { name: 'reset', duration: 1000, caption: 'Video in, dance out.' },
] as const

type PhaseName = (typeof PHASES)[number]['name']
const PHASE_INDEX = Object.fromEntries(
  PHASES.map((p, i) => [p.name, i]),
) as Record<PhaseName, number>

// --- layout (left → right, one uniform pipeline) -----------------------------
const VID = { cx: 118, w: 148, y: 105, h: 130 }
const FLOOR_Y = VID.y + VID.h - 20
const GENMO = { x: 228, y: 105, w: 158, h: 130 }
const SMPL = { cx: 458, cy: 170 }
const ENC = { x: 528, y: 170, len: 105 }
const RACK = { x: 635, y: 170 }
const DEC = { x: 773, y: 170, len: 84 }
const ROBOT = { x: 926, ground: 262, scale: 1.05 }
const LABEL_Y = 302

export interface FullPipelineDiagramProps {
  title?: string
  showCaption?: boolean
  theme?: DiagramTheme
  className?: string
}

/**
 * The whole pipeline in one breath: a dancing human on video enters
 * GENMO, where the keypoint skeleton materializes (dancing in step with
 * the footage); the motion leaves as a red SMPL file, streams through
 * SONIC's human encoder into the latent space, and is decoded into the
 * robot — which ends up dancing the same dance as the human it watched.
 */
export function FullPipelineDiagram({
  title = 'End-to-end pipeline: a dance video enters GENMO where the keypoint skeleton is extracted, exits as an SMPL file, streams through SONIC’s human encoder into the latent space, and is decoded into the robot’s joints — the robot dances the human’s dance.',
  showCaption = true,
  theme,
  className,
}: FullPipelineDiagramProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const reducedMotion = usePrefersReducedMotion()
  const onScreen = useOnScreen(rootRef)
  const staticMode = reducedMotion
  const { phase, index } = useTimeline([...PHASES], !staticMode && onScreen)

  const at = (n: PhaseName) => !staticMode && phase === n
  const since = (n: PhaseName) =>
    staticMode || (index >= PHASE_INDEX[n] && phase !== 'reset')

  const caption = staticMode
    ? 'Video → GENMO → SMPL → encoder → latent space → robot.'
    : PHASES[index].caption

  return (
    <div ref={rootRef} className={className}>
      <DiagramFrame
        title={title}
        viewBox="0 92 1000 232"
        theme={theme}
        caption={showCaption ? caption : undefined}
        captionKey={caption}
      >
        {/* --- the source video ------------------------------------------------ */}
        <rect x={VID.cx - VID.w / 2} y={VID.y} width={VID.w} height={VID.h} rx={10} fill="var(--diagram-surface)" stroke={VIDEO_BLUE} strokeWidth={1.6} />
        <path d={`M ${VID.cx + VID.w / 2 - 20} ${VID.y + 9} l 9 5.5 l -9 5.5 Z`} fill={VIDEO_BLUE} opacity={0.85} />
        <line x1={VID.cx - VID.w / 2 + 14} y1={FLOOR_Y} x2={VID.cx + VID.w / 2 - 14} y2={FLOOR_Y} stroke="var(--diagram-line)" strokeWidth={1.5} strokeLinecap="round" />
        <g transform={`translate(${VID.cx} ${FLOOR_Y}) scale(0.85)`}>
          <HumanDancer variant="solid" dancing={!staticMode} />
        </g>
        <text className="diagram-sublabel" x={VID.cx} y={VID.y + VID.h + 15} textAnchor="middle">
          dance_video.mp4
        </text>

        {/* video → GENMO */}
        <FlowParticles x={VID.cx + VID.w / 2 + 4} y={170} dx={GENMO.x - VID.cx - VID.w / 2 - 8} spreadStart={22} spreadEnd={14} count={4} duration={0.9} color={VIDEO_BLUE} active={since('extract') && !staticMode} />

        {/* --- GENMO: the skeleton materializes inside ------------------------- */}
        <rect x={GENMO.x} y={GENMO.y} width={GENMO.w} height={GENMO.h} rx={12} fill="var(--diagram-surface)" stroke={since('extract') ? 'var(--diagram-ink)' : 'var(--diagram-line)'} strokeWidth={1.5} style={{ transition: 'stroke 600ms ease' }} />
        <rect x={GENMO.x} y={GENMO.y} width={GENMO.w} height={GENMO.h} rx={12} fill={GENMO_GREEN} opacity={since('extract') ? 0.06 : 0} style={{ transition: 'opacity 600ms ease' }} pointerEvents="none" />
        <text x={GENMO.x + 13} y={GENMO.y + 23} fontFamily="var(--diagram-font-label)" fontSize={12.5} fontWeight={700} fill="var(--diagram-ink)">
          GENMO
        </text>
        <path
          className={at('extract') ? 'laptop-tile-playing' : undefined}
          d={`M ${GENMO.x + GENMO.w - 26} ${GENMO.y + 12} l 2.4 5.8 l 5.8 2.4 l -5.8 2.4 l -2.4 5.8 l -2.4 -5.8 l -5.8 -2.4 l 5.8 -2.4 Z`}
          fill={GENMO_GREEN}
          opacity={since('extract') ? 0.9 : 0.3}
          style={{ transition: 'opacity 600ms ease' }}
        />
        {/* the extracted skeleton, dancing in step with the footage */}
        <line x1={GENMO.x + 30} y1={FLOOR_Y} x2={GENMO.x + GENMO.w - 30} y2={FLOOR_Y} stroke="var(--diagram-line)" strokeWidth={1.5} strokeLinecap="round" className="stage" style={{ opacity: since('extract') ? 1 : 0.3 }} />
        <g className="stage" style={{ opacity: since('extract') ? 1 : 0 }}>
          <g transform={`translate(${GENMO.x + GENMO.w / 2} ${FLOOR_Y}) scale(0.85)`}>
            <HumanDancer variant="skeleton" dancing={!staticMode} />
          </g>
        </g>
        <text className="diagram-sublabel" x={GENMO.x + GENMO.w / 2} y={GENMO.y + GENMO.h + 15} textAnchor="middle">
          keypoints · 17 joints
        </text>

        {/* GENMO → SMPL file */}
        <FlowParticles x={GENMO.x + GENMO.w + 4} y={SMPL.cy} dx={SMPL.cx - 38 - GENMO.x - GENMO.w - 8} spreadStart={10} spreadEnd={5} count={4} duration={0.8} color={GENMO_GREEN} active={since('smpl') && !staticMode} />

        {/* --- the SMPL file ---------------------------------------------------- */}
        <g
          className="stage stage-pop"
          style={{
            transform: `translate(${SMPL.cx}px, ${SMPL.cy}px) scale(${since('smpl') ? 1 : 0.5})`,
            opacity: since('smpl') ? 1 : 0,
          }}
        >
          <rect
            className={at('smpl') ? 'laptop-tile-playing' : undefined}
            x={-36}
            y={-27}
            width={72}
            height={54}
            rx={11}
            fill="none"
            stroke={SMPL_RED}
            strokeWidth={5}
            opacity={0.25}
          />
          <rect x={-32} y={-23} width={64} height={46} rx={8} fill="var(--diagram-surface)" stroke={SMPL_RED} strokeWidth={1.6} />
          <g stroke={SMPL_RED} strokeWidth={1.9} strokeLinecap="round" fill="none">
            <circle cx={0} cy={-10} r={3.1} />
            <path d="M 0 -6.5 L 0 3" />
            <path d="M 0 -3.5 L -8 1.5" />
            <path d="M 0 -3.5 L 8 1.5" />
            <path d="M 0 3 L -5.5 12" />
            <path d="M 0 3 L 5.5 12" />
          </g>
          <text className="diagram-sublabel" y={40} textAnchor="middle">
            dance_07.smpl
          </text>
        </g>

        {/* SMPL → human encoder */}
        <FlowParticles x={SMPL.cx + 38} y={SMPL.cy} dx={ENC.x - 4 - SMPL.cx - 38} spreadStart={8} spreadEnd={7} count={4} duration={0.7} color={SMPL_RED} active={since('encode') && !staticMode} />

        {/* --- SONIC: human encoder ⟶ latent space ⟶ decoder -------------------- */}
        <text className="math-label" x={ENC.x + 45} y={ENC.y - 40} textAnchor="middle">
          ℰ<tspan className="math-sub" dy={3.5}>Human</tspan>
        </text>
        <EncoderModule x={ENC.x} y={ENC.y} length={ENC.len} inletRadius={26} outletRadius={11} shape="trapezoid" color={SMPL_RED} active={since('encode')} />

        <LatentRack x={RACK.x} y={RACK.y} cells={7} cellSize={14} gap={3} color={LATENT} mode={since('latent') && !staticMode ? 'live' : staticMode ? 'hold' : 'idle'} pattern={[1, 3, 4, 6]} />

        <text className="math-label" x={DEC.x + 42} y={DEC.y - 40} textAnchor="middle">
          D<tspan className="math-sub" dy={3.5}>c</tspan>
        </text>
        <EncoderModule x={DEC.x} y={DEC.y} length={DEC.len} inletRadius={10} outletRadius={22} shape="trapezoid" direction="decode" color={ACTION} active={since('act')} />

        {/* decoder → robot joints */}
        <FlowParticles x={DEC.x + DEC.len + 6} y={DEC.y} y2={212} dx={ROBOT.x - 31 - DEC.x - DEC.len} spreadStart={9} spreadEnd={5} count={5} duration={0.6} color={ACTION} active={since('act') && !staticMode} />

        {/* --- the robot, dancing the human's dance ----------------------------- */}
        <line x1={862} y1={ROBOT.ground} x2={990} y2={ROBOT.ground} stroke="var(--diagram-line)" strokeWidth={1.5} strokeLinecap="round" />
        <g transform={`translate(${ROBOT.x} ${ROBOT.ground}) scale(${ROBOT.scale})`}>
          <RobotDancer dancing={!staticMode && since('act')} move="disco" active={since('act')} accent={ACTION} />
        </g>

        {/* --- stage labels ------------------------------------------------------ */}
        <StageLabel x={VID.cx} y={LABEL_Y} text="video" active={at('video')} accent={VIDEO_BLUE} />
        <StageLabel x={GENMO.x + GENMO.w / 2} y={LABEL_Y} text="extract" active={at('extract')} accent={GENMO_GREEN} />
        <StageLabel x={SMPL.cx} y={LABEL_Y} text="smpl" active={at('smpl')} accent={SMPL_RED} />
        <StageLabel x={ENC.x + ENC.len / 2} y={LABEL_Y} text="encode" active={at('encode')} accent={SMPL_RED} />
        <StageLabel x={RACK.x + 68} y={LABEL_Y} text="latents" active={at('latent')} accent={LATENT} />
        <StageLabel x={ROBOT.x - 6} y={LABEL_Y} text="dance" active={at('act') || at('again')} accent={ACTION} />
      </DiagramFrame>
    </div>
  )
}

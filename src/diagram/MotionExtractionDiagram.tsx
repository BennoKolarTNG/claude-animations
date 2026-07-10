import { useRef } from 'react'
import { DiagramFrame } from './DiagramFrame'
import { FlowParticles } from './primitives/FlowParticles'
import { HumanDancer } from './primitives/HumanDancer'
import { KeypointFigure, POSES } from './primitives/KeypointFigure'
import { useOnScreen, usePrefersReducedMotion, useTimeline } from './useTimeline'
import type { CSSVarStyle, DiagramTheme } from './diagramTokens'

// Native visual languages of each pipeline stage:
// YOLOX detection blue, ViTPose left-green / right-orange / trunk-blue,
// GENMO green (its architecture figures use green blocks), SMPL-file red
// (the same red as the SMPL card feeding the SONIC diagram).
const YOLOX_BLUE = '#0072bd'
const VITPOSE = { torso: '#3399ff', left: '#22c55e', right: '#f97316' }
const GENMO_GREEN = '#22c55e'
const SMPL_RED = '#ef4444'
const VIDEO_BLUE = '#4f8cff'

const PHASES = [
  { name: 'video', duration: 1800, caption: 'A human dances on plain video.' },
  { name: 'detect', duration: 1800, caption: 'YOLOX finds the human…' },
  { name: 'keypoints', duration: 2000, caption: '…ViTPose pins keypoints to every joint…' },
  { name: 'skeleton', duration: 2200, caption: '…and the dance plays as a pure skeleton, in step with the footage.' },
  { name: 'extract', duration: 2600, caption: 'GENMO splits the motion into frames…' },
  { name: 'gap', duration: 2200, caption: '…and notices a hole the camera never saw.' },
  { name: 'fill', duration: 2600, caption: 'Being generative, GENMO simply predicts the missing frame.' },
  { name: 'smooth', duration: 2100, caption: 'Chained and smoothed into one continuous motion…' },
  { name: 'output', duration: 2600, caption: '…saved as SMPL: the universal format the robot pipeline speaks.' },
  { name: 'reset', duration: 1000, caption: 'Next video.' },
] as const

type PhaseName = (typeof PHASES)[number]['name']
const PHASE_INDEX = Object.fromEntries(
  PHASES.map((p, i) => [p.name, i]),
) as Record<PhaseName, number>

// --- layout constants --------------------------------------------------------
// Top row: the two synchronized "players". Bottom row: the frame strip.
const PANEL = { w: 180, h: 142, y: 72 }
const VID = { cx: 235 }
const SKEL = { cx: 445 }
const FLOOR_Y = PANEL.y + PANEL.h - 18
const GENMO = { x: 640, y: 100, w: 190, h: 84 }
const STRIP = { x: 210, y: 254, w: 416, h: 112 }
const SLOTS = 5
const SLOT_W = 72
const SLOT_GAP = 7
const GAP_SLOT = 3
const OUT = { x: 724, y: 310 }

const SLOT_POSES = [POSES.groove, POSES.point, POSES.lunge, POSES.step, POSES.reach]

const slotX = (i: number) =>
  STRIP.x + 14 + i * (SLOT_W + SLOT_GAP) + SLOT_W / 2

export interface MotionExtractionDiagramProps {
  title?: string
  showCaption?: boolean
  theme?: DiagramTheme
  className?: string
}

/**
 * How a dance video becomes an SMPL motion file: a YOLOX box finds the
 * dancing human, ViTPose keypoints appear on the moving body, and a
 * skeleton twin plays beside the footage in perfect sync. Below, GENMO
 * splits the motion into frames, spots the hole the camera never saw,
 * generatively fills it (gray ghost poses resolving into a committed
 * one), smooths the chain with a red playhead sweep, and exports the
 * same red dance_07.smpl card that feeds the SONIC diagram.
 */
export function MotionExtractionDiagram({
  title = 'Motion extraction pipeline: a detection box finds the dancer in a video, pose keypoints track the moving body, a synchronized skeleton plays next to the footage, and GENMO splits the motion into frames, generatively fills a gap, and exports the motion as an SMPL file.',
  showCaption = true,
  theme,
  className,
}: MotionExtractionDiagramProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const reducedMotion = usePrefersReducedMotion()
  const onScreen = useOnScreen(rootRef)
  const staticMode = reducedMotion
  const { phase, index } = useTimeline([...PHASES], !staticMode && onScreen)

  const at = (n: PhaseName) => !staticMode && phase === n
  const since = (n: PhaseName) =>
    staticMode || (index >= PHASE_INDEX[n] && phase !== 'reset')

  const dancing = !staticMode
  const caption = staticMode
    ? 'Video → keypoints → skeleton → frames, gaps generated → SMPL.'
    : PHASES[index].caption

  const panel = (cx: number, stroke: string) => (
    <>
      <rect
        x={cx - PANEL.w / 2}
        y={PANEL.y}
        width={PANEL.w}
        height={PANEL.h}
        rx={10}
        fill="var(--diagram-surface)"
        stroke={stroke}
        strokeWidth={1.6}
      />
      <line
        x1={cx - PANEL.w / 2 + 14}
        y1={FLOOR_Y}
        x2={cx + PANEL.w / 2 - 14}
        y2={FLOOR_Y}
        stroke="var(--diagram-line)"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </>
  )

  return (
    <div ref={rootRef} className={className}>
      <DiagramFrame
        title={title}
        viewBox="0 55 960 350"
        theme={theme}
        caption={showCaption ? caption : undefined}
        captionKey={caption}
      >
        {/* --- player 1: the raw footage -------------------------------------- */}
        {panel(VID.cx, VIDEO_BLUE)}
        <path
          d={`M ${VID.cx + PANEL.w / 2 - 22} ${PANEL.y + 10} l 10 6 l -10 6 Z`}
          fill={VIDEO_BLUE}
          opacity={0.85}
        />
        {/* the human, actually dancing */}
        <g transform={`translate(${VID.cx} ${FLOOR_Y})`}>
          <HumanDancer variant="solid" dancing={dancing} />
        </g>
        {/* ViTPose overlay on the MOVING body — same rig, so it tracks */}
        <g className="stage" style={{ opacity: since('keypoints') ? 1 : 0 }}>
          <g transform={`translate(${VID.cx} ${FLOOR_Y})`}>
            <HumanDancer variant="dots" dancing={dancing} />
          </g>
        </g>
        <g className="stage" style={{ opacity: since('skeleton') ? 1 : 0 }}>
          <g transform={`translate(${VID.cx} ${FLOOR_Y})`}>
            <HumanDancer variant="bones" dancing={dancing} />
          </g>
        </g>
        {/* YOLOX detection box + label chip */}
        <g className="stage" style={{ opacity: since('detect') ? 1 : 0 }}>
          <rect x={VID.cx - 38} y={PANEL.y + 28} width={76} height={100} fill="none" stroke={YOLOX_BLUE} strokeWidth={2} />
          <rect x={VID.cx - 38} y={PANEL.y + 28} width={62} height={13} fill={YOLOX_BLUE} opacity={0.85} />
          <text x={VID.cx - 34} y={PANEL.y + 38} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={8.5} fill="#ffffff">
            person 0.98
          </text>
        </g>
        <text className="diagram-sublabel" x={VID.cx} y={PANEL.y + PANEL.h + 16} textAnchor="middle">
          dance_video.mp4
        </text>

        {/* --- player 2: the skeleton twin, playing in sync -------------------- */}
        <g className="stage" style={{ opacity: since('skeleton') ? 1 : 0.2 }}>
          {panel(SKEL.cx, since('skeleton') ? VITPOSE.torso : 'var(--diagram-line)')}
          <g transform={`translate(${SKEL.cx} ${FLOOR_Y})`}>
            <HumanDancer variant="skeleton" dancing={dancing} />
          </g>
          <text className="diagram-sublabel" x={SKEL.cx} y={PANEL.y + PANEL.h + 16} textAnchor="middle">
            vitpose · 17 joints
          </text>
        </g>
        <FlowParticles x={VID.cx + PANEL.w / 2 + 4} y={PANEL.y + 70} dx={SKEL.cx - VID.cx - PANEL.w - 8} spreadStart={16} spreadEnd={10} count={4} duration={0.9} color={VITPOSE.torso} active={since('skeleton') && !staticMode} />

        {/* --- GENMO, between the players and the frame strip ------------------ */}
        <rect x={GENMO.x} y={GENMO.y} width={GENMO.w} height={GENMO.h} rx={12} fill="var(--diagram-surface)" stroke={since('extract') ? 'var(--diagram-ink)' : 'var(--diagram-line)'} strokeWidth={1.5} style={{ transition: 'stroke 600ms ease' }} />
        <rect x={GENMO.x} y={GENMO.y} width={GENMO.w} height={GENMO.h} rx={12} fill={GENMO_GREEN} opacity={since('extract') ? 0.07 : 0} style={{ transition: 'opacity 600ms ease' }} />
        <text x={GENMO.x + 14} y={GENMO.y + 27} fontFamily="var(--diagram-font-label)" fontSize={13.5} fontWeight={700} fill="var(--diagram-ink)">
          GENMO
        </text>
        <text x={GENMO.x + 14} y={GENMO.y + 44} fontFamily="var(--diagram-font-label)" fontSize={10} fontWeight={600} letterSpacing="0.06em" fill={GENMO_GREEN}>
          GENERATIVE MOTION MODEL
        </text>
        <path
          className={at('fill') ? 'laptop-tile-playing' : undefined}
          d={`M ${GENMO.x + GENMO.w - 30} ${GENMO.y + 12} l 2.6 6.4 l 6.4 2.6 l -6.4 2.6 l -2.6 6.4 l -2.6 -6.4 l -6.4 -2.6 l 6.4 -2.6 Z`}
          fill={GENMO_GREEN}
          opacity={since('extract') ? 0.9 : 0.3}
          style={{ transition: 'opacity 600ms ease' }}
        />
        <text className="diagram-sublabel" x={GENMO.x + 14} y={GENMO.y + 66}>
          spots holes · fills them
        </text>

        {/* skeleton player → GENMO */}
        <FlowParticles x={SKEL.cx + PANEL.w / 2 + 4} y={PANEL.y + 62} y2={GENMO.y + 42} dx={GENMO.x - SKEL.cx - PANEL.w / 2 - 10} spreadStart={12} spreadEnd={6} count={4} duration={0.8} color={VITPOSE.torso} active={since('extract') && !staticMode && !at('fill')} />
        {/* GENMO → frame strip: a short elbow into the strip's end */}
        <path
          d={`M ${GENMO.x + 80} ${GENMO.y + GENMO.h + 2} C ${GENMO.x + 60} 240, ${STRIP.x + STRIP.w + 44} 268, ${STRIP.x + STRIP.w + 8} ${STRIP.y + 44}`}
          fill="none"
          stroke={GENMO_GREEN}
          strokeWidth={1.5}
          strokeLinecap="round"
          className="stage"
          style={{ opacity: since('extract') ? 0.6 : 0 }}
        />
        <path
          d="M 0 -4.5 L 7.5 0 L 0 4.5 Z"
          fill={GENMO_GREEN}
          transform={`translate(${STRIP.x + STRIP.w + 7} ${STRIP.y + 45}) rotate(140)`}
          className="stage"
          style={{ opacity: since('extract') ? 0.8 : 0 }}
        />
        <FlowParticles x={GENMO.x + 76} y={GENMO.y + GENMO.h + 6} y2={STRIP.y + 40} dx={STRIP.x + STRIP.w + 4 - GENMO.x - 76} spreadStart={5} spreadEnd={4} count={5} duration={0.8} color={GENMO_GREEN} active={since('extract') && !staticMode && !at('fill')} />

        {/* --- the motion frame strip, below the players ----------------------- */}
        <rect x={STRIP.x} y={STRIP.y} width={STRIP.w} height={STRIP.h} rx={12} fill="var(--diagram-surface)" stroke="var(--diagram-line)" strokeWidth={1.5} />
        {Array.from({ length: SLOTS }, (_, i) => {
          const cx = slotX(i)
          const isGap = i === GAP_SLOT
          const filled = isGap
            ? since('fill')
            : i < GAP_SLOT
              ? since('extract')
              : since('gap')
          const gapOpen = isGap && since('gap') && !since('fill') && !staticMode
          return (
            <g key={i}>
              <rect
                x={cx - SLOT_W / 2}
                y={STRIP.y + 12}
                width={SLOT_W}
                height={STRIP.h - 24}
                rx={8}
                fill="var(--diagram-bg)"
                stroke={gapOpen ? SMPL_RED : 'var(--diagram-line)'}
                strokeWidth={1.4}
                strokeDasharray={gapOpen ? '5 4' : undefined}
                style={{ transition: 'stroke 500ms ease' }}
              />
              {filled && (
                <g transform={`translate(${cx} ${STRIP.y + STRIP.h - 22})`}>
                  <KeypointFigure
                    pose={SLOT_POSES[i]}
                    scale={0.68}
                    dotRadius={1.5}
                    boneWidth={1.7}
                    color={VITPOSE}
                    popIn={!staticMode}
                    popDelay={isGap ? 0.5 : i < GAP_SLOT ? i * 0.55 : (i - GAP_SLOT) * 0.4}
                  />
                </g>
              )}
              {gapOpen && (
                <g transform={`translate(${cx} ${STRIP.y + STRIP.h - 22})`}>
                  {[POSES.point, POSES.step, POSES.lunge].map((p, gi) => (
                    <g key={gi} className="ghost-flicker" style={{ '--d': `${gi * 0.4}s` } as CSSVarStyle} transform={`translate(${(gi - 1) * 4} 0)`}>
                      <KeypointFigure pose={p} scale={0.68} dots={false} boneWidth={1.7} color="var(--diagram-muted)" ghost />
                    </g>
                  ))}
                  <text x={0} y={-STRIP.h + 46} textAnchor="middle" fontFamily="var(--diagram-font-label)" fontSize={11} fontWeight={700} fill={SMPL_RED}>
                    ?
                  </text>
                </g>
              )}
            </g>
          )
        })}
        <text className="diagram-sublabel" x={STRIP.x + STRIP.w / 2} y={STRIP.y + STRIP.h + 16} textAnchor="middle">
          motion, frame by frame
        </text>

        {/* GENMO's generative reach into the hole */}
        <path
          d={`M ${GENMO.x + 30} ${GENMO.y + GENMO.h + 2} C 610 238, 550 248, ${slotX(GAP_SLOT) + 10} ${STRIP.y - 4}`}
          fill="none"
          stroke={GENMO_GREEN}
          strokeWidth={1.5}
          strokeDasharray="5 4"
          strokeLinecap="round"
          className="stage"
          style={{ opacity: at('fill') ? 0.8 : staticMode ? 0.6 : 0 }}
        />
        <FlowParticles x={GENMO.x + 28} y={GENMO.y + GENMO.h + 6} y2={STRIP.y - 8} dx={slotX(GAP_SLOT) + 8 - GENMO.x - 28} spreadStart={4} spreadEnd={3} count={4} duration={0.8} radius={2} shape="square" color={GENMO_GREEN} active={at('fill')} />

        {/* smooth motion curve through the frames */}
        <path
          d={`M ${slotX(0)} ${STRIP.y + 52} C ${slotX(1) - 20} ${STRIP.y + 40}, ${slotX(1) + 20} ${STRIP.y + 40}, ${slotX(2)} ${STRIP.y + 50} S ${slotX(3) + 20} ${STRIP.y + 43}, ${slotX(4)} ${STRIP.y + 48}`}
          fill="none"
          stroke={GENMO_GREEN}
          strokeWidth={2}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          style={{
            strokeDashoffset: since('smooth') ? 0 : 1,
            transition: 'stroke-dashoffset 1600ms var(--diagram-ease)',
            opacity: 0.65,
          }}
        />
        {/* red playhead (GEM's timeline sweep) */}
        <line
          className={`playhead${at('smooth') ? ' sweeping' : ''}`}
          x1={STRIP.x + 10}
          y1={STRIP.y + 7}
          x2={STRIP.x + 10}
          y2={STRIP.y + STRIP.h - 7}
          stroke="#e11d48"
          strokeWidth={2}
          strokeLinecap="round"
          style={{ '--sweep': `${STRIP.w - 20}px` } as CSSVarStyle}
        />

        {/* --- the SMPL file out, right of the strip ----------------------------- */}
        <FlowParticles x={STRIP.x + STRIP.w + 6} y={OUT.y} dx={OUT.x - 48 - STRIP.x - STRIP.w - 10} spreadStart={8} spreadEnd={5} count={6} duration={0.8} radius={2.8} color={SMPL_RED} active={at('output')} />
        <g
          className="stage stage-pop"
          style={{
            transform: `translate(${OUT.x}px, ${OUT.y}px) scale(${since('output') ? 1 : 0.5})`,
            opacity: since('output') ? 1 : 0,
          }}
        >
          <rect
            className={at('output') ? 'laptop-tile-playing' : undefined}
            x={-46}
            y={-34}
            width={92}
            height={68}
            rx={13}
            fill="none"
            stroke={SMPL_RED}
            strokeWidth={6}
            opacity={0.25}
          />
          <rect x={-42} y={-30} width={84} height={60} rx={10} fill="var(--diagram-surface)" stroke={SMPL_RED} strokeWidth={1.8} />
          <g transform="scale(1.45) translate(0 -1)" stroke={SMPL_RED} strokeWidth={1.9} strokeLinecap="round" fill="none">
            <circle cx={0} cy={-10} r={3.1} />
            <path d="M 0 -6.5 L 0 3" />
            <path d="M 0 -3.5 L -8 1.5" />
            <path d="M 0 -3.5 L 8 1.5" />
            <path d="M 0 3 L -5.5 12" />
            <path d="M 0 3 L 5.5 12" />
          </g>
          <text
            y={52}
            textAnchor="middle"
            fontFamily="var(--diagram-font-label)"
            fontSize={11.5}
            fontWeight={600}
            letterSpacing="0.08em"
            fill={SMPL_RED}
          >
            dance_07.smpl
          </text>
        </g>
      </DiagramFrame>
    </div>
  )
}

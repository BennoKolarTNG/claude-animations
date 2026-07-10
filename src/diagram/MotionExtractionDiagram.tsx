import { useRef } from 'react'
import { DiagramFrame } from './DiagramFrame'
import { FlowParticles } from './primitives/FlowParticles'
import { KeypointFigure, POSES } from './primitives/KeypointFigure'
import { StageLabel } from './primitives/StageLabel'
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
  { name: 'skeleton', duration: 1800, caption: '…and a skeleton takes shape.' },
  { name: 'extract', duration: 2600, caption: 'GENMO lifts the skeleton out of the pixels, frame by frame…' },
  { name: 'gap', duration: 2200, caption: '…until the camera loses sight — a gap.' },
  { name: 'fill', duration: 2600, caption: 'Being generative, GENMO simply predicts the motion it cannot see.' },
  { name: 'smooth', duration: 2100, caption: 'Chained and smoothed into one continuous motion…' },
  { name: 'output', duration: 2600, caption: '…saved as SMPL: the universal format the robot pipeline speaks.' },
  { name: 'reset', duration: 1000, caption: 'Next video.' },
] as const

type PhaseName = (typeof PHASES)[number]['name']
const PHASE_INDEX = Object.fromEntries(
  PHASES.map((p, i) => [p.name, i]),
) as Record<PhaseName, number>

// --- layout constants --------------------------------------------------------
const VIDEO = { cx: 140, cy: 162, w: 180, h: 130 }
const PERSON = { x: 140, y: 216, scale: 1.3 }
const BOX = { x: 100, y: 122, w: 80, h: 100 }
const GENMO = { x: 292, y: 116, w: 186, h: 92 }
const STRIP = { x: 492, y: 100, w: 414, h: 130 }
const SLOTS = 5
const SLOT_W = 70
const SLOT_GAP = 9
const GAP_SLOT = 3
const OUT = { x: 800, y: 292 }
const LABEL_Y = 388

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
 * How a dance video becomes an SMPL motion file: YOLOX detection box →
 * ViTPose keypoints and skeleton (green-left / orange-right / blue-trunk,
 * the estimator convention) → GENMO extracts a skeleton per frame onto a
 * film-strip timeline, generates the frames the camera never saw (gray
 * ghost poses resolving into a committed one — GEM's own idiom), and a
 * red playhead sweep seals it into one smooth motion, saved as the same
 * red dance_07.smpl card that feeds the SONIC diagram.
 */
export function MotionExtractionDiagram({
  title = 'Motion extraction pipeline: a detection box finds the dancer in a video, pose keypoints become a skeleton, GENMO extracts a skeleton per frame into a timeline, generatively fills a gap the camera never saw, and exports the motion as an SMPL file.',
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

  const caption = staticMode
    ? 'Video → detection → keypoints → skeleton per frame → gaps generated → SMPL.'
    : PHASES[index].caption

  return (
    <div ref={rootRef} className={className}>
      <DiagramFrame
        title={title}
        viewBox="0 60 960 348"
        theme={theme}
        caption={showCaption ? caption : undefined}
        captionKey={caption}
      >
        {/* --- the source video ------------------------------------------------ */}
        <rect
          x={VIDEO.cx - VIDEO.w / 2}
          y={VIDEO.cy - VIDEO.h / 2}
          width={VIDEO.w}
          height={VIDEO.h}
          rx={10}
          fill="var(--diagram-surface)"
          stroke={VIDEO_BLUE}
          strokeWidth={1.6}
        />
        <path
          d={`M ${VIDEO.cx + VIDEO.w / 2 - 22} ${VIDEO.cy - VIDEO.h / 2 + 10} l 10 6 l -10 6 Z`}
          fill={VIDEO_BLUE}
          opacity={0.85}
        />
        <line
          x1={VIDEO.cx - VIDEO.w / 2 + 14}
          y1={PERSON.y + 2}
          x2={VIDEO.cx + VIDEO.w / 2 - 14}
          y2={PERSON.y + 2}
          stroke="var(--diagram-line)"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        {/* the human: soft solid figure */}
        <g transform={`translate(${PERSON.x} ${PERSON.y})`}>
          <KeypointFigure pose={POSES.groove} scale={PERSON.scale} dots={false} boneWidth={4.5} color="var(--diagram-muted)" />
        </g>
        {/* ViTPose overlay: keypoints, then the colored skeleton */}
        {since('skeleton') && (
          <g transform={`translate(${PERSON.x} ${PERSON.y})`}>
            <KeypointFigure pose={POSES.groove} scale={PERSON.scale} dots={false} boneWidth={2} color={VITPOSE} popIn={!staticMode} />
          </g>
        )}
        {since('keypoints') && (
          <g transform={`translate(${PERSON.x} ${PERSON.y})`}>
            <KeypointFigure pose={POSES.groove} scale={PERSON.scale} bones={false} dotRadius={2.4} color={VITPOSE} popIn={!staticMode} />
          </g>
        )}
        {/* YOLOX detection box + label chip */}
        <g className="stage" style={{ opacity: since('detect') ? 1 : 0 }}>
          <rect x={BOX.x} y={BOX.y} width={BOX.w} height={BOX.h} fill="none" stroke={YOLOX_BLUE} strokeWidth={2} />
          <rect x={BOX.x} y={BOX.y} width={62} height={13} fill={YOLOX_BLUE} opacity={0.85} />
          <text x={BOX.x + 4} y={BOX.y + 10} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={8.5} fill="#ffffff">
            person 0.98
          </text>
        </g>
        <text className="diagram-sublabel" x={VIDEO.cx} y={VIDEO.cy + VIDEO.h / 2 + 16} textAnchor="middle">
          dance_video.mp4
        </text>

        {/* --- GENMO ------------------------------------------------------------ */}
        <rect x={GENMO.x} y={GENMO.y} width={GENMO.w} height={GENMO.h} rx={12} fill="var(--diagram-surface)" stroke={since('extract') ? 'var(--diagram-ink)' : 'var(--diagram-line)'} strokeWidth={1.5} style={{ transition: 'stroke 600ms ease' }} />
        <rect x={GENMO.x} y={GENMO.y} width={GENMO.w} height={GENMO.h} rx={12} fill={GENMO_GREEN} opacity={since('extract') ? 0.07 : 0} style={{ transition: 'opacity 600ms ease' }} />
        <text x={GENMO.x + 14} y={GENMO.y + 27} fontFamily="var(--diagram-font-label)" fontSize={13.5} fontWeight={700} fill="var(--diagram-ink)">
          GENMO
        </text>
        <text x={GENMO.x + 14} y={GENMO.y + 44} fontFamily="var(--diagram-font-label)" fontSize={10} fontWeight={600} letterSpacing="0.06em" fill={GENMO_GREEN}>
          GENERATIVE MOTION MODEL
        </text>
        {/* a spark: sees, and imagines */}
        <path
          className={at('fill') ? 'laptop-tile-playing' : undefined}
          d={`M ${GENMO.x + GENMO.w - 30} ${GENMO.y + 12} l 2.6 6.4 l 6.4 2.6 l -6.4 2.6 l -2.6 6.4 l -2.6 -6.4 l -6.4 -2.6 l 6.4 -2.6 Z`}
          fill={GENMO_GREEN}
          opacity={since('extract') ? 0.9 : 0.3}
          style={{ transition: 'opacity 600ms ease' }}
        />
        <text className="diagram-sublabel" x={GENMO.x + 14} y={GENMO.y + 72}>
          video in · motion out
        </text>

        <FlowParticles x={VIDEO.cx + VIDEO.w / 2 + 4} y={VIDEO.cy} dx={GENMO.x - VIDEO.cx - VIDEO.w / 2 - 8} spreadStart={18} spreadEnd={8} count={5} duration={1.0} color={VIDEO_BLUE} active={since('extract') && !staticMode && !at('fill')} />
        <FlowParticles x={GENMO.x + GENMO.w + 4} y={GENMO.y + GENMO.h / 2} y2={STRIP.y + 60} dx={STRIP.x - GENMO.x - GENMO.w - 10} spreadStart={6} spreadEnd={20} count={5} duration={0.9} color={GENMO_GREEN} active={since('extract') && !staticMode && !at('fill')} />

        {/* --- the motion timeline (film strip) --------------------------------- */}
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
                y={STRIP.y + 14}
                width={SLOT_W}
                height={STRIP.h - 28}
                rx={8}
                fill="var(--diagram-bg)"
                stroke={gapOpen ? SMPL_RED : 'var(--diagram-line)'}
                strokeWidth={1.4}
                strokeDasharray={gapOpen ? '5 4' : undefined}
                style={{ transition: 'stroke 500ms ease' }}
              />
              {/* extracted skeletons, popping in per frame */}
              {filled && (
                <g transform={`translate(${cx} ${STRIP.y + STRIP.h - 24})`}>
                  <KeypointFigure
                    pose={SLOT_POSES[i]}
                    scale={0.82}
                    dotRadius={1.7}
                    boneWidth={1.8}
                    color={VITPOSE}
                    popIn={!staticMode}
                    popDelay={isGap ? 0.5 : i < GAP_SLOT ? i * 0.55 : (i - GAP_SLOT) * 0.4}
                  />
                </g>
              )}
              {/* the unseen frame: a cloud of uncertain gray ghosts */}
              {gapOpen && (
                <g transform={`translate(${cx} ${STRIP.y + STRIP.h - 24})`}>
                  {[POSES.point, POSES.step, POSES.lunge].map((p, gi) => (
                    <g key={gi} className="ghost-flicker" style={{ '--d': `${gi * 0.4}s` } as CSSVarStyle} transform={`translate(${(gi - 1) * 4} 0)`}>
                      <KeypointFigure pose={p} scale={0.82} dots={false} boneWidth={1.8} color="var(--diagram-muted)" ghost />
                    </g>
                  ))}
                  <text x={0} y={-STRIP.h + 52} textAnchor="middle" fontFamily="var(--diagram-font-label)" fontSize={11} fontWeight={700} fill={SMPL_RED}>
                    ?
                  </text>
                </g>
              )}
            </g>
          )
        })}
        {/* GENMO's generative reach into the gap */}
        <path
          d={`M ${GENMO.x + GENMO.w - 20} ${GENMO.y - 4} C 540 52, 660 52, ${slotX(GAP_SLOT)} ${STRIP.y - 4}`}
          fill="none"
          stroke={GENMO_GREEN}
          strokeWidth={1.5}
          strokeDasharray="5 4"
          strokeLinecap="round"
          className="stage"
          style={{ opacity: at('fill') ? 0.8 : staticMode ? 0.6 : 0 }}
        />
        <FlowParticles x={GENMO.x + GENMO.w - 18} y={GENMO.y - 8} y2={STRIP.y - 10} dx={slotX(GAP_SLOT) - GENMO.x - GENMO.w + 10} spreadStart={4} spreadEnd={3} count={4} duration={0.8} radius={2} shape="square" color={GENMO_GREEN} active={at('fill')} />

        {/* smooth motion curve through the frames */}
        <path
          d={`M ${slotX(0)} ${STRIP.y + 62} C ${slotX(1) - 20} ${STRIP.y + 48}, ${slotX(1) + 20} ${STRIP.y + 48}, ${slotX(2)} ${STRIP.y + 60} S ${slotX(3) + 20} ${STRIP.y + 52}, ${slotX(4)} ${STRIP.y + 58}`}
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
          y1={STRIP.y + 8}
          x2={STRIP.x + 10}
          y2={STRIP.y + STRIP.h - 8}
          stroke="#e11d48"
          strokeWidth={2}
          strokeLinecap="round"
          style={{ '--sweep': `${STRIP.w - 20}px` } as CSSVarStyle}
        />

        {/* --- the SMPL file out ------------------------------------------------- */}
        <FlowParticles x={STRIP.x + STRIP.w - 120} y={STRIP.y + STRIP.h + 4} y2={OUT.y - 4} dx={OUT.x - 44 - (STRIP.x + STRIP.w - 120)} spreadStart={10} spreadEnd={4} count={5} duration={0.9} color={SMPL_RED} active={at('output')} />
        <g
          className="stage stage-pop"
          style={{
            transform: `translate(${OUT.x}px, ${OUT.y}px) scale(${since('output') ? 1 : 0.5})`,
            opacity: since('output') ? 1 : 0,
          }}
        >
          <rect x={-30} y={-22} width={60} height={44} rx={8} fill="var(--diagram-surface)" stroke={SMPL_RED} strokeWidth={1.6} />
          <g stroke={SMPL_RED} strokeWidth={1.9} strokeLinecap="round" fill="none">
            <circle cx={0} cy={-10} r={3.1} />
            <path d="M 0 -6.5 L 0 3" />
            <path d="M 0 -3.5 L -8 1.5" />
            <path d="M 0 -3.5 L 8 1.5" />
            <path d="M 0 3 L -5.5 12" />
            <path d="M 0 3 L 5.5 12" />
          </g>
          <text className="diagram-sublabel" y={38} textAnchor="middle">
            dance_07.smpl
          </text>
        </g>

        {/* --- labels ------------------------------------------------------------- */}
        <StageLabel x={VIDEO.cx} y={LABEL_Y} text="video" active={at('video') || at('detect') || at('keypoints') || at('skeleton')} accent={VIDEO_BLUE} />
        <StageLabel x={GENMO.x + GENMO.w / 2} y={LABEL_Y} text="extract" active={at('extract') || at('fill')} accent={GENMO_GREEN} />
        <StageLabel x={STRIP.x + STRIP.w / 2 - 40} y={LABEL_Y} text="motion timeline" active={at('gap') || at('smooth')} accent="#3399ff" />
        <StageLabel x={OUT.x} y={LABEL_Y} text="smpl out" active={at('output')} accent={SMPL_RED} />
      </DiagramFrame>
    </div>
  )
}

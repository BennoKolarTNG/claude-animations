import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export type RobotMove =
  | 'disco' // alternating raised arms
  | 'kick' // legs flying left and right
  | 'wiggle' // standing slightly sideways, arms pumping up and down
  | 'walk' // stepping in place, arms swinging
  | 'sidewiggle' // both arms to one side (right arm across the body), rippling
  | 'wave' // one arm raised, waving
  | 'jump' // hopping, legs tucked, arms thrown up
  | 'balance' // lower body only: slow weight shifts, arms at rest
  | 'embodied' // arms working a task while the legs keep balancing

interface RobotDancerProps {
  /** Animates while true, using the given move. */
  dancing: boolean
  move?: RobotMove
  /** Muted outline until active; ink + accent details once awake. */
  active: boolean
  /** Override for the chest/antenna light (defaults to the action accent). */
  accent?: string
  /** Override for the body stroke color while active (defaults to ink) —
   * e.g. tint the whole robot to match the system it embodies. */
  tint?: string
  /** One-shot stumble-and-recover — pair with a WindGust. */
  stumbling?: boolean
  /**
   * 'ghost': a hypothetical other humanoid — dashed strokes, rounder
   * head, twin antennae, narrower torso. Same rig, so it dances the
   * same moves in perfect sync.
   */
  variant?: 'default' | 'ghost'
}

const ANIMATED_PARTS =
  '.robot-sway, .robot-bounce, .robot-head, .robot-arm, .robot-leg, .robot-armside'

/** Fallback in case no transitionend arrives (e.g. reduced motion):
 * a bit above the 420ms transform transition on the robot parts. */
const GLIDE_FALLBACK_MS = 540

type AnimPhase = 'idle' | 'dancing' | 'toPose' | 'toRest'

interface AnimState {
  phase: AnimPhase
  /** The move being danced, or the move a glide is heading toward. */
  move: RobotMove
  /** The move a glide departed from (undefined when starting from rest). */
  from?: RobotMove
}

/**
 * A glide staged by one render and executed by the next: the flight
 * render may re-parent limbs (the side-lean wiggle moves the arms in
 * front of the torso), so poses are recorded per part index and
 * re-applied to whatever nodes exist after the commit, pre-paint.
 */
interface FlightPlan {
  /** Per-part pose to hold at flight start (null → leave at rest). */
  frozen: (string | null)[] | null
  /** Per-part glide target ('none'/null → rest). */
  entry: (string | null)[]
}

/**
 * A small geometric robot, drawn with local origin at its feet (0,0).
 * Stands quietly in muted line-work until activated, then comes alive
 * with ink strokes, an accent chest light, and a simple dance. All moves
 * are pure CSS keyframes keyed off a `move-*` class.
 *
 * Dances never cut — every handover is a single continuous glide:
 * - Move → move: the current pose is frozen inline, the old animation
 *   drops without a jump, and the limbs transition DIRECTLY to the new
 *   move's measured first-frame pose (no stop at rest in between).
 * - Move → rest / rest → move: the same freeze/measure machinery glides
 *   one way or the other.
 * The next state begins on the glide's own transitionend, so the dance
 * takes over the instant the limbs arrive — no dead time holding a pose.
 */
export function RobotDancer({
  dancing,
  move = 'disco',
  active,
  accent,
  tint,
  stumbling = false,
  variant = 'default',
}: RobotDancerProps) {
  const rootRef = useRef<SVGGElement>(null)
  const propsRef = useRef({ dancing, move })
  propsRef.current = { dancing, move }
  const pendingRef = useRef<{ raf: number[]; cancelArrival?: () => void }>({
    raf: [],
  })
  /** Limbs currently holding an inline glide-target pose. */
  const posedRef = useRef<SVGElement[]>([])
  /** Glide staged by the previous render, executed after its commit. */
  const flightRef = useRef<FlightPlan | null>(null)
  const [anim, setAnim] = useState<AnimState>(() => ({
    phase: dancing ? 'dancing' : 'idle',
    move,
  }))

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const queryParts = () =>
      Array.from(root.querySelectorAll<SVGElement>(ANIMATED_PARTS))

    // The 'dancing' render just committed with the move class in the
    // DOM; release any held glide pose in the same commit, before
    // paint. The animation's first frame equals the held pose, so the
    // takeover is seamless. (Done in this layout effect rather than in
    // the arrival handler so simultaneous robots stay batched into one
    // render — one style recalc — and their animations share a start
    // time.)
    if (anim.phase === 'dancing' && posedRef.current.length) {
      posedRef.current.forEach((el) => {
        el.style.transform = ''
      })
      posedRef.current = []
    }

    /** Fire `done` when the glide's transform transitions end (bubbled
     * transitionend on the root), with a timer fallback. */
    const armArrival = (done: () => void) => {
      let finished = false
      const finish = () => {
        if (finished) return
        finished = true
        root.removeEventListener('transitionend', onEnd)
        window.clearTimeout(timer)
        pendingRef.current.cancelArrival = undefined
        done()
      }
      const onEnd = (e: Event) => {
        if ((e as TransitionEvent).propertyName === 'transform') finish()
      }
      root.addEventListener('transitionend', onEnd)
      const timer = window.setTimeout(finish, GLIDE_FALLBACK_MS)
      pendingRef.current.cancelArrival = () => {
        finished = true
        root.removeEventListener('transitionend', onEnd)
        window.clearTimeout(timer)
      }
    }

    /** Retarget `parts` to `poses` (inline), clearing limbs whose
     * target is rest — one transition from wherever they are. */
    const glideTo = (parts: SVGElement[], poses: (string | null)[]) => {
      const posed: SVGElement[] = []
      parts.forEach((el, i) => {
        const pose = poses[i]
        const isRest =
          !pose || pose === 'none' || pose === 'matrix(1, 0, 0, 1, 0, 0)'
        if (isRest) {
          if (el.style.transform) el.style.transform = ''
        } else {
          el.style.transform = pose
          posed.push(el)
        }
      })
      posedRef.current = posed
    }

    // ---- Flight execution: a toPose/toRest render just committed. ----
    // The commit may have re-parented the arms (side-lean wiggle), so
    // re-query the live nodes and hold the recorded frozen pose on them
    // BEFORE this render paints (styles applied at node insertion take
    // effect instantly — no transition fires on fresh elements).
    if (
      (anim.phase === 'toPose' || anim.phase === 'toRest') &&
      flightRef.current
    ) {
      const plan = flightRef.current
      flightRef.current = null
      const parts = queryParts()
      if (plan.frozen) {
        parts.forEach((el, i) => {
          const t = plan.frozen![i]
          if (t && t !== 'none') el.style.transform = t
        })
      }
      const targetMove = anim.move
      const isPose = anim.phase === 'toPose'
      // Let the frozen frame reach the compositor, then retarget: the
      // transitions carry every limb from its held pose to the target.
      const raf1 = requestAnimationFrame(() => {
        const raf2 = requestAnimationFrame(() => {
          glideTo(queryParts(), plan.entry)
          armArrival(() => {
            const latest = propsRef.current
            if (isPose && latest.dancing) {
              // The 'dancing' render's layout effect releases the held
              // pose in the same commit that applies the move class. If
              // the wanted move changed mid-glide, the effect re-runs
              // and crossfades onward from there.
              setAnim({ phase: 'dancing', move: targetMove })
            } else if (isPose && !latest.dancing) {
              // Canceled mid-glide: release everything toward rest.
              glideTo(queryParts(), [])
              setAnim({ phase: 'toRest', move: targetMove, from: targetMove })
              armArrival(() =>
                setAnim({ phase: 'idle', move: propsRef.current.move }),
              )
            } else {
              setAnim({ phase: 'idle', move: propsRef.current.move })
            }
          })
        })
        pendingRef.current.raf.push(raf2)
      })
      pendingRef.current.raf.push(raf1)
      return
    }
    // Glides in flight finish via their own arrival handler.
    if (anim.phase === 'toPose' || anim.phase === 'toRest') return

    // ---- Flight planning: decide and stage the next glide. ----
    const needsStop = anim.phase === 'dancing' && !dancing
    const needsSwitch =
      anim.phase === 'dancing' && dancing && move !== anim.move
    const needsStart = anim.phase === 'idle' && dancing
    if (!needsStop && !needsSwitch && !needsStart) return

    /** Measure `target`'s first-frame pose on a hidden CLONE: cloning
     * keeps the live limbs' transition baselines untouched (a forced
     * recalc on the real elements would swallow the glide's delta).
     * The clone gets the target move class with animations paused, is
     * read, and removed — all synchronously, so it never paints. */
    const measureEntryPose = (target: RobotMove) => {
      const clone = root.cloneNode(true) as SVGGElement
      Array.from(clone.classList).forEach((c) => {
        if (c.startsWith('move-')) clone.classList.remove(c)
      })
      clone.classList.add('measuring', `move-${target}`)
      clone.style.visibility = 'hidden'
      root.parentNode?.appendChild(clone)
      const poses = Array.from(
        clone.querySelectorAll<SVGElement>(ANIMATED_PARTS),
      ).map((el) => getComputedStyle(el).transform)
      clone.remove()
      return poses
    }

    const parts = queryParts()
    const readCurrentPose = () =>
      parts.map((el) => {
        const t = getComputedStyle(el).transform
        return t && t !== 'none' ? t : null
      })

    if (needsStop) {
      flightRef.current = {
        frozen: readCurrentPose(),
        entry: parts.map(() => null),
      }
      setAnim({ phase: 'toRest', move: anim.move, from: anim.move })
    } else if (needsStart) {
      flightRef.current = { frozen: null, entry: measureEntryPose(move) }
      setAnim({ phase: 'toPose', move })
    } else {
      // Crossfade dance → dance with NO stop at rest: hold the current
      // pose while the old animation drops, then glide every limb
      // directly to the next move's first-frame pose.
      flightRef.current = {
        frozen: readCurrentPose(),
        entry: measureEntryPose(move),
      }
      setAnim({ phase: 'toPose', move, from: anim.move })
    }
  }, [dancing, move, anim])

  useEffect(() => {
    const pending = pendingRef.current
    return () => {
      pending.raf.forEach((id) => cancelAnimationFrame(id))
      pending.cancelArrival?.()
    }
  }, [])

  // Which move shapes the DOM (arm render order): while a glide involves
  // the side-lean wiggle on either end, its crossing arm must stay in
  // front of the torso, so the arms aren't re-parented mid-glide.
  const renderedMove = anim.phase === 'idle' ? move : anim.move
  const sideLeanInvolved =
    anim.phase !== 'idle' &&
    (anim.move === 'sidewiggle' || anim.from === 'sidewiggle')
  const ghost = variant === 'ghost'
  const stroke = active ? (tint ?? 'var(--diagram-ink)') : 'var(--diagram-line)'
  const fill = active ? 'var(--diagram-surface)' : 'var(--diagram-bg)'
  const light = active
    ? (accent ?? 'var(--diagram-accent-action)')
    : 'var(--diagram-line)'
  const dash = ghost ? '4 3' : undefined

  const limb = {
    stroke,
    strokeWidth: 6,
    strokeLinecap: 'round' as const,
    strokeDasharray: dash,
  }
  // In the side-lean wiggle one arm always sweeps ACROSS the body (and
  // halfway through, the arms swap sides), so BOTH render in front of
  // the torso for that move. Each arm sits in a mirror wrapper pivoting
  // at its shoulder; the invisible anchor rect keeps the wrapper's
  // bounding box — and thus the mirror axis — stable while it swings.
  const armsInFront = renderedMove === 'sidewiggle' || sideLeanInvolved
  const leftArm = (
    <g className="robot-armside">
      <rect x={-38} y={-58} width={40} height={42} fill="none" stroke="none" />
      <line
        className="robot-limb robot-arm robot-arm-left"
        x1={-18}
        y1={-38}
        x2={-18}
        y2={-20}
        {...limb}
        strokeWidth={5}
      />
    </g>
  )
  const rightArm = (
    <g className="robot-armside">
      <rect x={-2} y={-58} width={40} height={42} fill="none" stroke="none" />
      <line
        className="robot-limb robot-arm robot-arm-right"
        x1={18}
        y1={-38}
        x2={18}
        y2={-20}
        {...limb}
        strokeWidth={5}
      />
    </g>
  )
  const cls = [
    'robot',
    anim.phase === 'dancing' ? `move-${anim.move}` : '',
    active ? 'live' : '',
    stumbling ? 'stumbling' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <g ref={rootRef} className={cls} aria-hidden>
      <g className="robot-sway">
        {/* Legs pivot at the hips (top of each line). */}
        <line
          className="robot-limb robot-leg robot-leg-left"
          x1={-8}
          y1={-16}
          x2={-8}
          y2={-2}
          {...limb}
        />
        <line
          className="robot-limb robot-leg robot-leg-right"
          x1={8}
          y1={-16}
          x2={8}
          y2={-2}
          {...limb}
        />

        <g className="robot-bounce">
          {/* Arms pivot at the shoulders; behind the body by default. */}
          {!armsInFront && leftArm}
          {!armsInFront && rightArm}

          {/* Torso */}
          <rect
            className="robot-part"
            x={ghost ? -12 : -14}
            y={-44}
            width={ghost ? 24 : 28}
            height={30}
            rx={ghost ? 10 : 7}
            fill={fill}
            stroke={stroke}
            strokeWidth={1.6}
            strokeDasharray={dash}
          />
          <circle className="robot-part robot-chest" cx={0} cy={-29} r={3.4} fill={light} />
          {armsInFront && leftArm}
          {armsInFront && rightArm}

          <g className="robot-head">
            {ghost ? (
              <>
                {/* Twin side antennae */}
                <line className="robot-limb" x1={-8} y1={-63} x2={-11} y2={-69} stroke={stroke} strokeWidth={1.6} />
                <line className="robot-limb" x1={8} y1={-63} x2={11} y2={-69} stroke={stroke} strokeWidth={1.6} />
                <circle className="robot-part robot-antenna" cx={-11.5} cy={-71} r={2.2} fill={light} />
                <circle className="robot-part robot-antenna" cx={11.5} cy={-71} r={2.2} fill={light} />
              </>
            ) : (
              <>
                <line className="robot-limb" x1={0} y1={-64} x2={0} y2={-70} stroke={stroke} strokeWidth={1.6} />
                <circle className="robot-part robot-antenna" cx={0} cy={-72} r={2.6} fill={light} />
              </>
            )}
            <rect
              className="robot-part"
              x={ghost ? -12 : -11}
              y={ghost ? -63 : -64}
              width={ghost ? 24 : 22}
              height={ghost ? 16 : 17}
              rx={ghost ? 8 : 5.5}
              fill={fill}
              stroke={stroke}
              strokeWidth={1.6}
              strokeDasharray={dash}
            />
            <circle className="robot-part" cx={-4.5} cy={-55.5} r={2} fill={stroke} />
            <circle className="robot-part" cx={4.5} cy={-55.5} r={2} fill={stroke} />
          </g>
        </g>
      </g>
    </g>
  )
}

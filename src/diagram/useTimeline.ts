import { useEffect, useRef, useState } from 'react'

export interface TimelinePhase {
  name: string
  /** Duration in milliseconds. */
  duration: number
}

/**
 * A minimal looping phase timeline. Advances through `phases` while
 * `playing` is true, looping forever. Returns the current phase name
 * and its index so components can derive "at" / "reached" styling.
 */
export function useTimeline(phases: TimelinePhase[], playing: boolean) {
  const [index, setIndex] = useState(0)
  const phasesRef = useRef(phases)
  phasesRef.current = phases

  useEffect(() => {
    if (!playing) return
    const current = phasesRef.current[index]
    const id = window.setTimeout(() => {
      setIndex((i) => (i + 1) % phasesRef.current.length)
    }, current.duration)
    return () => window.clearTimeout(id)
  }, [index, playing])

  return { phase: phases[index].name, index }
}

/** True when the user prefers reduced motion (live-updating). */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/** True while `ref`'s element is at least partly on screen. */
export function useOnScreen<T extends Element>(
  ref: React.RefObject<T | null>,
): boolean {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.15 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ref])
  return visible
}

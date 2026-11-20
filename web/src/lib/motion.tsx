import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'

export const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

let lenis: Lenis | null = null

/** Buttery smooth scrolling for the whole app (skipped for reduced-motion users). Mount once. */
export function useSmoothScroll() {
  useEffect(() => {
    if (reducedMotion() || !window.matchMedia) return // no matchMedia: test DOM, not a real browser
    // Elements marked data-lenis-prevent (3D viewers, inner scroll areas) keep their native wheel behavior.
    const l = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, allowNestedScroll: true })
    lenis = l
    let id = requestAnimationFrame(function raf(t) {
      l.raf(t)
      id = requestAnimationFrame(raf)
    })
    return () => {
      cancelAnimationFrame(id)
      l.destroy()
      lenis = null
    }
  }, [])
}

export function scrollToTop() {
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true })
  else window.scrollTo(0, 0)
}

/**
 * Scroll-reveal for any page without per-page wiring: each top-level block of the page (and each child of a
 * [data-stagger] container) fades and lifts in as it enters the viewport. Content that appears later
 * (results, debriefs) is picked up too. Opt out with data-no-reveal.
 */
export function AutoReveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = ref.current
    if (!root || reducedMotion() || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target) } }),
      { rootMargin: '0px 0px -6% 0px', threshold: 0.06 },
    )
    const seen = new WeakSet<Element>()
    const scan = () => {
      root.querySelectorAll(':scope > * > *, [data-stagger] > *').forEach((el) => {
        if (seen.has(el) || el.closest('[data-no-reveal]')) return
        seen.add(el)
        el.classList.add('reveal')
        const parent = el.parentElement
        if (parent?.hasAttribute('data-stagger')) (el as HTMLElement).style.transitionDelay = `${Math.min([...parent.children].indexOf(el), 8) * 70}ms`
        io.observe(el)
      })
    }
    scan()
    const mo = new MutationObserver(scan)
    mo.observe(root, { childList: true, subtree: true })
    return () => { io.disconnect(); mo.disconnect() }
  }, [])
  return <div ref={ref}>{children}</div>
}

/**
 * Scroll progress (0 → 1) of a tall section while it scrolls past: 0 when its top hits the top of the
 * viewport, 1 when its bottom hits the bottom. Written to the CSS variable --p and passed to onFrame,
 * every animation frame, without React re-renders.
 */
export function useScrollProgress(ref: RefObject<HTMLElement | null>, onFrame?: (p: number) => void) {
  const cb = useRef(onFrame)
  useEffect(() => { cb.current = onFrame })
  useEffect(() => {
    let id = 0
    let last = -1
    const tick = () => {
      const el = ref.current
      if (el) {
        const r = el.getBoundingClientRect()
        const span = r.height - window.innerHeight
        const p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0
        if (Math.abs(p - last) > 0.0005) {
          last = p
          el.style.setProperty('--p', p.toFixed(4))
          cb.current?.(p)
        }
      }
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [ref])
}

function useInView<T extends Element>(threshold = 0.2) {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(() => reducedMotion() || typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect() } }, { threshold, rootMargin: '0px 0px -8% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [threshold, seen])
  return [ref, seen] as const
}

/** Fades and lifts its children into place the first time they scroll into view. */
export function Reveal({ children, delay = 0, className = '', as: Tag = 'div' }: { children: ReactNode; delay?: number; className?: string; as?: 'div' | 'section' | 'li' | 'p' | 'h2' }) {
  const [ref, seen] = useInView<HTMLDivElement>()
  return (
    <Tag ref={ref as never} className={`reveal ${seen ? 'is-in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` } as CSSProperties}>
      {children}
    </Tag>
  )
}

/** Counts up to `to` with an ease-out when it scrolls into view. */
export function CountUp({ to, duration = 1600, format = (n: number) => Math.round(n).toLocaleString() }: { to: number; duration?: number; format?: (n: number) => string }) {
  const [ref, seen] = useInView<HTMLSpanElement>(0.5)
  const [n, setN] = useState(() => (reducedMotion() ? to : 0))
  useEffect(() => {
    if (!seen || reducedMotion()) return
    const start = performance.now()
    let id = requestAnimationFrame(function step(t) {
      const k = Math.min(1, (t - start) / duration)
      setN(to * (1 - Math.pow(1 - k, 4)))
      if (k < 1) id = requestAnimationFrame(step)
    })
    return () => cancelAnimationFrame(id)
  }, [seen, to, duration])
  return <span ref={ref} className="tabular-nums">{format(n)}</span>
}

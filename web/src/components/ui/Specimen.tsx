import { useMemo } from 'react'

const STAINS = ['#3d3a8f', '#c4547a', '#2e7c77', '#c48a3a', '#8a4f7d', '#7471c0']

function rng(seed: string) {
  let h = 2166136261
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296
}

/** A tiny pixel "specimen" unique to each lesson; its pixels ripple when the lesson is hovered. */
export function Specimen({ id, done = false, size = 'size-16' }: { id: string; done?: boolean; size?: string }) {
  const px = useMemo(() => {
    const r = rng(id)
    const main = STAINS[Math.floor(r() * STAINS.length)]
    const out: { x: number; y: number; c: string; d: number }[] = []
    for (let y = 0; y < 9; y++)
      for (let x = 0; x < 9; x++) {
        const dist = Math.hypot(x - 4, y - 4)
        if (dist > 4.3 || (dist > 3.2 && r() < 0.45) || (dist < 3.2 && r() < 0.35)) continue
        const c = dist < 1.6 ? main : dist > 3.2 ? '#7d9f9a' : r() < 0.25 ? STAINS[Math.floor(r() * STAINS.length)] : '#cfc7b8'
        out.push({ x, y, c, d: Math.round(dist * 45) })
      }
    return out
  }, [id])
  return (
    <svg viewBox="0 0 9 9" className={`${size} shrink-0`} shapeRendering="crispEdges" aria-hidden="true">
      {px.map((p, i) => (
        <rect key={i} x={p.x + 0.1} y={p.y + 0.1} width={0.8} height={0.8} fill={p.c}
          className="origin-center transition-transform duration-500 [transform-box:fill-box] group-hover:scale-50 group-focus-visible:scale-50"
          style={{ transitionDelay: `${p.d}ms`, opacity: done ? 1 : 0.85 }} />
      ))}
      {done && <rect x={6.6} y={0} width={2.4} height={2.4} fill="#1a1820" />}
    </svg>
  )
}


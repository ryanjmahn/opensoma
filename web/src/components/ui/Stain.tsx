import type { ReactNode } from 'react'

const COLORS = { eosin: '#c4547a', hematoxylin: '#3d3a8f', iodine: '#c48a3a', teal: '#2e7c77' }
export type StainColor = keyof typeof COLORS

/** One shared SVG filter that roughens edges like stain soaking into paper. Render once in the app shell. */
export function StainDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true">
      <filter id="stain" x="-20%" y="-40%" width="140%" height="180%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035 0.22" numOctaves="3" seed="7" />
        <feDisplacementMap in="SourceGraphic" scale="9" />
        <feGaussianBlur stdDeviation="0.6" />
      </filter>
      <filter id="blot" x="-30%" y="-30%" width="160%" height="160%">
        <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="4" seed="3" />
        <feDisplacementMap in="SourceGraphic" scale="60" />
        <feGaussianBlur stdDeviation="3" />
      </filter>
    </svg>
  )
}

/** Brush-like stain highlight behind a few words. */
export function Stain({ children, color = 'eosin', strength = 0.35 }: { children: ReactNode; color?: StainColor; strength?: number }) {
  return (
    <span className="relative isolate inline-block whitespace-nowrap">
      <svg aria-hidden="true" className="absolute -left-[0.2em] top-[0.18em] -z-10 h-[0.9em] w-[calc(100%+0.4em)]" viewBox="0 0 100 20" preserveAspectRatio="none">
        <rect x="2" y="3" width="96" height="15" fill={COLORS[color]} opacity={strength} filter="url(#stain)" />
      </svg>
      {children}
    </span>
  )
}

/** Soft watercolor blot for backgrounds. */
export function Blot({ color, className, opacity = 0.18 }: { color: StainColor; className?: string; opacity?: number }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 200 200" className={`pointer-events-none absolute ${className ?? ''}`}>
      <circle cx="100" cy="100" r="62" fill={COLORS[color]} opacity={opacity} filter="url(#blot)" />
    </svg>
  )
}

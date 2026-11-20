import type { LineResult, Meta } from '../../lib/data'
import { PLAIN, pathwayName, valueWord } from '../../lib/explain'
import { useLevel } from '../../lib/level'
import { scaled } from '../../lib/model'

// Color-blind-safe pair (Okabe–Ito): blue = down, orange = up.
export const DOWN = '#0072B2'
export const UP = '#D55E00'

export function PathwayBars({ r, meta, compare, highlight, onHover }: {
  r: LineResult; meta: Meta; compare?: LineResult; highlight?: (id: string) => boolean; onHover?: (id: string | null) => void
}) {
  const { level } = useLevel()
  const s = scaled(r, meta)
  const c = compare ? scaled(compare, meta) : null
  const bar = (v: number, thin = false) => {
    const w = (Math.min(Math.abs(v), 1.5) / 1.5) * 50
    return (
      <div
        className={`absolute transition-all duration-500 ease-out ${thin ? 'top-[70%] h-[30%] opacity-60' : 'top-0 h-full'}`}
        style={{ background: v >= 0 ? UP : DOWN, width: `${w}%`, left: v >= 0 ? '50%' : `${50 - w}%` }}
      />
    )
  }
  return (
    <div className="space-y-1">
      <dl className="space-y-1" aria-label="Changes in the cell's main jobs" onMouseLeave={() => onHover?.(null)}>
        {meta.pathways.map((p, j) => (
          <div key={p.id} onMouseEnter={() => onHover?.(p.id)} className={`-mx-2 grid grid-cols-[7.25rem_1fr_4.5rem] items-center gap-2 px-2 py-0.5 text-sm transition sm:grid-cols-[9rem_1fr_5.5rem] sm:gap-3 ${highlight?.(p.id) ? 'bg-sunk' : ''}`}>
            <dt className="leading-tight" title={`${PLAIN[p.id]?.what ?? ''}. Reactome: ${p.reactome.join(', ')} (${p.n} genes)`}>
              <span className="block truncate text-ink">{pathwayName(p.id, p.label, level)}</span>
              {level === 'simple' && <span className="block truncate text-[11px] text-faint">{PLAIN[p.id]?.what}</span>}
            </dt>
            <dd className="relative h-2.5 bg-sunk" aria-hidden="true">
              <div className="absolute left-1/2 top-[-3px] h-[calc(100%+6px)] w-px bg-ink/40" />
              {bar(s[j], !!c)}
              {c && bar(c[j], true)}
            </dd>
            <dd className="text-right font-mono text-[11px] tabular-nums" style={{ color: Math.abs(s[j]) < 0.25 ? undefined : s[j] > 0 ? UP : DOWN }}>
              <span className="sr-only">{p.label}: </span>
              {level === 'deep' ? `${s[j] >= 0 ? '+' : ''}${s[j].toFixed(2)}` : <span className={Math.abs(s[j]) < 0.25 ? 'text-faint' : ''}>{valueWord(s[j])}</span>}
            </dd>
          </div>
        ))}
      </dl>
      <div className="grid grid-cols-[7.25rem_1fr_4.5rem] gap-2 font-mono sm:grid-cols-[9rem_1fr_5.5rem] sm:gap-3 text-[10px] uppercase tracking-[0.08em]" aria-hidden="true">
        <span />
        <span className="flex justify-between"><span style={{ color: DOWN }}>◀ less active</span><span style={{ color: UP }}>more active ▶</span></span>
        <span />
      </div>
    </div>
  )
}

import type { LineResult } from '../../lib/data'
import { confidence } from '../../lib/model'

const STYLE = {
  measured: 'border-emerald-800/60 text-emerald-900 bg-emerald-700/5',
  high: 'border-accent/60 text-accent bg-accent/5',
  medium: 'border-amber-800/60 text-amber-900 bg-amber-600/5',
  low: 'border-rose-800/60 text-rose-900 bg-rose-600/5',
}

export function explain(r: LineResult): string {
  if (r.m) {
    const sig = (r.p ?? 1) < 0.05
    return `Measured in a real CRISPRi experiment (${r.n ?? '?'} cells averaged). ${
      sig ? 'The cells clearly changed.' : `The change was not statistically clear (p = ${r.p}); treat it as "little or no effect".`
    }${r.kd != null && r.kd < 1 ? ` The target's mRNA fell to about ${Math.round(r.kd * 100)}% of normal.` : ''}`
  }
  const why = r.combo
    ? `Predicted by adding up ${r.combo} single effects; real combinations can interact in ways this misses.`
    : r.approx
      ? 'Predicted: the drug is approximated as knocking down its target gene(s).'
      : "Predicted: not measured in this cell line, so we borrowed the other cell line's measurement."
  return `${why} Confidence ${Math.round((r.c ?? 0) * 100)}%, calibrated against cases where we know the real answer.`
}

export function Badge({ r }: { r: LineResult }) {
  const c = confidence(r)
  return (
    <span title={explain(r)} className={`inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.08em] ${STYLE[c]}`}>
      {c === 'measured' ? '● Measured' : `◐ Predicted · ${c} confidence`}
      {r.m === 1 && (r.p ?? 1) >= 0.05 && <span className="opacity-80">· weak</span>}
    </span>
  )
}

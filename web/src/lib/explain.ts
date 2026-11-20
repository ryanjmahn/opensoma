import type { LineResult, Meta } from './data'
import type { Level } from './level'
import { scaled } from './model'

// Plain-language translations of the pathway scores, so results read as sentences, not numbers.
export const PLAIN: Record<string, { name: string; what: string; up: string; down: string }> = {
  growth: { name: 'Growth signals', what: "the 'grow!' messages passed through the cell", up: "sending more 'grow' signals", down: "sending fewer 'grow' signals" },
  division: { name: 'Dividing', what: 'the machinery the cell uses to copy itself', up: 'gearing up to divide', down: 'slowing down its dividing' },
  death: { name: 'Self-destruct', what: "the cell's built-in self-destruct program", up: 'switching on its self-destruct program', down: 'turning down its self-destruct program' },
  dna_repair: { name: 'DNA repair', what: 'fixing damaged DNA', up: 'ramping up DNA repair', down: 'doing less DNA repair' },
  metabolism: { name: 'Energy', what: 'making energy in the mitochondria', up: 'making more energy', down: 'making less energy' },
  stress: { name: 'Stress alarm', what: 'the alarm for badly folded proteins', up: 'sounding its stress alarm', down: 'quieting its stress alarm' },
  translation: { name: 'Protein making', what: 'building new proteins', up: 'making more protein-building parts', down: 'making fewer protein-building parts' },
}

export type Strength = 'none' | 'slight' | 'clear' | 'strong'

export function strength(v: number): Strength {
  const a = Math.abs(v)
  return a < 0.25 ? 'none' : a < 0.5 ? 'slight' : a < 1 ? 'clear' : 'strong'
}

const DEGREE: Record<Strength, string> = { none: '', slight: ' (a small change)', clear: '', strong: ' (a big change)' }

export function valueWord(v: number): string {
  const s = strength(v)
  return s === 'none' ? 'no change' : `${s} ${v > 0 ? '↑' : '↓'}`
}

export function pathwayName(id: string, label: string, level: Level) {
  return level === 'simple' ? PLAIN[id]?.name ?? label : label
}

/** Up to three plain sentences about what changed in one cell. */
export function describe(r: LineResult, meta: Meta): string[] {
  const s = scaled(r, meta)
  const changes = meta.pathways
    .map((p, j) => ({ id: p.id, v: s[j] }))
    .filter((x) => strength(x.v) !== 'none')
    .sort((a, b) => Math.abs(b.v) - Math.abs(a.v))
    .slice(0, 3)
  if (!changes.length) {
    const weak = r.m === 1 && (r.p ?? 1) >= 0.05
    return [`Almost nothing changed${weak ? ' (the experiment found no clear effect)' : ''}. This cell doesn't seem to rely on it much.`]
  }
  return changes.map((c, i) => `${i === 0 ? 'It is' : 'It is also'} ${c.v > 0 ? PLAIN[c.id].up : PLAIN[c.id].down}${DEGREE[strength(c.v)]}.`)
}

export function overall(r: LineResult | null, meta: Meta): number {
  return r ? Math.max(...scaled(r, meta).map(Math.abs)) : 0
}

export type VerdictTone = 'selective' | 'both' | 'healthy' | 'none'

export function verdict(cancer: LineResult, healthy: LineResult, meta: Meta) {
  const c = overall(cancer, meta)
  const h = overall(healthy, meta)
  const predicted = !cancer.m || !healthy.m
  let tone: VerdictTone
  if (c < 0.25 && h < 0.25) tone = 'none' // same cutoff as a "slight" change in the bars
  else if (c >= 1.6 * h) tone = 'selective'
  else if (h >= 1.6 * c) tone = 'healthy'
  else tone = 'both'
  const text = {
    none: { title: 'Little effect on either cell', body: 'Neither cell changed much. In a hunt for a cancer drug, this would not be a useful target.' },
    selective: { title: 'Hits the cancer cell harder', body: "The cancer cell changed much more than the healthy cell. That's what drug hunters look for: a weak spot of the cancer that healthy cells don't share." },
    healthy: { title: 'Hits the healthy cell harder', body: 'The healthy cell changed more than the cancer cell. As a medicine, this would mostly cause side effects.' },
    both: { title: 'Hits both cells', body: 'Both cells changed by a similar amount. As a medicine, this would likely cause side effects.' },
  }[tone]
  return { tone, ...text, cancer: c, healthy: h, predicted }
}

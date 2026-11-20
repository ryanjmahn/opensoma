import type { Action, LineId, LineResult, Meta } from './data'

/** Combine several actions in one cell line by adding their effects (z-scores add up in this simple model). */
export function combine(actions: Action[], line: LineId, topN = 20): LineResult | null {
  if (actions.length === 0) return null
  if (actions.length === 1) return actions[0].r[line]
  const rs = actions.map((a) => a.r[line])
  const genes = new Map<number, number>()
  for (const r of rs) for (const [i, z] of r.top) genes.set(i, (genes.get(i) ?? 0) + z)
  const confs = rs.map((r) => (r.m ? 1 : (r.c ?? 0)))
  return {
    m: 0,
    // shortcut: additive model ignores gene interactions; confidence knocked down 20% for that
    c: Math.min(...confs) * 0.8,
    combo: actions.length,
    pw: rs[0].pw.map((_, j) => rs.reduce((s, r) => s + r.pw[j], 0)),
    top: [...genes.entries()].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, topN),
    net: rs[0].net.map((_, j) => {
      const vals = rs.map((r) => r.net[j]).filter((v): v is number => v !== null)
      return vals.length ? vals.reduce((s, v) => s + v, 0) : null
    }),
  }
}

export type Confidence = 'measured' | 'high' | 'medium' | 'low'

export function confidence(r: LineResult): Confidence {
  if (r.m) return 'measured'
  const c = r.c ?? 0
  return c >= 0.5 ? 'high' : c >= 0.3 ? 'medium' : 'low'
}

/** Pathway scores divided by each pathway's typical range, so 1 ≈ a strong change. */
export function scaled(r: LineResult, meta: Meta): number[] {
  return r.pw.map((v, j) => v / meta.pathways[j].scale)
}

export const CHANGE = 0.35 // scaled value treated as a noticeable change

export function summary(r: LineResult, meta: Meta): string {
  const s = scaled(r, meta)
  const parts = meta.pathways
    .map((p, j) => ({ label: p.label, v: s[j] }))
    .filter((x) => Math.abs(x.v) >= CHANGE)
    .sort((a, b) => Math.abs(b.v) - Math.abs(a.v))
    .map((x) => `${x.label} ${x.v > 0 ? '↑' : '↓'}`)
  return parts.length ? parts.join(', ') : 'No clear change in the key pathways'
}

export interface MissionGoal {
  cell: LineId
  pathways: Record<string, number> // target scaled values
  harmWeight?: number // penalty per unit of average change in the other (healthy) cell
}

/** 0–100: how close the target cell got to the goal, minus harm to the healthy cell. */
export function missionScore(actions: Action[], goal: MissionGoal, meta: Meta, adapt?: { recovery: number }) {
  const ids = meta.pathways.map((p) => p.id)
  const other: LineId = goal.cell === 'k562' ? 'rpe1' : 'k562'
  const effect = (line: LineId) => {
    const per = actions.map((a) => scaled(a.r[line], meta))
    // Scripted adaptation: the cell partly reroutes around the FIRST action only.
    if (adapt && per.length && line === goal.cell) per[0] = per[0].map((v) => v * (1 - adapt.recovery))
    return ids.map((_, j) => per.reduce((s, p) => s + p[j], 0))
  }
  const t = effect(goal.cell)
  const h = effect(other)
  const keys = Object.keys(goal.pathways)
  const norm = Math.hypot(...keys.map((k) => goal.pathways[k]))
  const dist = Math.hypot(...keys.map((k) => t[ids.indexOf(k)] - goal.pathways[k]))
  const closeness = Math.max(0, 1 - dist / norm) * 100
  const harm = h.reduce((s, v) => s + Math.abs(v), 0) / h.length
  const penalty = (goal.harmWeight ?? 0) * harm * 100
  return {
    score: Math.round(Math.max(0, closeness - penalty)),
    closeness: Math.round(closeness),
    harm: Math.round(harm * 100) / 100,
    target: t,
    healthy: h,
  }
}

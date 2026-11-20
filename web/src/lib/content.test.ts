import { readFileSync } from 'node:fs'
// @vitest-environment node
import { expect, test } from 'vitest'
import { drugs, missions, network, sources, stories, structures } from './content'

const actions: { id: string }[] = JSON.parse(readFileSync('public/data/actions.json', 'utf8'))
const meta = JSON.parse(readFileSync('public/data/meta.json', 'utf8'))
const ids = new Set(actions.map((a) => a.id))
const allText = (x: unknown): string => JSON.stringify(x)

test('every action referenced by lessons and tours exists in the data', () => {
  for (const s of stories) for (const st of s.steps) for (const a of st.try?.actions ?? []) expect(ids, `${s.id}: ${a}`).toContain(a)
})

test('every [@citation] and sources list points at content/sources.json', () => {
  const blob = allText([stories, missions, drugs, structures, network])
  for (const m of blob.matchAll(/\[@(\w+)\]/g)) expect(sources, m[1]).toHaveProperty(m[1])
  for (const item of [...stories, ...missions, ...drugs, ...structures, network]) for (const s of item.sources) expect(sources, s).toHaveProperty(s)
})

test('stories and missions are well-formed', () => {
  expect(stories.filter((s) => s.kind === 'tour').length).toBeGreaterThanOrEqual(6)
  for (const s of stories) {
    expect(s.steps.length).toBeGreaterThan(0)
    for (const q of s.quiz ?? []) expect(q.answer).toBeLessThan(q.options.length)
    for (const st of s.steps) if (st.view === 'molecule') expect(structures.map((x) => x.pdb)).toContain(st.pdb)
  }
  const pw = meta.pathways.map((p: { id: string }) => p.id)
  for (const m of missions) for (const k of Object.keys(m.goal.pathways)) expect(pw).toContain(k)
})

test('network process nodes map to pathways and drug PDBs have captions', () => {
  const pw = meta.pathways.map((p: { id: string }) => p.id)
  for (const n of network.nodes) if (n.process) expect(pw).toContain(n.process)
  for (const d of drugs) if (d.pdb) expect(structures.map((s) => s.pdb)).toContain(d.pdb)
})

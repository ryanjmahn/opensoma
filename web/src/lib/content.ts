import type { Leveled } from './level'
import type { MissionGoal } from './model'
import sourcesJson from '../../../content/sources.json'
import drugsJson from '../../../content/drugs.json'
import networkJson from '../../../content/network.json'
import structuresJson from '../../../content/structures.json'

export interface Source { cite: string; url: string; kind: string }
export interface Drug {
  id: string; name: string; targets: string[]; class: 'targeted' | 'chemo' | 'research' | 'investigational'
  status: string; pdb: string | null; how: string; caveat: string; sources: string[]
}
export interface NetNode { id: string; gene?: string; process?: string; label: string; x: number; y: number; role?: string }
export interface Network {
  title: string; note: string; size: [number, number]
  compartments: { id: string; label: string; x: number; y: number; w: number; h: number }[]
  nodes: NetNode[]; edges: [string, string, '+' | '-'][]; sources: string[]
}
export interface Structure { pdb: string; gene: string; title: string; caption: string; ligand?: string; sources: string[] }

export interface QuizQ { q: Leveled; options: string[]; answer: number; explain: Leveled }
export interface Step {
  title: string
  text: Leveled
  view?: 'cell' | 'network' | 'molecule' | 'pipeline' | 'none'
  focus?: string // organelle to fly to
  cell?: 'cancer' | 'healthy'
  pdb?: string
  highlight?: string[] // network node ids
  try?: { actions: string[]; note?: Leveled }
  sources?: string[]
}
export interface Story {
  id: string; kind: 'tour' | 'lesson'; title: string; blurb: string; minutes: number; order: number
  steps: Step[]; quiz?: QuizQ[]; sources: string[]; review?: string
}
export interface Mission {
  id: string; title: string; order: number; blurb: string; brief: Leveled
  goal: MissionGoal; maxMoves: number; adapt?: { recovery: number; note: Leveled }
  passScore: number; hints: string[]; debrief: Leveled; sources: string[]
}

export const sources = sourcesJson as Record<string, Source>
export const drugs = drugsJson as Drug[]
export const network = networkJson as Network
export const structures = structuresJson as Structure[]

const byOrder = <T extends { order: number }>(m: Record<string, unknown>) =>
  Object.values(m).map((x) => (x as { default: T }).default).sort((a, b) => a.order - b.order)

export const stories = byOrder<Story>(import.meta.glob('../../../content/{tours,lessons}/*.json', { eager: true }))
export const missions = byOrder<Mission>(import.meta.glob('../../../content/missions/*.json', { eager: true }))

/** Network label → gene alias table, so "p53" or "ERK2" finds the right gene. */
export const aliases: Record<string, string> = Object.fromEntries(
  network.nodes.filter((n) => n.gene).map((n) => [n.label.toLowerCase(), n.gene!]),
)
Object.assign(aliases, { 'bcr-abl': 'BCR', erk: 'MAPK1', mek: 'MAP2K1', 'cdk4/6': 'CDK4', ras: 'KRAS', 'bcl-xl': 'BCL2L1' })

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

// Types mirror data/SCHEMA.md (written by pipeline/export.py).
export type LineId = 'k562' | 'rpe1'
export const LINES: LineId[] = ['k562', 'rpe1']

export interface LineResult {
  m: 0 | 1 // 1 = measured in a real experiment
  c?: number // prediction confidence 0..1 (predicted only)
  p?: number // energy-test p-value (measured only)
  n?: number // cells averaged (measured only)
  kd?: number | null // remaining target mRNA fraction (measured only)
  approx?: 1 // drug approximated by knocking down its target(s)
  combo?: number // number of actions combined (web-side additive prediction)
  pw: number[]
  top: [number, number][]
  net: (number | null)[]
}

export interface Action {
  id: string
  type: 'gene' | 'drug'
  name: string
  r: Record<LineId, LineResult>
}

export interface Pathway { id: string; label: string; reactome: string[]; n: number; scale: number }

export interface Validation {
  from: LineId
  beta: number
  n_shared: number
  median_r: number
  shuffled_r: number
  calib: number[]
  pathway_r: Record<string, number>
}

export interface Meta {
  schema: number
  generated: string
  lines: Record<LineId, { name: string; role: 'cancer' | 'healthy'; desc: string; sources: string[]; measured: number }>
  pathways: Pathway[]
  readout_genes: number
  top_n: number
  net_genes: string[]
  validation: Record<LineId, Validation>
  sources: string[]
}

export interface GeneInfo { protein: string; fn: string; org: string; acc: string; cancer?: 'oncogene' | 'suppressor' }

export interface Data {
  meta: Meta
  actions: Action[]
  byId: Map<string, Action>
  readout: string[]
  info: Record<string, GeneInfo>
}

export async function loadData(base = import.meta.env.BASE_URL): Promise<Data> {
  const get = async (name: string) => {
    const res = await fetch(`${base}data/${name}`)
    if (!res.ok) throw new Error(`Could not load ${name} (${res.status})`)
    return res.json()
  }
  const [meta, actions, genes] = await Promise.all([get('meta.json'), get('actions.json'), get('genes.json')])
  if (meta.schema !== 1) throw new Error(`Unsupported data schema ${meta.schema}`)
  return { meta, actions, byId: new Map(actions.map((a: Action) => [a.id, a])), readout: genes.readout, info: genes.info }
}

const Ctx = createContext<Data | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    loadData().then(setData, (e) => setError(String(e.message ?? e)))
  }, [])
  if (error) return <p role="alert" className="p-8 text-rose-800">Couldn't load cell data: {error}</p>
  if (!data) return <p className="p-8 text-muted" aria-busy="true">Loading the cell…</p>
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>
}

export function useData(): Data {
  const d = useContext(Ctx)
  if (!d) throw new Error('useData outside DataProvider')
  return d
}

import { useEffect, useState } from 'react'
import { CellScene, organelleGlow, PATHWAY_ORGANELLE } from '../components/cell/CellScene'
import { ActionSearch } from '../components/playground/ActionSearch'
import { Badge } from '../components/playground/Badge'
import { GeneInfo } from '../components/playground/GeneInfo'
import { DOWN, UP } from '../components/playground/PathwayBars'
import { Stain } from '../components/ui/Stain'
import { useData, type Action, type LineId } from '../lib/data'
import { overall, pathwayName, valueWord, verdict } from '../lib/explain'
import { useLevel } from '../lib/level'
import { scaled } from '../lib/model'
import { replaceParams, type Route } from '../lib/route'

const MATCHUPS: { a: string; b: string; label: string; line?: LineId }[] = [
  { a: 'd:imatinib', b: 'd:everolimus', label: 'Two targeted drugs' },
  { a: 'g:SIRT7', b: 'g:MTOR', label: 'Same effect, gentler?' },
  { a: 'g:MTOR', b: 'g:RPTOR', label: 'Partners' },
  { a: 'g:MTOR', b: 'g:RPS6', label: 'Opposites' },
  { a: 'd:bortezomib', b: 'd:everolimus', label: 'Two drugs, healthy cell', line: 'rpe1' },
]
// Where each pathway mostly happens, so hovering a row lights up that part of the cells.
const WHERE = PATHWAY_ORGANELLE
const LINE_LABEL: Record<LineId, string> = { k562: 'Cancer cell', rpe1: 'Healthy-like cell' }

function similarity(x: number[], y: number[]) {
  const dot = x.reduce((s, v, i) => s + v * y[i], 0)
  const n = Math.hypot(...x) * Math.hypot(...y)
  return n ? dot / n : 0
}

function Bar({ v, thin }: { v: number; thin?: boolean }) {
  const w = (Math.min(Math.abs(v), 1.5) / 1.5) * 50
  return <div className={`absolute transition-all duration-700 ease-out ${thin ? 'top-1/2 h-1/2' : 'top-0 h-1/2'}`} style={{ background: v >= 0 ? UP : DOWN, left: `${v >= 0 ? 50 : 50 - w}%`, width: `${w}%`, opacity: thin ? 0.55 : 1 }} />
}

export default function Compare({ route }: { route: Route }) {
  const { byId, meta, readout } = useData()
  const { level } = useLevel()
  const [a, setA] = useState(route.params.get('a') ?? MATCHUPS[0].a)
  const [b, setB] = useState(route.params.get('b') ?? MATCHUPS[0].b)
  const [line, setLine] = useState<LineId>('k562')
  const [hoverPw, setHoverPw] = useState<string | null>(null)
  const [gene, setGene] = useState<string | null>(null)
  const [flip, setFlip] = useState(0)
  useEffect(() => replaceParams({ a, b }), [a, b])
  const A = byId.get(a), B = byId.get(b)
  if (!A || !B) return <p>Pick two actions to compare.</p>
  const ra = A.r[line], rb = B.r[line]
  const sa = scaled(ra, meta), sb = scaled(rb, meta)
  const sim = similarity(sa, sb)
  const quiet = overall(ra, meta) < 0.25 || overall(rb, meta) < 0.25
  const match = quiet
    ? { title: 'One of them barely does anything', body: 'Hard to compare: at least one of these hardly changes this cell.' }
    : sim > 0.6 ? { title: 'Very similar effects', body: 'They push the cell in the same directions. They may work through the same machinery.' }
    : sim < -0.3 ? { title: 'Opposite effects', body: 'Where one turns a job up, the other tends to turn it down.' }
    : { title: 'Different effects', body: 'They change different parts of the cell.' }
  const kind = (x: Action) => verdict(x.r.k562, x.r.rpe1, meta).tone
  const gentler = [A, B].filter((x) => kind(x) === 'selective').map((x) => x.name)

  const genesOf = (r: typeof ra) => new Map(r.top.map(([i, z]) => [readout[i], z]))
  const ga = genesOf(ra), gb = genesOf(rb)
  const both = [...ga.keys()].filter((g) => gb.has(g))
  const onlyA = [...ga.keys()].filter((g) => !gb.has(g)).slice(0, 8)
  const onlyB = [...gb.keys()].filter((g) => !ga.has(g)).slice(0, 8)
  const swap = () => { setA(b); setB(a); setFlip((f) => f + 1) }

  const chip = (g: string, z?: number) => (
    <button key={g} onClick={() => setGene(g)} className="border border-ink/30 px-2 py-0.5 font-mono text-[11px] uppercase transition hover:bg-ink hover:text-paper"
      style={z !== undefined ? { color: z > 0 ? UP : DOWN } : undefined}>{g}</button>
  )

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <p className="eyebrow">Compare</p>
        <h1 className="text-4xl sm:text-6xl">Head to <Stain color="hematoxylin" strength={0.25}>head</Stain>.</h1>
        <div data-stagger className="flex flex-wrap gap-2">
          {MATCHUPS.map((m) => (
            <button key={m.label} onClick={() => { setA(m.a); setB(m.b); setLine(m.line ?? 'k562') }} aria-pressed={a === m.a && b === m.b}
              className={`border px-3 py-1.5 text-sm transition ${a === m.a && b === m.b ? 'border-ink bg-ink text-paper' : 'border-ink/30 hover:border-ink'}`}>
              {m.label}
            </button>
          ))}
        </div>
      </header>

      {/* The matchup */}
      <section className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-[1fr_auto_1fr]">
        {[{ x: A, set: setA, tag: 'A', col: 'border-l-accent' }, { x: B, set: setB, tag: 'B', col: 'border-l-iodine' }].map((s, i) => (
          <div key={s.tag} className={`space-y-3 border border-line border-l-4 bg-card p-5 ${s.col} ${i === 1 ? 'md:order-3' : ''}`}>
            <div key={s.x.id + flip} className="fade-in flex items-start justify-between gap-2">
              <div>
                <p className="eyebrow">{s.tag} · {s.x.type === 'drug' ? 'Drug' : 'Switch off'}</p>
                <p className="font-display text-4xl">{s.x.name}</p>
              </div>
              <Badge r={s.x.r[line]} />
            </div>
            <ActionSearch onPick={s.set} label={`Change ${s.tag}`} />
          </div>
        ))}
        <div className="flex items-center justify-center md:order-2">
          <button onClick={swap} className="btn size-12 rounded-full p-0 text-lg transition hover:rotate-180" aria-label="Swap A and B">⇄</button>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="radiogroup" aria-label="Which cell" className="flex">
          {(['k562', 'rpe1'] as LineId[]).map((l) => (
            <button key={l} role="radio" aria-checked={line === l} onClick={() => setLine(l)}
              className={`-ml-px border border-ink/60 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] transition first:ml-0 ${line === l ? 'bg-ink text-paper' : 'hover:bg-sunk'}`}>
              In the {LINE_LABEL[l].toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Verdict */}
      <section key={`${a}${b}${line}`} className="fade-in grid grid-cols-1 gap-6 border border-ink/70 bg-card p-6 md:grid-cols-[1.3fr_1fr]">
        <div className="space-y-2">
          <p className="eyebrow">How they compare</p>
          <h2 className="text-4xl">{match.title}</h2>
          <p className="text-ink/80">{match.body}</p>
        </div>
        <div className="space-y-3 self-center">
          <div aria-label="Similarity">
            <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.08em] text-muted"><span>Opposite</span><span>Same</span></div>
            <div className="relative mt-1 h-2 bg-sunk">
              <div className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 border-2 border-ink bg-paper transition-all duration-700 ease-out" style={{ left: `${((sim + 1) / 2) * 100}%` }} />
            </div>
          </div>
          <p className="text-sm text-ink/80">
            {gentler.length === 2 ? 'Both hit the cancer cell harder than the healthy one.'
              : gentler.length === 1 ? <><strong>{gentler[0]}</strong> is gentler on healthy cells.</>
              : 'Neither one spares the healthy cell.'}
          </p>
        </div>
      </section>

      {/* Live cells + linked rows */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]">
        <CellScene className="h-[60vh] sm:h-[50vh] lg:h-auto lg:min-h-[28rem]" labels={false}
          hover={hoverPw ? WHERE[hoverPw] : null}
          cells={[
            { key: `a-${line}`, variant: line === 'k562' ? 'cancer' : 'healthy', glow: organelleGlow(ra, meta), title: `A · ${A.name}` },
            { key: `b-${line}`, variant: line === 'k562' ? 'cancer' : 'healthy', glow: organelleGlow(rb, meta), title: `B · ${B.name}` },
          ]} />
        <div className="panel p-5">
          <div className="mb-3 flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-4 bg-ink" />A</span>
            <span className="flex items-center gap-1"><span className="inline-block h-1 w-4 bg-ink/50" />B</span>
            <span className="ml-auto">hover a row</span>
          </div>
          <ul className="space-y-1" onMouseLeave={() => setHoverPw(null)}>
            {meta.pathways.map((p, j) => {
              const active = hoverPw === p.id
              return (
                <li key={p.id} onMouseEnter={() => setHoverPw(p.id)} onFocus={() => setHoverPw(p.id)} tabIndex={0}
                  className={`cursor-default space-y-1 px-2 py-2 transition ${active ? 'bg-sunk' : ''}`}>
                  <div className="grid grid-cols-[7.5rem_1fr] items-center gap-3 text-sm">
                    <span>{pathwayName(p.id, p.label, level)}</span>
                    <span className="relative h-3 bg-sunk" aria-hidden="true">
                      <span className="absolute left-1/2 top-0 h-full w-px bg-ink/30" />
                      <Bar v={sa[j]} /><Bar v={sb[j]} thin />
                    </span>
                  </div>
                  <p className={`overflow-hidden text-xs text-muted transition-all duration-300 ${active ? 'max-h-10 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <strong className="text-ink">{A.name}</strong>: {valueWord(sa[j])} · <strong className="text-ink">{B.name}</strong>: {valueWord(sb[j])}
                  </p>
                  <span className="sr-only">{A.name} {valueWord(sa[j])}, {B.name} {valueWord(sb[j])}</span>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      {/* Genes */}
      <section className="space-y-4">
        <h2 className="text-3xl">Genes they change</h2>
        <div className="grid grid-cols-1 gap-px border border-line bg-line md:grid-cols-3">
          {[[`Only ${A.name}`, onlyA, ga], [`Both`, both, ga], [`Only ${B.name}`, onlyB, gb]].map(([title, list, map]) => (
            <div key={title as string} className="space-y-3 bg-paper p-4">
              <p className="eyebrow">{title as string}</p>
              <div className="flex flex-wrap gap-1.5">
                {(list as string[]).length ? (list as string[]).map((g) => chip(g, (map as Map<string, number>).get(g))) : <span className="text-sm text-faint">None</span>}
              </div>
            </div>
          ))}
        </div>
        {gene && <GeneInfo gene={gene} onClose={() => setGene(null)} />}
      </section>
    </div>
  )
}

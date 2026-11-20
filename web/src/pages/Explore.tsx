import { useEffect, useState } from 'react'
import { CellScene, ORGANELLES, STAIN, organelleGlow, type Organelle } from '../components/cell/CellScene'
import { MoleculeViewer } from '../components/molecule/MoleculeViewer'
import { PathwayNetwork } from '../components/pathways/PathwayNetwork'
import { ActionSearch } from '../components/playground/ActionSearch'
import { Badge } from '../components/playground/Badge'
import { GeneInfo } from '../components/playground/GeneInfo'
import { network, structures } from '../lib/content'
import { useData, type LineId } from '../lib/data'
import { describe } from '../lib/explain'
import type { Route } from '../lib/route'

type Zoom = 'cell' | 'organelle' | 'pathways' | 'gene' | 'molecule'
type View = 'cancer' | 'healthy' | 'both'
const ZOOMS: { id: Zoom; label: string }[] = [
  { id: 'cell', label: 'Cell' }, { id: 'organelle', label: 'Organelle' }, { id: 'pathways', label: 'Pathways' },
  { id: 'gene', label: 'Gene / protein' }, { id: 'molecule', label: '3D molecule' },
]
const LINE: Record<'cancer' | 'healthy', LineId> = { cancer: 'k562', healthy: 'rpe1' }
const NET_GENES = network.nodes.filter((n) => n.gene).map((n) => n.gene!)

const Swatch = ({ o }: { o: Organelle }) => <span aria-hidden="true" className="inline-block size-2.5 shrink-0" style={{ background: STAIN[o] }} />

export default function Explore({ route }: { route: Route }) {
  const { info, meta, byId } = useData()
  const startGene = route.params.get('focus')
  const [view, setView] = useState<View>('cancer')
  const [gene, setGene] = useState<string | null>(startGene && info[startGene] ? startGene : null)
  const [focus, setFocus] = useState<Organelle | null>(gene ? (info[gene].org as Organelle) : null)
  const [zoom, setZoom] = useState<Zoom>(gene ? 'gene' : 'cell')
  const [hover, setHover] = useState<Organelle | null>(null)
  const [hidden, setHidden] = useState<Set<Organelle>>(() => new Set())
  const [offId, setOffId] = useState<string | null>(null)
  const [touring, setTouring] = useState(false)

  const pickGene = (g: string) => {
    setTouring(false)
    setGene(g)
    setFocus((info[g]?.org as Organelle) ?? 'cytoplasm')
    setZoom('gene')
  }
  const pickOrganelle = (o: Organelle) => { setTouring(false); setFocus(o); setZoom('organelle') }
  const toggleLayer = (o: Organelle) => setHidden((h) => { const n = new Set(h); if (n.has(o)) n.delete(o); else n.add(o); return n })
  const visible = ORGANELLES.filter((o) => !hidden.has(o.id))
  const step = (dir: number) => {
    const i = visible.findIndex((o) => o.id === focus)
    const next = visible[(i + dir + visible.length) % visible.length]
    if (next) { setFocus(next.id); setZoom('organelle') }
  }

  // Tour: fly through each visible organelle in turn.
  useEffect(() => {
    if (!touring) return
    const id = setInterval(() => step(1), 3200)
    return () => clearInterval(id)
  })
  // Arrow keys step through organelles (unless typing).
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea')) return
      if (e.key === 'ArrowRight') { setTouring(false); step(1) }
      if (e.key === 'ArrowLeft') { setTouring(false); step(-1) }
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  })

  const off = offId ? byId.get(offId) : null
  const cellSpec = (v: 'cancer' | 'healthy') => ({
    key: v, variant: v, glow: off ? organelleGlow(off.r[LINE[v]], meta) : {},
    title: view === 'both' ? (v === 'cancer' ? 'Cancer' : 'Healthy-like') : undefined,
  })
  const cells = view === 'both' ? [cellSpec('cancer'), cellSpec('healthy')] : [cellSpec(view)]
  const org = ORGANELLES.find((o) => o.id === focus)
  const orgGenes = NET_GENES.filter((g) => info[g]?.org === focus)
  const structure = gene ? (structures.find((s) => s.gene === gene)?.pdb ?? (info[gene]?.acc ? `AF-${info[gene].acc}` : null)) : null
  const can = (z: Zoom) => z === 'cell' || z === 'pathways' || (z === 'organelle' && !!focus) || (z === 'gene' && !!gene) || (z === 'molecule' && !!structure)
  const surprise = () => pickGene(NET_GENES[Math.floor(Math.random() * NET_GENES.length)])
  const hovered = ORGANELLES.find((o) => o.id === hover)
  // Side by side: keep both cells in frame unless the user picked an organelle to fly into.
  const wide = view === 'both' && zoom !== 'organelle'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-4xl sm:text-5xl">Explore the cell</h1>
        <div role="radiogroup" aria-label="Which cell" className="flex">
          {([['cancer', 'Cancer'], ['healthy', 'Healthy-like'], ['both', 'Side by side']] as const).map(([v, label]) => (
            <button key={v} role="radio" aria-checked={view === v} onClick={() => setView(v)}
              className={`-ml-px border border-ink/60 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] transition first:ml-0 ${view === v ? 'bg-ink text-paper' : 'hover:bg-sunk'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <ActionSearch onPick={(id) => id.startsWith('g:') ? pickGene(id.slice(2)) : (window.location.hash = `#/play?a=${id}`)} label="Find a gene or protein" />
      <nav aria-label="Zoom level" className="flex flex-wrap items-center gap-1 font-mono text-[11px] uppercase tracking-[0.08em]">
        {ZOOMS.map((z, i) => (
          <span key={z.id} className="flex items-center gap-1">
            {i > 0 && <span className="text-faint">›</span>}
            <button disabled={!can(z.id)} onClick={() => { setZoom(z.id); if (z.id === 'cell') setFocus(null) }} aria-current={zoom === z.id ? 'page' : undefined}
              className={`px-2 py-1 transition ${zoom === z.id ? 'bg-ink text-paper' : 'text-muted hover:text-ink disabled:opacity-30'}`}>
              {z.label}
            </button>
          </span>
        ))}
      </nav>

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0">
          {zoom === 'pathways' ? (
            <PathwayNetwork meta={meta} onGene={pickGene} highlight={gene ? [gene] : []}
              r={off ? off.r[LINE[view === 'healthy' ? 'healthy' : 'cancer']] : null} />
          ) : zoom === 'molecule' && structure ? (
            <MoleculeViewer id={structure} />
          ) : (
            <CellScene key={wide ? 'wide' : view} cells={cells} focus={wide ? null : focus} onSelect={(o) => pickOrganelle(o)}
              hover={hover} onHover={setHover} hidden={hidden} className="h-[60vh] lg:h-[70vh]">
              {/* Layers, like map layers: hover to highlight, click to hide or show */}
              <fieldset className="absolute left-2 top-2 hidden w-48 border border-line bg-paper/85 p-2 backdrop-blur sm:block">
                <legend className="sr-only">Layers</legend>
                <p className="eyebrow mb-1 px-1">Layers</p>
                {ORGANELLES.map((o) => (
                  <label key={o.id} onMouseEnter={() => setHover(o.id)} onMouseLeave={() => setHover(null)}
                    className={`flex cursor-pointer items-center gap-2 px-1 py-0.5 text-xs transition ${hover === o.id ? 'bg-sunk' : ''} ${hidden.has(o.id) ? 'text-faint line-through' : ''}`}>
                    <input type="checkbox" className="accent-ink" checked={!hidden.has(o.id)} onChange={() => toggleLayer(o.id)} />
                    <Swatch o={o.id} />{o.label}
                  </label>
                ))}
              </fieldset>
              <div className="absolute right-2 top-2 flex flex-col items-end gap-2 sm:flex-row">
                <button className={touring ? 'btn-primary' : 'btn bg-paper/85'} onClick={() => setTouring(!touring)} aria-pressed={touring}>
                  {touring ? 'Stop tour' : 'Tour'}
                </button>
                <button className="btn bg-paper/85" onClick={surprise}>Surprise me</button>
              </div>
              {off && (
                <div className="fade-in absolute bottom-8 left-2 flex items-center gap-3 border border-ink bg-paper/90 px-3 py-2 text-sm backdrop-blur">
                  <span><strong>{off.name}</strong> is switched off</span>
                  <button className="font-mono text-[11px] uppercase underline" onClick={() => setOffId(null)}>Reset</button>
                </div>
              )}
              {hovered && !touring && (
                <p className="fade-in pointer-events-none absolute bottom-8 right-2 hidden max-w-[16rem] border border-line bg-paper/90 px-3 py-2 text-xs backdrop-blur sm:block">
                  <span className="font-medium">{hovered.label}.</span> {hovered.blurb}
                </p>
              )}
            </CellScene>
          )}
          <p className="mt-2 hidden font-mono text-[10px] uppercase tracking-[0.08em] text-faint lg:block">← → to step through · hover to highlight</p>
        </div>

        <aside key={zoom + (gene ?? '') + (focus ?? '')} className="space-y-3 page-enter">
          {zoom === 'cell' && (
            <section className="space-y-3 panel p-4 text-sm">
              <h2 className="text-2xl">{view === 'healthy' ? 'A healthy-like cell' : view === 'both' ? 'Two cells' : 'A cancer cell'}</h2>
              <p className="text-ink/80">{view === 'both' ? 'Cancer on the left, healthy-like on the right.' : meta.lines[LINE[view]].desc}</p>
              <ul className="divide-y divide-line border-y border-line">
                {ORGANELLES.map((o) => (
                  <li key={o.id}>
                    <button onClick={() => pickOrganelle(o.id)} onMouseEnter={() => setHover(o.id)} onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover(o.id)} onBlur={() => setHover(null)}
                      className="group flex w-full items-center gap-2 py-2 text-left transition hover:pl-1">
                      <Swatch o={o.id} /><span className="flex-1">{o.label}</span>
                      <span className="text-faint transition group-hover:translate-x-1 group-hover:text-ink">→</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {zoom === 'organelle' && org && (
            <section className="space-y-3 panel p-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-2xl"><Swatch o={org.id} />{org.label}</h2>
                <span className="flex shrink-0">
                  <button className="btn px-2" onClick={() => step(-1)} aria-label="Previous organelle">←</button>
                  <button className="btn -ml-px px-2" onClick={() => step(1)} aria-label="Next organelle">→</button>
                </span>
              </div>
              <p className="text-ink/80">{org.blurb}</p>
              {orgGenes.length > 0 && (
                <ul className="flex flex-wrap gap-2">{orgGenes.map((g) => <li key={g}><button className="btn" onClick={() => pickGene(g)}>{g}</button></li>)}</ul>
              )}
              <button className="btn w-full" onClick={() => setZoom('pathways')}>See the wiring →</button>
            </section>
          )}
          {zoom === 'pathways' && (
            <section className="space-y-2 panel p-4 text-sm">
              <h2 className="text-2xl">Signal pathways</h2>
              <p className="text-ink/80">Signals enter at the membrane and pass from protein to protein until they reach the nucleus. Click any protein.</p>
            </section>
          )}
          {(zoom === 'gene' || zoom === 'molecule') && gene && (
            <>
              <SwitchOff gene={gene} offId={offId} setOffId={setOffId} view={view} />
              <GeneInfo gene={gene} />
              {zoom === 'gene' && structure && <button className="btn w-full" onClick={() => setZoom('molecule')}>Zoom into the 3D molecule →</button>}
              {zoom === 'molecule' && <p className="text-sm text-ink/80">{structures.find((s) => s.pdb === structure)?.caption ?? 'AlphaFold-predicted structure, colored from the start of the chain (blue) to the end (red).'}</p>}
            </>
          )}
        </aside>
      </div>
    </div>
  )
}

/** Switch the selected gene off right here, and read what happened in each cell shown. */
function SwitchOff({ gene, offId, setOffId, view }: { gene: string; offId: string | null; setOffId: (id: string | null) => void; view: View }) {
  const { byId, meta } = useData()
  const a = byId.get(`g:${gene}`)
  if (!a) return null
  const on = offId === a.id
  const lines: ('cancer' | 'healthy')[] = view === 'both' ? ['cancer', 'healthy'] : [view]
  return (
    <section className={`space-y-3 border p-4 text-sm transition ${on ? 'border-ink bg-card' : 'border-line'}`}>
      <button onClick={() => setOffId(on ? null : a.id)} aria-pressed={on} className={`w-full ${on ? 'btn' : 'btn-primary'}`}>
        {on ? `Switch ${gene} back on` : `Switch ${gene} off here`}
      </button>
      {on && lines.map((v) => (
        <div key={v} className="fade-in space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">{v === 'cancer' ? 'Cancer cell' : 'Healthy-like cell'}</span>
            <Badge r={a.r[LINE[v]]} />
          </div>
          <ul className="text-ink/80">{describe(a.r[LINE[v]], meta).map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      ))}
      {on && <a className="block font-mono text-[11px] uppercase tracking-[0.08em] underline" href={`#/play?a=${a.id}`}>Full comparison →</a>}
    </section>
  )
}

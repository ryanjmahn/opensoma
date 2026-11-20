import { useEffect, useMemo, useState } from 'react'
import { CellScene, organelleGlow, PATHWAY_ORGANELLE, type Organelle } from '../components/cell/CellScene'
import { PathwayNetwork } from '../components/pathways/PathwayNetwork'
import { ActionSearch } from '../components/playground/ActionSearch'
import { DrugCard } from '../components/playground/DrugCard'
import { GeneInfo } from '../components/playground/GeneInfo'
import { ResultPanel, targetsOf } from '../components/playground/ResultPanel'
import { Timeline } from '../components/playground/Timeline'
import { LINES, useData, type LineId } from '../lib/data'
import { network } from '../lib/content'
import { combine } from '../lib/model'
import { useLevel } from '../lib/level'
import { Verdict } from '../components/playground/Verdict'
import { DOWN, UP } from '../components/playground/PathwayBars'
import { replaceParams, type Route } from '../lib/route'
import { useStack } from '../lib/useStack'

export function ActionChips({ stack, onRemove }: { stack: string[]; onRemove?: (id: string) => void }) {
  const { byId } = useData()
  return (
    <ul className="flex flex-wrap gap-2">
      {stack.map((id) => (
        <li key={id} className="flex items-center gap-1.5 border border-ink/60 px-2.5 py-1 font-mono text-xs uppercase tracking-[0.06em]">
          {id.startsWith('d:') ? 'Drug · ' : 'Off · '}{byId.get(id)?.name}
          {onRemove && <button onClick={() => onRemove(id)} aria-label={`Remove ${byId.get(id)?.name}`} className="ml-1 text-muted hover:text-ink">✕</button>}
        </li>
      ))}
    </ul>
  )
}

const STARTERS = [
  { id: 'd:imatinib', kind: 'Drug', title: 'Give imatinib', why: 'A real leukemia drug. Does it hit the cancer cell harder?' },
  { id: 'g:ATR', kind: 'Turn off a gene', title: 'Switch off ATR', why: "A DNA-damage alarm. Watch the healthy cell slam its brakes." },
  { id: 'g:MTOR', kind: 'Turn off a gene', title: 'Switch off mTOR', why: 'A master growth switch. Big effect, but on which cell?' },
  { id: 'g:CDK6', kind: 'Turn off a gene', title: 'Switch off CDK6', why: 'A division gene that blood cancer cells lean on.' },
]

function Step({ title }: { title: string }) {
  return (
    <h2 className="flex items-baseline gap-3 font-display text-2xl">
      {title}
    </h2>
  )
}

type Shelf = 'drugs' | 'cancer' | 'machinery'
const SHELVES: { id: Shelf; label: string }[] = [
  { id: 'drugs', label: 'Drugs' }, { id: 'cancer', label: 'Cancer genes' }, { id: 'machinery', label: 'Cell machinery' },
]

/** One-tap switches, grouped like a lab shelf: tap to add, tap again to remove. */
function ShelfPicker({ stack, onToggle, full }: { stack: string[]; onToggle: (id: string) => void; full: boolean }) {
  const { actions, info, byId } = useData()
  const [shelf, setShelf] = useState<Shelf>('drugs')
  const items = useMemo(() => {
    const genes = (list: string[]) => [...new Set(list)].map((g) => byId.get(`g:${g}`)).filter((a) => !!a)
    return {
      drugs: actions.filter((a) => a.type === 'drug'),
      cancer: genes(Object.keys(info).filter((g) => info[g].cancer)),
      machinery: genes(network.nodes.filter((n) => n.gene).map((n) => n.gene!)),
    }
  }, [actions, info, byId])
  return (
    <div className="border border-line">
      <div role="tablist" aria-label="Experiment shelf" className="flex overflow-x-auto border-b border-line">
        {SHELVES.map((t) => (
          <button key={t.id} role="tab" aria-selected={shelf === t.id} onClick={() => setShelf(t.id)}
            className={`whitespace-nowrap px-4 py-2 font-mono text-[11px] uppercase tracking-[0.08em] transition ${shelf === t.id ? 'bg-ink text-paper' : 'text-muted hover:text-ink'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div key={shelf} data-lenis-prevent className="fade-in flex max-h-40 flex-wrap gap-1.5 overflow-y-auto p-3">
        {items[shelf].map((a) => {
          const on = stack.includes(a.id)
          return (
            <button key={a.id} onClick={() => onToggle(a.id)} aria-pressed={on} disabled={!on && full}
              className={`border px-2 py-1 font-mono text-[11px] uppercase transition disabled:opacity-30 ${on ? 'border-ink bg-ink text-paper' : 'border-ink/25 hover:border-ink'}`}>
              {a.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const Swatch = ({ c }: { c: string }) => <span aria-hidden="true" className={`inline-block size-2.5 align-middle ${c}`} />

export default function Play({ route }: { route: Route }) {
  const { byId, meta } = useData()
  const { level } = useLevel()
  const initial = (route.params.get('a') ?? '').split(',').filter((x) => byId.has(x))
  const s = useStack(initial)
  const [gene, setGene] = useState<string | null>(null)
  const [netLine, setNetLine] = useState<LineId>('k562')
  const [hoverOrg, setHoverOrg] = useState<Organelle | null>(null)
  const [copied, setCopied] = useState(false)
  const toggle = (id: string) => (s.stack.includes(id) ? s.remove(id) : s.add(id))
  const surprise = () => {
    const pool = ['d:imatinib', 'g:MTOR', 'g:ATR', 'g:CDK6', 'g:HSPA5', 'd:bortezomib', 'g:SIRT7', 'g:PLK1', 'g:MYC', 'd:palbociclib', 'g:RPS6', 'g:BCR']
    s.reset([pool[Math.floor(Math.random() * pool.length)]])
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1600) } catch { /* clipboard blocked */ }
  }
  const rowHighlight = (id: string) => !!hoverOrg && PATHWAY_ORGANELLE[id] === hoverOrg
  const actions = s.stack.map((id) => byId.get(id)!)
  useEffect(() => replaceParams({ a: s.stack.join(',') || undefined }), [s.stack])

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="eyebrow">Playground</p>
        <h1 className="text-4xl sm:text-5xl">What happens if you poke a cell?</h1>
        <p className="max-w-3xl text-lg font-light text-ink/80">
          Switch off a gene or add a drug. We do it to a <Swatch c="bg-eosin" /> cancer cell and a <Swatch c="bg-teal" /> healthy-like cell, and show what changed.
        </p>
      </header>

      <section className="space-y-3">
        <Step title="Choose an experiment" />
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
          <ActionSearch onPick={s.add} autoFocus={!s.stack.length} />
          <div className="flex gap-2">
            <button className="btn" onClick={surprise}>Surprise me</button>
            <button className="btn" onClick={s.clear} disabled={!s.stack.length}>Start over</button>
          </div>
        </div>
        <ShelfPicker stack={s.stack} onToggle={toggle} full={s.full} />
        {!s.stack.length && (
          <div data-stagger className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {STARTERS.map((x) => (
              <button key={x.id} onClick={() => s.add(x.id)} className="group space-y-1 bg-paper p-4 text-left transition hover:bg-card">
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">{x.kind}</span>
                <span className="block font-display text-xl">{x.title} <span className="inline-block transition group-hover:translate-x-1">→</span></span>
                <span className="block text-sm text-muted">{x.why}</span>
              </button>
            ))}
          </div>
        )}
        {s.full && <p className="text-sm text-amber-800">That's the maximum of 4. Remove one to add another.</p>}
        {s.stack.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <ActionChips stack={s.stack} onRemove={s.remove} />
            <button className="ml-auto font-mono text-[11px] uppercase tracking-[0.08em] underline" onClick={copy}>{copied ? 'Link copied' : 'Copy link'}</button>
          </div>
        )}
        {s.history.length > 1 && <Timeline history={s.history} index={s.index} onJump={s.jump} />}
      </section>

      {actions.length > 0 && (
        <>
          <section className="space-y-3">
            <Step title="See the answer" />
            <Verdict actions={actions} />
          </section>

          <section className="space-y-3">
            <Step title="Look inside each cell" />
            <CellScene className="h-[70vh] sm:h-[40vh]" labels={false} hover={hoverOrg} onHover={setHoverOrg} onSelect={() => {}}
              cells={LINES.map((l) => ({ key: l, variant: meta.lines[l].role, glow: organelleGlow(combine(actions, l), meta), title: `${meta.lines[l].role === 'cancer' ? 'Cancer' : 'Healthy-like'} · ${meta.lines[l].name}` }))} />
            <p className="text-sm text-muted">
              Parts glow <span style={{ color: UP }}>orange</span> when more active and <span style={{ color: DOWN }}>blue</span> when less active. Point at a row below to see where it happens.
            </p>
            <div data-stagger className="grid gap-4 lg:grid-cols-2">
              {LINES.map((l) => (
                <ResultPanel key={l} actions={actions} line={l} onGene={setGene}
                  highlight={rowHighlight} onHover={(id) => setHoverOrg(id ? PATHWAY_ORGANELLE[id] : null)} />
              ))}
            </div>
            {gene && <GeneInfo gene={gene} onClose={() => setGene(null)} />}
            {actions.filter((a) => a.type === 'drug').map((a) => <DrugCard key={a.id} id={a.id.slice(2)} />)}
          </section>

          <details className="group border-t border-line pt-4" open={level === 'deep'}>
            <summary className="cursor-pointer list-none">
              <span className="eyebrow">Advanced</span>
              <span className="mt-1 block font-display text-2xl">See the wiring inside the cell <span className="inline-block transition group-open:rotate-90">→</span></span>
              <span className="block text-sm text-muted">How signals flow from the membrane to the nucleus, and which proteins your experiment touched.</span>
            </summary>
            <div className="mt-4 space-y-2">
              <div role="radiogroup" aria-label="Which cell" className="flex text-sm">
                {LINES.map((l) => (
                  <button key={l} role="radio" aria-checked={netLine === l} onClick={() => setNetLine(l)}
                    className={`-ml-px border border-ink/60 px-3 py-1 font-mono text-[11px] uppercase first:ml-0 ${netLine === l ? 'bg-ink text-paper' : ''}`}>{meta.lines[l].name}</button>
                ))}
              </div>
              <PathwayNetwork r={combine(actions, netLine)} meta={meta} targets={targetsOf(actions)} onGene={setGene} />
            </div>
          </details>
        </>
      )}
    </div>
  )
}

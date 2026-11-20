import { useEffect, useState } from 'react'
import { MoleculeViewer, type Look, type Paint, type ViewerApi } from '../components/molecule/MoleculeViewer'
import { Md } from '../components/ui/Md'
import { Stain } from '../components/ui/Stain'
import { drugs, structures } from '../lib/content'
import { useData } from '../lib/data'
import { href, type Route } from '../lib/route'

const LOOKS: [Look, string][] = [['cartoon', 'Ribbons'], ['surface', 'Surface'], ['atoms', 'Atoms']]
const PAINTS: [Paint, string][] = [['spectrum', 'Rainbow'], ['chain', 'By chain'], ['plain', 'Plain']]

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex">
      {options.map(([v, l]) => (
        <button key={v} role="radio" aria-checked={value === v} onClick={() => onChange(v)}
          className={`-ml-px border border-ink/60 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.06em] transition first:ml-0 ${value === v ? 'bg-ink text-paper' : 'bg-paper/80 hover:bg-sunk'}`}>
          {l}
        </button>
      ))}
    </div>
  )
}

const drugFor = (pdb: string) => drugs.find((d) => d.pdb === pdb)
const GROUPS = [
  { title: 'With a drug', list: structures.filter((s) => drugFor(s.pdb)) },
  { title: 'On their own', list: structures.filter((s) => !drugFor(s.pdb)) },
]
const ORDER = GROUPS.flatMap((g) => g.list.map((s) => s.pdb))

export default function Molecule({ route }: { route: Route }) {
  const { byId, info } = useData()
  const [id, setIdState] = useState(route.path[1] ?? '1IEP')
  const [look, setLook] = useState<Look>('cartoon')
  const [paint, setPaint] = useState<Paint>('spectrum')
  const [showDrug, setShowDrug] = useState(true)
  const [spin, setSpin] = useState(true)
  const [api, setApi] = useState<ViewerApi | null>(null)

  // Switch structures in place (no page reload), keeping the link shareable.
  const setId = (next: string) => { setIdState(next); history.replaceState(null, '', `#/molecule/${next}`) }
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea')) return
      const i = ORDER.indexOf(id)
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') setId(ORDER[(i + 1) % ORDER.length])
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') setId(ORDER[(i - 1 + ORDER.length) % ORDER.length])
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  })

  const s = structures.find((x) => x.pdb === id)
  const drug = drugFor(id)
  const afGene = id.startsWith('AF-') ? Object.entries(info).find(([, v]) => v.acc === id.slice(3))?.[0] : undefined
  const gene = s?.gene ?? afGene
  const save = () => {
    if (!api) return
    const a = document.createElement('a')
    a.href = api.png()
    a.download = `opensoma-${id}.png`
    a.click()
  }

  return (
    <div className="space-y-8">
      <header className="max-w-3xl space-y-3">
        <p className="eyebrow">Molecules</p>
        <h1 className="text-4xl sm:text-6xl">Drugs, <Stain color="iodine" strength={0.35}>up close</Stain>.</h1>
        <p className="text-lg font-light text-ink/80">Real 3D structures of proteins, many with a drug caught in the act of binding. Spin them, peel them, zoom into the pocket.</p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[17rem_1fr]">
        <nav aria-label="Structures" className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          {GROUPS.map((g) => (
            <div key={g.title} className="space-y-1">
              <p className="eyebrow mb-2">{g.title}</p>
              <ul data-stagger className="border-t border-line">
                {g.list.map((x) => (
                  <li key={x.pdb} className="border-b border-line">
                    <button onClick={() => setId(x.pdb)} aria-current={x.pdb === id ? 'true' : undefined}
                      className={`group flex w-full items-center justify-between gap-2 px-2 py-2 text-left text-sm transition ${x.pdb === id ? 'bg-ink text-paper' : 'hover:bg-sunk hover:pl-3'}`}>
                      <span>{x.title}</span>
                      <span className={`font-mono text-[10px] ${x.pdb === id ? 'text-paper/60' : 'text-faint'}`}>{x.pdb}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="hidden font-mono text-[10px] uppercase tracking-[0.08em] text-faint lg:block">← → to step through</p>
        </nav>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Segmented label="Look" value={look} options={LOOKS} onChange={setLook} />
            <Segmented label="Color" value={paint} options={PAINTS} onChange={setPaint} />
            <div className="flex flex-wrap gap-2 sm:ml-auto">
              <button className="btn" aria-pressed={showDrug} onClick={() => setShowDrug(!showDrug)} disabled={!api?.hasDrug}>{showDrug ? 'Hide drug' : 'Show drug'}</button>
              <button className="btn" onClick={() => { setSpin(false); api?.focusDrug() }} disabled={!api?.hasDrug || !showDrug}>Fly to the drug</button>
              <button className="btn" aria-pressed={spin} onClick={() => setSpin(!spin)}>{spin ? 'Stop spin' : 'Spin'}</button>
              <button className="btn" onClick={() => api?.reset()} disabled={!api}>Reset</button>
              <button className="btn" onClick={save} disabled={!api}>Save image</button>
            </div>
          </div>

          <MoleculeViewer id={id} look={look} paint={paint} showDrug={showDrug} spin={spin} onReady={setApi} className="h-[55vh] lg:h-[68vh]" />

          <section key={id} className="fade-in grid grid-cols-1 gap-6 border border-ink/70 bg-card p-6 md:grid-cols-[1.4fr_1fr]">
            <div className="space-y-3">
              <h2 className="text-3xl">{s?.title ?? `${afGene ?? 'Protein'}: AlphaFold prediction`}</h2>
              {s ? <Md text={`${s.caption} ${s.sources.map((x) => `[@${x}]`).join(' ')}`} className="text-ink/80" />
                : <p className="text-ink/80">A predicted structure from AlphaFold. Colors run from the start of the protein chain to the end.</p>}
              <p className="text-sm text-muted">Ribbons trace the protein's backbone. <span className="text-amber-800">Yellow sticks</span> are the drug or other small molecule.</p>
            </div>
            <div className="space-y-3">
              {drug && (
                <div className="space-y-1 border-l-4 border-l-iodine pl-3 text-sm">
                  <p className="font-display text-xl">{drug.name}</p>
                  <p className="text-ink/80">{drug.how}</p>
                  <p className="text-muted">{drug.status}</p>
                </div>
              )}
              <div className="flex flex-col gap-2">
                {drug && <a className="btn-primary" href={href('play', { a: `d:${drug.id}` })}>Try {drug.name} on cells →</a>}
                {gene && byId.has(`g:${gene}`) && <a className="btn" href={href('play', { a: `g:${gene}` })}>Switch off {gene} →</a>}
                {gene && info[gene] && <a className="btn" href={href('explore', { focus: gene })}>Find {gene} in the cell →</a>}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

import { useState, type ReactNode } from 'react'
import { DOWN, UP } from '../components/playground/PathwayBars'
import { Md } from '../components/ui/Md'
import { Specimen } from '../components/ui/Specimen'
import { Stain } from '../components/ui/Stain'
import { useData, type LineId } from '../lib/data'
import { PLAIN, pathwayName } from '../lib/explain'
import { useLevel } from '../lib/level'
import { scaled } from '../lib/model'

const STEPS = [
  {
    title: 'Switch a gene off',
    text: 'Scientists used **CRISPRi**, a tool that turns one chosen gene down without cutting DNA, on thousands of genes, one gene per cell. [@gilbert2014] [@replogle2022]',
    visual: 'cells',
  },
  {
    title: 'Read thousands of genes',
    text: 'Then they measured how active about 8,000 genes were in every single cell (**Perturb-seq**). For each switched-off gene we average all the cells that got it, and compare them with untouched cells.',
    visual: 'genes',
  },
  {
    title: 'Summarize into jobs',
    text: 'Thousands of numbers are hard to read, so we group genes into a few of the cell\'s main jobs using **Reactome**, a free, expert-curated map of what genes do. [@reactome] A job\'s score is the average change of its genes.',
    visual: 'jobs',
  },
  {
    title: 'Fill the gaps',
    text: 'Some genes were only switched off in one of the two cells. For those, we **borrow** the measured result from the other cell and scale it down, then label it ◐ Predicted with an honest confidence.',
    visual: 'predict',
  },
]

function StepVisual({ kind }: { kind: string }) {
  const { meta, level } = { ...useData(), ...useLevel() }
  if (kind === 'cells')
    return (
      <div className="flex flex-wrap gap-3" aria-hidden="true">
        {['a', 'b', 'c', 'd', 'e', 'f'].map((s, i) => (
          <div key={s} className={`transition duration-700 ${i === 2 ? 'opacity-100' : 'opacity-60'}`} style={{ transitionDelay: `${i * 80}ms` }}>
            <Specimen id={`cell-${s}`} done={i === 2} size="size-14" />
          </div>
        ))}
      </div>
    )
  if (kind === 'genes')
    return (
      <div className="grid grid-cols-[repeat(24,minmax(0,1fr))] gap-0.5" aria-hidden="true">
        {Array.from({ length: 24 * 6 }, (_, i) => {
          const v = Math.sin(i * 12.9898) * 43758.5453
          const x = (v - Math.floor(v)) * 2 - 1
          return <span key={i} className="aspect-square" style={{ background: Math.abs(x) < 0.55 ? '#e8e2d6' : x > 0 ? UP : DOWN, opacity: Math.abs(x) }} />
        })}
      </div>
    )
  if (kind === 'jobs')
    return (
      <ul className="flex flex-wrap gap-2">
        {meta.pathways.map((p) => (
          <li key={p.id} className="border border-ink/40 px-2 py-1 text-sm" title={`Reactome: ${p.reactome.join(', ')}`}>{pathwayName(p.id, p.label, level)}</li>
        ))}
      </ul>
    )
  return (
    <div className="flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.08em]" aria-hidden="true">
      <span className="border border-emerald-800/60 px-2 py-1 text-emerald-900">● Measured in one cell</span>
      <span className="text-xl">→</span>
      <span className="border border-amber-800/60 px-2 py-1 text-amber-900">◐ Predicted in the other</span>
    </div>
  )
}

function Bars({ real, pred, labels }: { real: number[]; pred: number[]; labels: string[] }) {
  const bar = (v: number, thin: boolean) => {
    const w = (Math.min(Math.abs(v), 1.5) / 1.5) * 50
    return <span className={`absolute transition-all duration-700 ease-out ${thin ? 'top-1/2 h-1/2 opacity-60' : 'top-0 h-1/2'}`} style={{ background: v >= 0 ? UP : DOWN, left: `${v >= 0 ? 50 : 50 - w}%`, width: `${w}%` }} />
  }
  return (
    <ul className="space-y-2.5">
      {labels.map((l, j) => (
        <li key={l} className="grid grid-cols-[7.5rem_1fr] items-center gap-3 text-sm">
          <span>{l}</span>
          <span className="relative h-3 bg-sunk" aria-label={`${l}: real ${real[j].toFixed(2)}, predicted ${pred[j].toFixed(2)}`}>
            <span className="absolute left-1/2 top-0 h-full w-px bg-ink/30" />
            {bar(real[j], false)}{bar(pred[j], true)}
          </span>
        </li>
      ))}
    </ul>
  )
}

const PRESETS = ['g:SIRT7', 'g:MTOR', 'g:RPS6', 'g:CHEK1', 'g:PLK1']
const CELL: Record<LineId, string> = { k562: 'cancer cell', rpe1: 'healthy-like cell' }

/** Pick a gene measured in both cells; compare the model's guess with the real measurement. */
function TestTheModel() {
  const { byId, meta } = useData()
  const { level } = useLevel()
  const [id, setId] = useState(PRESETS[0])
  const [dst, setDst] = useState<LineId>('rpe1')
  const a = byId.get(id)!
  const v = meta.validation[dst]
  const real = scaled(a.r[dst], meta)
  const pred = scaled(a.r[v.from], meta).map((x) => x * v.beta)
  const sim = (() => {
    const d = real.reduce((s, x, i) => s + x * pred[i], 0)
    const n = Math.hypot(...real) * Math.hypot(...pred)
    return n ? d / n : 0
  })()
  const ratio = Math.hypot(...pred) / (Math.hypot(...real) || 1)
  const result = sim > 0.6 && ratio > 0.3 ? ['Good match', 'border-l-teal', 'The guess points the same way as reality, and is about the right size.']
    : sim > 0.6 ? ['Right direction, far too weak', 'border-l-iodine', 'The guess points the right way but badly underestimates how much the cell changed.']
    : sim > 0.2 ? ['Partly right', 'border-l-iodine', 'Some jobs move the right way, others don\'t.']
    : ['Missed it', 'border-l-eosin', 'The two cells reacted differently, so borrowing from one to guess the other fails here.']
  return (
    <section className="space-y-6">
      <div className="max-w-3xl space-y-2">
        <p className="eyebrow">Test the model yourself</p>
        <h2 className="text-4xl sm:text-5xl">Can it guess a result it has never seen?</h2>
        <p className="text-ink/80">These genes were switched off in <em>both</em> cells, so we know the real answer. Hide one cell's result, let the model guess it from the other cell, and compare.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button key={p} onClick={() => setId(p)} aria-pressed={id === p}
              className={`border px-3 py-1.5 font-mono text-[12px] uppercase transition ${id === p ? 'border-ink bg-ink text-paper' : 'border-ink/30 hover:border-ink'}`}>
              {byId.get(p)?.name}
            </button>
          ))}
        </div>
        <div role="radiogroup" aria-label="Which cell to guess" className="flex sm:ml-auto">
          {(['rpe1', 'k562'] as LineId[]).map((l) => (
            <button key={l} role="radio" aria-checked={dst === l} onClick={() => setDst(l)}
              className={`-ml-px border border-ink/60 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] first:ml-0 ${dst === l ? 'bg-ink text-paper' : 'hover:bg-sunk'}`}>
              Guess the {CELL[l]}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="panel p-5">
          <div className="mb-3 flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-4 bg-ink" />Real</span>
            <span className="flex items-center gap-1"><span className="inline-block h-1 w-4 bg-ink/50" />Model's guess</span>
          </div>
          <Bars real={real} pred={pred} labels={meta.pathways.map((p) => pathwayName(p.id, p.label, level))} />
        </div>
        <div key={id + dst} className={`fade-in space-y-2 self-start border border-line border-l-4 bg-card p-5 ${result[1]}`}>
          <p className="eyebrow">Switching off {a.name} · guessing the {CELL[dst]}</p>
          <h3 className="font-display text-3xl">{result[0]}</h3>
          <p className="text-ink/80">{result[2]}</p>
        </div>
      </div>
    </section>
  )
}

const STRENGTH = ['Weakest', 'Weak', 'Medium', 'Strong', 'Strongest']

function Accuracy() {
  const { meta } = useData()
  const [dst, setDst] = useState<LineId>('rpe1')
  const [hover, setHover] = useState<number | null>(null)
  const v = meta.validation[dst]
  const max = 0.5
  return (
    <section className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.4fr]">
      <div className="space-y-3">
        <p className="eyebrow">How good is it overall?</p>
        <h2 className="text-4xl">Better than guessing. Not by much.</h2>
        <p className="text-ink/80">
          Across about {v.n_shared.toLocaleString()} genes switched off in both cells, the model's guesses only loosely match reality. It does better when the
          switched-off gene has a <strong>strong</strong> effect. That's why every guess is labeled ◐ Predicted, usually with low confidence.
        </p>
        <div role="radiogroup" aria-label="Direction" className="flex">
          {(['rpe1', 'k562'] as LineId[]).map((l) => (
            <button key={l} role="radio" aria-checked={dst === l} onClick={() => setDst(l)}
              className={`-ml-px border border-ink/60 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] first:ml-0 ${dst === l ? 'bg-ink text-paper' : 'hover:bg-sunk'}`}>
              Guessing the {CELL[l]}
            </button>
          ))}
        </div>
      </div>
      <figure className="panel p-5">
        <div className="relative flex h-64 items-end gap-3 border-b border-l border-ink/40 px-3" onMouseLeave={() => setHover(null)}>
          {/* 'random guessing' baseline */}
          <div className="absolute inset-x-0 border-t border-dashed border-eosin" style={{ bottom: `${(v.shuffled_r / max) * 100}%` }}>
            <span className="absolute -top-5 right-1 font-mono text-[10px] uppercase tracking-[0.08em] text-eosin">Random guessing</span>
          </div>
          {v.calib.map((c, i) => (
            <button key={i} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} aria-label={`${STRENGTH[i]} knockdowns: match ${c.toFixed(2)}`}
              className="relative flex-1 bg-accent/80 transition-all duration-700 ease-out hover:bg-accent" style={{ height: `${(Math.max(c, 0) / max) * 100}%` }} />
          ))}
        </div>
        <div className="mt-2 flex gap-3 px-3 font-mono text-[10px] uppercase tracking-[0.06em] text-muted">
          {STRENGTH.map((s) => <span key={s} className="flex-1 text-center">{s}</span>)}
        </div>
        <figcaption className="mt-4 min-h-12 text-sm text-ink/80">
          {hover === null
            ? 'Bars: how closely the guess matches reality, grouped by how strong the knockdown is. Higher is better. Hover a bar.'
            : `${STRENGTH[hover]} knockdowns: the guess matches reality ${v.calib[hover] < 0.1 ? 'barely at all' : v.calib[hover] < 0.2 ? 'weakly' : 'somewhat'}, compared with ${v.shuffled_r < 0.05 ? 'almost zero' : 'very little'} for random guessing.`}
        </figcaption>
      </figure>
    </section>
  )
}

const WHY: Record<string, string> = {
  division: 'The two cells often react in opposite directions here: the healthy-like cell has a working p53 brake that stops division, while the leukemia cell\'s p53 is broken.',
  dna_repair: 'Like dividing, this depends on the p53 brake, which only one of the two cells has.',
  metabolism: 'Energy-making machinery behaves similarly in both cells, so guesses transfer well.',
  translation: 'Protein-making machinery is shared by all cells, so guesses transfer fairly well.',
  growth: 'Growth signals transfer moderately well.',
  stress: 'The stress alarm is shared, but its strength differs between cells.',
  death: 'Self-destruct programs differ a lot between a blood cell and a retina cell.',
}

function WhereWrong() {
  const { meta } = useData()
  const { level } = useLevel()
  const [sel, setSel] = useState<string>('division')
  const v = meta.validation.rpe1.pathway_r
  return (
    <section className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.4fr]">
      <div className="space-y-3">
        <p className="eyebrow">Where it gets things wrong</p>
        <h2 className="text-4xl">Some jobs <Stain color="eosin" strength={0.3}>don't transfer</Stain>.</h2>
        <p className="text-ink/80">Right: how well each job's change in one cell predicts the other. Bars to the left mean the two cells tend to react in <em>opposite</em> ways. Pick one.</p>
      </div>
      <div className="panel space-y-4 p-5">
        <ul className="space-y-2">
          {meta.pathways.map((p) => {
            const r = v[p.id]
            const w = Math.min(Math.abs(r), 1) * 50
            return (
              <li key={p.id}>
                <button onClick={() => setSel(p.id)} onMouseEnter={() => setSel(p.id)} aria-pressed={sel === p.id}
                  className={`grid w-full grid-cols-[7.5rem_1fr] items-center gap-3 px-2 py-1.5 text-left text-sm transition ${sel === p.id ? 'bg-sunk' : ''}`}>
                  <span>{pathwayName(p.id, p.label, level)}</span>
                  <span className="relative h-3 bg-sunk">
                    <span className="absolute left-1/2 top-0 h-full w-px bg-ink/40" />
                    <span className={`absolute top-0 h-full ${r < 0 ? 'bg-eosin' : 'bg-teal'}`} style={{ left: r < 0 ? `${50 - w}%` : '50%', width: `${w}%` }} />
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        <div className="flex justify-between px-2 font-mono text-[10px] uppercase tracking-[0.08em] text-muted"><span>◀ opposite</span><span>same ▶</span></div>
        <p key={sel} className="fade-in border-l-2 border-ink/40 pl-3 text-sm text-ink/80">
          <strong>{PLAIN[sel]?.name}:</strong> {WHY[sel]}
        </p>
      </div>
    </section>
  )
}

function Fold({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group border-b border-line py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-2xl">
        {title}<span className="text-xl transition group-open:rotate-45" aria-hidden="true">+</span>
      </summary>
      <div className="pt-3 text-ink/80">{children}</div>
    </details>
  )
}

export default function How() {
  const { meta, actions } = useData()
  const [step, setStep] = useState(0)
  const nDrugs = actions.filter((a) => a.type === 'drug').length
  return (
    <div className="space-y-20">
      <header className="max-w-3xl space-y-3">
        <p className="eyebrow">How it works</p>
        <h1 className="text-4xl sm:text-6xl">Real experiments, honest <Stain color="teal" strength={0.3}>guesses</Stain>.</h1>
        <p className="text-lg font-light text-ink/80">What's measured, what's predicted, and how much to trust each.</p>
      </header>

      <section className="space-y-6">
        <ol className="grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-4" aria-label="How a result is made">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <button onClick={() => setStep(i)} onMouseEnter={() => setStep(i)} aria-pressed={step === i}
                className={`flex h-full w-full flex-col gap-2 p-4 text-left transition duration-300 ${step === i ? 'bg-ink text-paper' : 'bg-paper hover:bg-card'}`}>
                <span className={`h-0.5 w-8 transition-all duration-500 ${step === i ? 'w-full bg-paper' : 'bg-ink/30'}`} aria-hidden="true" />
                <span className="font-display text-xl leading-tight">{s.title}</span>
              </button>
            </li>
          ))}
        </ol>
        <div key={step} className="fade-in grid grid-cols-1 gap-8 border border-ink/70 bg-card p-6 md:grid-cols-[1fr_1fr]">
          <Md text={STEPS[step].text} className="text-lg text-ink/80" />
          <div className="self-center"><StepVisual kind={STEPS[step].visual} /></div>
        </div>
      </section>

      <TestTheModel />
      <Accuracy />
      <WhereWrong />

      <section className="space-y-2">
        <p className="eyebrow">The details</p>
        <Fold title="The two cells">
          <Md text={`**${meta.lines.k562.name}** (cancer): ${meta.lines.k562.desc} [@lozzio1975]

**${meta.lines.rpe1.name}** (healthy-like): ${meta.lines.rpe1.desc} [@bodnar1998]

These two differ in **more than cancer vs. healthy**: one is a blood cell, the other a retina cell, and only the healthy-like one has a working p53 brake. [@law1993]`} />
        </Fold>
        <Fold title={`Drugs (${nDrugs})`}>
          <Md text="No drugs were tested in these experiments. Each drug is approximated as switching off its target gene(s), always labeled ◐ Predicted, and every drug card says what that approximation misses." />
        </Fold>
        <Fold title="Combinations">
          <Md text="When you combine actions, we add their effects together. Real combinations can be stronger or weaker than the sum, so combinations are always ◐ Predicted with lower confidence." />
        </Fold>
        <Fold title="Why not a big AI model?">
          <Md text="Large “virtual cell” models such as the Arc Institute's **State** can predict more broadly. [@state2025] We didn't use it here: its weights are licensed for non-commercial use only and it needs a GPU. A simple model we can test openly is a more honest start." />
        </Fold>
        <Fold title="mRNA is not protein">
          <Md text="These experiments measure **mRNA**, the working copies of genes. A drug can switch a protein off without changing its mRNA at all, so the colors show gene activity, not protein activity." />
        </Fold>
        <Fold title="3D cell and structures">
          <Md text="The 3D cell is an illustration, not to scale. Protein structures come from the RCSB PDB [@pdb] and AlphaFold [@alphafold], drawn with 3Dmol.js. [@3dmol] Gene descriptions come from UniProt. [@uniprot]" />
        </Fold>
        <Fold title="Data and licenses">
          <Md text={`Perturb-seq data by Replogle et al. 2022, CC BY 4.0. [@replogle2022data] Pathways from Reactome (CC BY 4.0). Every file is rebuilt by an open-source pipeline. Data version ${meta.generated}. [All sources](#/sources)`} />
        </Fold>
      </section>
    </div>
  )
}

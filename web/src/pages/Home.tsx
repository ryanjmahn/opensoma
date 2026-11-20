import { useMemo, useRef, useState } from 'react'
import { CellScene, organelleGlow, type Glow } from '../components/cell/CellScene'
import { JourneyScene } from '../components/cell/JourneyScene'
import { DOWN, UP } from '../components/playground/PathwayBars'
import { Verdict } from '../components/playground/Verdict'
import { Blot, Stain } from '../components/ui/Stain'
import { useData } from '../lib/data'
import { describe } from '../lib/explain'
import { Reveal, reducedMotion, useScrollProgress } from '../lib/motion'

const STAGES = 5
const POKES = ['g:MTOR', 'g:ATR', 'g:HSPA5', 'g:PLK1', 'g:RPS6', 'd:bortezomib', 'g:SIRT7', 'g:MYC']
const TRY = [
  { id: 'd:imatinib', label: 'Give imatinib', note: 'A real leukemia drug' },
  { id: 'g:ATR', label: 'Switch off ATR', note: 'A DNA-damage alarm' },
  { id: 'g:MTOR', label: 'Switch off mTOR', note: 'A master growth switch' },
  { id: 'g:CDK6', label: 'Switch off CDK6', note: 'A division gene' },
]
const PATHS = [
  { to: '#/explore', title: 'Explore', text: 'Fly from the whole cell down to a single protein, and see a drug sitting in its pocket.', color: 'bg-accent' },
  { to: '#/play', title: 'Poke it', text: 'Switch off any of 2,400 genes, or add a drug, and compare a cancer cell with a healthy one.', color: 'bg-eosin' },
  { to: '#/learn', title: 'Learn', text: 'Guided tours of how cancer works and how medicines are discovered, with quizzes.', color: 'bg-teal' },
  { to: '#/missions', title: 'Missions', text: 'Find a drug target, calm the cell down, and do no harm to healthy cells.', color: 'bg-iodine' },
]

function Words({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <span className="rise">
      {text.split(' ').map((w, i) => (
        <span key={i} style={{ animationDelay: `${delay + i * 90}ms` }}>{w}&nbsp;</span>
      ))}
    </span>
  )
}

const Dot = ({ c }: { c: string }) => <span aria-hidden="true" className={`inline-block size-2 align-middle ${c}`} />

/** Pinned scroll story: the cell stays put while the camera flies in as you scroll. */
function Journey() {
  const { byId, meta } = useData()
  const section = useRef<HTMLElement>(null)
  const progress = useRef(0)
  const panels = useRef<(HTMLDivElement | null)[]>([])
  const [stage, setStage] = useState(0)
  const [poke, setPoke] = useState<{ id: string; n: number } | null>(null)
  const reduce = reducedMotion()

  useScrollProgress(section, (p) => {
    progress.current = p
    const t = p * (STAGES - 1)
    panels.current.forEach((el, i) => {
      if (!el) return
      const d = t - i
      el.style.opacity = String(Math.max(0, 1 - Math.abs(d) * 1.6))
      el.style.transform = `translateY(${-d * 70}px)`
      el.style.pointerEvents = Math.abs(d) < 0.4 ? 'auto' : 'none'
    })
    const s = Math.round(t)
    setStage((old) => (old === s ? old : s))
  })

  const pokeAction = poke ? byId.get(poke.id) : null
  const glow: Glow = useMemo(() => {
    if (pokeAction) return organelleGlow(pokeAction.r.k562, meta)
    if (stage >= 3) return organelleGlow(byId.get('g:MTOR')?.r.k562, meta)
    return {}
  }, [pokeAction, stage, byId, meta])
  const doPoke = () => setPoke((p) => ({ id: POKES[((p?.n ?? -1) + 1) % POKES.length], n: (p?.n ?? -1) + 1 }))

  const panel = 'max-w-md space-y-4 border border-line bg-paper/85 p-5 backdrop-blur-sm sm:p-6 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none'
  const PANELS = [
    <div key="hero" className={panel}>
      <p className="eyebrow">An open-source virtual cell</p>
      <h1 className="text-[2.9rem] sm:text-7xl">
        <Words text="Google Earth" />
        <br />
        <Words text="for a" delay={250} />
        <span className="rise"><span style={{ animationDelay: '450ms' }}><Stain color="eosin">cell</Stain></span></span>
      </h1>
      <p className="text-lg font-light leading-relaxed text-ink/80">
        Zoom in. Switch off a gene. Add a drug. Watch real cells respond, and learn how cancer grows and how medicines are found.
      </p>
      <div className="flex flex-wrap gap-3">
        <a href="#/explore" className="flex items-stretch"><span className="btn-primary">Start exploring</span><span className="btn-primary -ml-px" aria-hidden="true">→</span></a>
        <a href="#/story/what-is-cancer" className="flex items-stretch"><span className="btn">What is cancer</span><span className="btn -ml-px" aria-hidden="true">→</span></a>
      </div>
      <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">Scroll to dive in ↓ · click the cell to poke it</p>
    </div>,
    <div key="city" className={panel}>
      <p className="eyebrow">The cell</p>
      <h2 className="text-4xl sm:text-5xl">Every cell is a tiny, busy city.</h2>
      <p className="text-ink/80">Your body has about 30 trillion of them. Each has power plants (<Dot c="bg-eosin" /> mitochondria), factories (<Dot c="bg-teal" /> the ER), a post office (<Dot c="bg-iodine" /> Golgi) and a control center.</p>
    </div>,
    <div key="nucleus" className={panel}>
      <p className="eyebrow">The nucleus</p>
      <h2 className="text-4xl sm:text-5xl">At the center: the instruction book.</h2>
      <p className="text-ink/80">The <Dot c="bg-accent" /> nucleus holds DNA: about 20,000 genes, each an instruction for one job. Cancer starts when some of those instructions break.</p>
    </div>,
    <div key="poke" className={panel}>
      <p className="eyebrow">Switch one off</p>
      <h2 className="text-4xl sm:text-5xl">Now, switch one gene off.</h2>
      <p className="text-ink/80">This is real lab data: we switched off <strong>mTOR</strong>, a master growth switch, in leukemia cells. Parts of the cell turn <span style={{ color: DOWN }}>blue</span> (less active) or <span style={{ color: UP }}>orange</span> (more active).</p>
    </div>,
    <div key="question" className={panel}>
      <p className="eyebrow">The real question</p>
      <h2 className="text-4xl sm:text-5xl">Does it hurt <Stain color="teal" strength={0.3}>healthy cells</Stain> too?</h2>
      <p className="text-ink/80">That's how drug hunters think: find something the cancer needs more than healthy cells do. Try it yourself, right below.</p>
    </div>,
  ]

  return (
    <section ref={section} className="relative -mx-4 -mt-6 sm:-mt-8" style={{ height: `${STAGES * 100}vh` }} aria-label="Scroll story: inside a cell">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <Blot color="eosin" className="right-[8%] top-[12%] size-80" opacity={0.1} />
        <Blot color="teal" className="bottom-[8%] right-[30%] size-96" opacity={0.08} />
        <div className="absolute inset-0 lg:left-[34%] lg:[mask-image:linear-gradient(to_right,transparent,black_18%)]">
          <JourneyScene progress={progress} glow={glow} onPoke={doPoke} eventSource={section} reduce={reduce} />
        </div>
        {pokeAction && (
          <div key={poke!.n} className="absolute right-4 top-20 max-w-xs border border-ink/70 bg-paper/90 p-4 text-sm backdrop-blur sm:right-8 lg:bottom-8 lg:top-auto">
            <p className="eyebrow mb-1">You poked it</p>
            <p><strong>{pokeAction.type === 'drug' ? `Gave ${pokeAction.name}` : `Switched off ${pokeAction.name}`}.</strong> {describe(pokeAction.r.k562, meta)[0]}</p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">Click again for another</p>
          </div>
        )}
        <div className="absolute bottom-0 left-0 h-0.5 bg-ink/80" style={{ width: 'calc(var(--p, 0) * 100%)' }} aria-hidden="true" />
      </div>
      <div className="pointer-events-none absolute inset-0">
        <div className="sticky top-0 mx-auto flex h-[100svh] max-w-7xl items-end px-4 pb-10 lg:items-center lg:pb-0">
          {PANELS.map((p, i) => (
            <div key={i} ref={(el) => { panels.current[i] = el }} className="absolute bottom-10 left-4 right-4 will-change-transform sm:right-auto lg:bottom-auto"
              style={{ opacity: i === 0 ? 1 : 0, pointerEvents: i === 0 ? 'auto' : 'none' }}>
              {p}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function TryIt() {
  const { byId, meta } = useData()
  const [id, setId] = useState(TRY[0].id)
  const a = byId.get(id)!
  return (
    <section className="space-y-6">
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="eyebrow">Try it right here</p>
          <h2 className="text-4xl sm:text-6xl">Poke a cancer cell<br />and a healthy one.</h2>
        </div>
        <a href={`#/play?a=${id}`} className="btn">Open the full playground →</a>
      </Reveal>
      <Reveal delay={100} className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
        {TRY.map((t) => (
          <button key={t.id} onClick={() => setId(t.id)} aria-pressed={id === t.id}
            className={`p-4 text-left transition duration-300 ${id === t.id ? 'bg-ink text-paper' : 'bg-paper hover:bg-card'}`}>
            <span className={`block font-mono text-[10px] uppercase tracking-[0.1em] ${id === t.id ? 'text-paper/70' : 'text-muted'}`}>{t.note}</span>
            <span className="mt-1 block font-display text-xl">{t.label}</span>
          </button>
        ))}
      </Reveal>
      <Reveal delay={200}>
        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <CellScene className="h-[70vh] sm:h-[46vh]" labels={false}
            cells={[
              { key: 'k562', variant: 'cancer', glow: organelleGlow(a.r.k562, meta), title: 'Cancer cell' },
              { key: 'rpe1', variant: 'healthy', glow: organelleGlow(a.r.rpe1, meta), title: 'Healthy-like cell' },
            ]} />
          <div key={id} className="fade-in"><Verdict actions={[a]} stacked /></div>
        </div>
      </Reveal>
    </section>
  )
}

function Numbers() {
  return (
    <Reveal className="border-t border-line pt-12">
      <p className="max-w-4xl font-display text-3xl font-light leading-snug sm:text-4xl">
        Not a cartoon. Every <span className="text-emerald-800">● measured</span> result comes from a real lab experiment, and every{' '}
        <span className="text-amber-800">◐ predicted</span> one says how sure we are.
      </p>
    </Reveal>
  )
}

function GeneBand() {
  const { readout } = useData()
  const rows = useMemo(() => {
    const pick = (seed: number) => Array.from({ length: 40 }, (_, i) => readout[(i * 977 + seed * 131) % readout.length])
    return [pick(1), pick(7)]
  }, [readout])
  return (
    <div className="-mx-4 space-y-2 overflow-hidden border-y border-line py-5 font-mono text-sm uppercase tracking-[0.12em] text-faint" aria-hidden="true">
      {rows.map((r, i) => (
        <div key={i} className={`marquee ${i ? 'reverse' : ''}`} style={{ ['--dur' as string]: `${70 + i * 15}s` }}>
          {[...r, ...r].map((g, j) => <span key={j} className="px-4 transition hover:text-ink">{g}</span>)}
        </div>
      ))}
    </div>
  )
}

/** Vertical scroll drives a sideways track of cards. */
function Paths() {
  const section = useRef<HTMLElement>(null)
  const track = useRef<HTMLDivElement>(null)
  useScrollProgress(section, (p) => {
    const t = track.current
    if (t) t.style.transform = `translateX(${-p * Math.max(0, t.scrollWidth - window.innerWidth + 32)}px)`
  })
  return (
    <section ref={section} className="relative -mx-4" style={{ height: '260vh' }} aria-label="Four ways in">
      <div className="sticky top-0 flex h-[100svh] flex-col justify-center gap-8 overflow-hidden">
        <div className="mx-auto w-full max-w-7xl px-4">
          <p className="eyebrow">Four ways in</p>
          <h2 className="mt-2 text-4xl sm:text-6xl">Pick your path.</h2>
        </div>
        <div ref={track} className="flex gap-6 px-4 will-change-transform">
          {PATHS.map((p) => (
            <a key={p.to} href={p.to} className="group relative flex h-[52vh] w-[82vw] shrink-0 flex-col justify-end overflow-hidden border border-ink/70 bg-card p-7 transition duration-500 hover:-translate-y-2 sm:w-[46vw] lg:w-[34vw]">
              <span className={`absolute -right-8 -top-8 size-48 rounded-full opacity-25 transition duration-700 group-hover:scale-150 ${p.color}`} style={{ filter: 'url(#blot)' }} aria-hidden="true" />
              <div className="space-y-3">
                <h3 className="font-display text-5xl font-light">{p.title} <span className="inline-block transition duration-500 group-hover:translate-x-2">→</span></h3>
                <p className="max-w-sm text-muted">{p.text}</p>
              </div>
            </a>
          ))}
        </div>
        <div className="mx-auto w-full max-w-7xl px-4">
          <div className="h-px bg-line"><div className="h-px bg-ink" style={{ width: 'calc(var(--p, 0) * 100%)' }} /></div>
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  return (
    <div className="space-y-24 sm:space-y-32" data-no-reveal>
      <Journey />
      <TryIt />
      <Numbers />
      <GeneBand />
      <Paths />
      <Reveal className="space-y-6 pb-8 text-center">
        <h2 className="mx-auto max-w-3xl text-5xl sm:text-7xl">Ready to poke a <Stain color="eosin">cell</Stain>?</h2>
        <div className="flex flex-wrap justify-center gap-3">
          <a href="#/play" className="btn-primary">Open the playground →</a>
          <a href="#/learn" className="btn">Start a guided tour</a>
        </div>
      </Reveal>
    </div>
  )
}

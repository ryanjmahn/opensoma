import { useMemo, useState } from 'react'
import { Md } from '../components/ui/Md'
import { Specimen } from '../components/ui/Specimen'
import { Stain } from '../components/ui/Stain'
import { stories, type QuizQ, type Story } from '../lib/content'
import { useData } from '../lib/data'
import { useText } from '../lib/level'
import { getProgress } from '../lib/progress'
import { href } from '../lib/route'

const TRACKS = [
  { id: 'tour', label: 'Cancer biology', blurb: 'How cancer starts, grows and cheats.' },
  { id: 'lesson', label: 'Drug discovery', blurb: 'How medicines are found, and why they fail.' },
] as const
type Filter = 'all' | 'tour' | 'lesson'

const isDone = (s: Story, p: Record<string, number>) => !!p[`story:${s.id}`] || p[`quiz:${s.id}`] !== undefined

function Preview({ s, done }: { s: Story; done: boolean }) {
  const { byId } = useData()
  const tries = [...new Set(s.steps.flatMap((st) => st.try?.actions ?? []))].map((id) => byId.get(id)?.name).filter(Boolean)
  return (
    <article key={s.id} className="fade-in space-y-4 border border-ink/70 bg-card p-6">
      <div className="flex items-start gap-4">
        <Specimen id={s.id} done={done} size="size-20" />
        <div className="space-y-1">
          <p className="eyebrow">{s.kind === 'tour' ? 'Cancer biology' : 'Drug discovery'}{done ? ' · done' : ''}</p>
          <h2 className="text-3xl">{s.title}</h2>
        </div>
      </div>
      <p className="text-ink/80">{s.blurb}</p>
      <ol className="space-y-1.5 border-l border-line pl-4 text-sm">
        {s.steps.map((st) => <li key={st.title} className="text-ink/80">{st.title}</li>)}
        {s.quiz && <li className="text-ink">Quiz</li>}
      </ol>
      {tries.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">You'll try:</span>
          {tries.map((t) => <span key={t} className="border border-ink/50 px-2 py-0.5 font-mono text-[11px] uppercase">{t}</span>)}
        </div>
      )}
      <a href={href(`story/${s.id}`)} className="flex items-stretch">
        <span className="btn-primary flex-1">{done ? 'Do it again' : 'Start'}</span>
        <span className="btn-primary -ml-px" aria-hidden="true">→</span>
      </a>
    </article>
  )
}

function TestYourself() {
  const t = useText()
  const all = useMemo(() => stories.flatMap((s) => (s.quiz ?? []).map((q) => ({ q, s }))), [])
  const [i, setI] = useState(() => Math.floor(Math.random() * all.length))
  const [pick, setPick] = useState<number | null>(null)
  if (!all.length) return null
  const { q, s }: { q: QuizQ; s: Story } = all[i]
  const next = () => { setPick(null); setI((i + 1 + Math.floor(Math.random() * (all.length - 1))) % all.length) }
  return (
    <section className="grid grid-cols-1 gap-6 border-t border-line pt-10 lg:grid-cols-[1fr_1.5fr]">
      <div className="space-y-2">
        <p className="eyebrow">Test yourself</p>
        <h2 className="text-4xl">One quick <Stain color="iodine" strength={0.3}>question</Stain>.</h2>
        <p className="text-muted">From the lesson “{s.title}”.</p>
      </div>
      <div key={i} className="fade-in space-y-3">
        <p className="font-display text-2xl">{t(q.q)}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {q.options.map((o, j) => {
            const state = pick === null ? 'hover:bg-sunk' : j === q.answer ? 'border-emerald-700 bg-emerald-700/10' : j === pick ? 'border-rose-700 bg-rose-700/10' : 'opacity-50'
            return (
              <button key={j} disabled={pick !== null} onClick={() => setPick(j)} className={`border border-ink/40 px-4 py-3 text-left transition ${state}`}>
                {o} {pick !== null && j === q.answer && '✓'}
              </button>
            )
          })}
        </div>
        {pick !== null && (
          <div className="fade-in space-y-3 text-sm" aria-live="polite">
            <div><strong>{pick === q.answer ? 'Correct.' : 'Not quite.'}</strong> <Md text={t(q.explain)} className="inline" /></div>
            <div className="flex gap-2">
              <button className="btn-primary" onClick={next}>Another question</button>
              <a className="btn" href={href(`story/${s.id}`)}>Open the lesson</a>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default function Learn() {
  const p = getProgress()
  const [filter, setFilter] = useState<Filter>('all')
  const next = stories.find((s) => !isDone(s, p))
  const [sel, setSel] = useState<string>((next ?? stories[0]).id)
  const selected = stories.find((s) => s.id === sel) ?? stories[0]
  const started = stories.some((s) => isDone(s, p))
  const tracks = TRACKS.filter((t) => filter === 'all' || filter === t.id)

  return (
    <div className="space-y-12">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl space-y-3">
          <p className="eyebrow">Learn</p>
          <h1 className="text-4xl sm:text-6xl">How cancer works, and how <Stain color="eosin">drugs</Stain> are found.</h1>
        </div>
        {next && (
          <a href={href(`story/${next.id}`)} className="flex items-stretch">
            <span className="btn-primary">{started ? `Continue: ${next.title}` : `Start with: ${next.title}`}</span>
            <span className="btn-primary -ml-px" aria-hidden="true">→</span>
          </a>
        )}
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div role="radiogroup" aria-label="Filter lessons" className="flex">
          {([['all', 'All'], ['tour', 'Cancer biology'], ['lesson', 'Drug discovery']] as const).map(([id, label]) => (
            <button key={id} role="radio" aria-checked={filter === id} onClick={() => setFilter(id)}
              className={`-ml-px border border-ink/60 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] transition first:ml-0 ${filter === id ? 'bg-ink text-paper' : 'hover:bg-sunk'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex w-full max-w-xs gap-1" aria-label="Your progress" role="img">
          {stories.map((s) => <span key={s.id} className={`h-1.5 flex-1 transition ${isDone(s, p) ? 'bg-ink' : 'bg-line'}`} title={s.title} />)}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-10">
          {tracks.map((t) => (
            <section key={t.id} className="space-y-4">
              <div>
                <h2 className="text-3xl">{t.label}</h2>
                <p className="text-muted">{t.blurb}</p>
              </div>
              {/* the path: a line threading through each lesson in order */}
              <ol data-stagger className="relative grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2">
                {stories.filter((s) => s.kind === t.id).map((s) => {
                  const done = isDone(s, p)
                  const active = s.id === sel
                  return (
                    <li key={s.id}>
                      <a href={href(`story/${s.id}`)} onMouseEnter={() => setSel(s.id)} onFocus={() => setSel(s.id)}
                        className={`group flex h-full items-center gap-4 p-4 transition duration-300 ${active ? 'bg-card' : 'bg-paper hover:bg-card'}`}>
                        <Specimen id={s.id} done={done} />
                        <span className="min-w-0 flex-1">
                          <span className="block font-display text-xl leading-tight">{s.title}</span>
                          <span className="mt-1 block truncate text-sm text-muted">{s.blurb}</span>
                        </span>
                        <span className={`transition duration-300 ${active ? 'translate-x-0 text-ink' : '-translate-x-1 text-faint group-hover:translate-x-0 group-hover:text-ink'}`}>→</span>
                      </a>
                    </li>
                  )
                })}
              </ol>
            </section>
          ))}
        </div>
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Preview s={selected} done={isDone(selected, p)} />
        </div>
      </div>

      <TestYourself />
    </div>
  )
}

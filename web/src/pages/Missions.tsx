import { useState } from 'react'
import { DOWN, UP } from '../components/playground/PathwayBars'
import { Md } from '../components/ui/Md'
import { Specimen } from '../components/ui/Specimen'
import { Stain } from '../components/ui/Stain'
import { missions, type Mission } from '../lib/content'
import { useData } from '../lib/data'
import { PLAIN } from '../lib/explain'
import { useText } from '../lib/level'
import { getProgress } from '../lib/progress'
import { href } from '../lib/route'

/** The mission's goal as a tiny chart: which jobs to push, which way, and how far. */
export function GoalGlyph({ m, big = false }: { m: Mission; big?: boolean }) {
  return (
    <ul className={`space-y-1 ${big ? 'text-sm' : 'text-xs'}`}>
      {Object.entries(m.goal.pathways).map(([id, v]) => (
        <li key={id} className="grid grid-cols-[6.5rem_1fr] items-center gap-2">
          <span className="truncate text-muted">{PLAIN[id]?.name ?? id}</span>
          <span className="relative h-1.5 bg-sunk">
            <span className="absolute top-0 left-1/2 h-full w-px bg-ink/40" />
            <span className="absolute top-0 h-full" style={{ background: v < 0 ? DOWN : UP, left: v < 0 ? `${50 - (Math.min(Math.abs(v), 1.5) / 1.5) * 50}%` : '50%', width: `${(Math.min(Math.abs(v), 1.5) / 1.5) * 50}%` }} />
          </span>
        </li>
      ))}
    </ul>
  )
}

export function Rules({ m }: { m: Mission }) {
  return (
    <div className="flex flex-wrap gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em]">
      <span className="flex items-center gap-1 border border-ink/40 px-1.5 py-0.5" title={`Up to ${m.maxMoves} moves`}>
        Moves {Array.from({ length: m.maxMoves }, (_, i) => <span key={i} className="inline-block size-1.5 bg-ink" />)}
      </span>
      {m.goal.harmWeight ? <span className="border border-eosin/60 px-1.5 py-0.5 text-eosin">Side effects count</span> : null}
      {m.adapt ? <span className="border border-iodine/70 px-1.5 py-0.5 text-amber-800">The cell adapts</span> : null}
    </div>
  )
}

function Briefing({ m, best }: { m: Mission; best?: number }) {
  const t = useText()
  const passed = best !== undefined && best >= m.passScore
  return (
    <article key={m.id} className="fade-in relative space-y-5 overflow-hidden border border-ink/70 bg-card p-6">
      {passed && <span className="stamp absolute right-4 top-4">Passed</span>}
      <div className="flex items-center gap-4">
        <Specimen id={m.id} done={passed} size="size-20" />
        <div>
          <p className="eyebrow">Briefing</p>
          <h2 className="text-3xl">{m.title}</h2>
        </div>
      </div>
      <Md text={t(m.brief)} className="text-ink/80" />
      <div className="space-y-2">
        <p className="eyebrow">Goal for the cancer cell</p>
        <GoalGlyph m={m} big />
      </div>
      <Rules m={m} />
      {best !== undefined && (
        <div className="space-y-1" aria-label="Your best score">
          <p className="eyebrow">Your best</p>
          <div className="relative h-2 bg-sunk">
            <div className={`h-full ${passed ? 'bg-teal' : 'bg-iodine'}`} style={{ width: `${best}%` }} />
            <div className="absolute -top-1 h-4 w-0.5 bg-ink" style={{ left: `${m.passScore}%` }} title="Pass mark" />
          </div>
        </div>
      )}
      <a href={href(`mission/${m.id}`)} className="flex items-stretch">
        <span className="btn-primary flex-1">{best === undefined ? 'Accept mission' : 'Play again'}</span>
        <span className="btn-primary -ml-px" aria-hidden="true">→</span>
      </a>
    </article>
  )
}

export default function Missions() {
  const p = getProgress()
  const best = (m: Mission) => p[`mission:${m.id}`] as number | undefined
  const passed = (m: Mission) => (best(m) ?? -1) >= m.passScore
  const next = missions.find((m) => !passed(m))
  const [sel, setSel] = useState((next ?? missions[0]).id)
  const selected = missions.find((m) => m.id === sel) ?? missions[0]
  useData() // missions read real data; make sure it's loaded before showing the page

  return (
    <div className="space-y-12">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl space-y-3">
          <p className="eyebrow">Missions</p>
          <h1 className="text-4xl sm:text-6xl">Drug discovery, played as a <Stain color="iodine" strength={0.35}>game</Stain>.</h1>
          <p className="text-lg font-light text-ink/80">Every move uses real lab data from a cancer cell and a healthy-like cell.</p>
        </div>
        {next && (
          <a href={href(`mission/${next.id}`)} className="flex items-stretch">
            <span className="btn-primary">Next mission: {next.title}</span>
            <span className="btn-primary -ml-px" aria-hidden="true">→</span>
          </a>
        )}
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr]">
        <ol data-stagger className="grid grid-cols-1 gap-px self-start border border-line bg-line sm:grid-cols-2">
          {missions.map((m) => {
            const active = m.id === sel
            return (
              <li key={m.id}>
                <a href={href(`mission/${m.id}`)} onMouseEnter={() => setSel(m.id)} onFocus={() => setSel(m.id)}
                  className={`group relative flex h-full flex-col gap-4 overflow-hidden p-5 transition duration-300 ${active ? 'bg-card' : 'bg-paper hover:bg-card'}`}>
                  {passed(m) && <span className="stamp stamp-sm absolute right-3 top-3">Passed</span>}
                  <div className="flex items-center gap-4">
                    <Specimen id={m.id} done={passed(m)} size="size-14" />
                    <span className="font-display text-2xl leading-tight">{m.title}</span>
                  </div>
                  <p className="text-sm text-muted">{m.blurb}</p>
                  <GoalGlyph m={m} />
                  <div className="mt-auto flex items-center justify-between gap-2">
                    <Rules m={m} />
                    <span className={`transition duration-300 ${active ? 'text-ink' : 'text-faint group-hover:translate-x-1 group-hover:text-ink'}`}>→</span>
                  </div>
                </a>
              </li>
            )
          })}
        </ol>
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Briefing m={selected} best={best(selected)} />
        </div>
      </div>
    </div>
  )
}

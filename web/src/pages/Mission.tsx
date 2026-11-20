import { useState } from 'react'
import { CellScene, organelleGlow } from '../components/cell/CellScene'
import { ActionSearch } from '../components/playground/ActionSearch'
import { DOWN, UP } from '../components/playground/PathwayBars'
import { Md } from '../components/ui/Md'
import { Specimen } from '../components/ui/Specimen'
import { missions } from '../lib/content'
import { useData } from '../lib/data'
import { pathwayName } from '../lib/explain'
import { useLevel, useText } from '../lib/level'
import { combine, missionScore } from '../lib/model'
import { saveProgress } from '../lib/progress'
import type { Route } from '../lib/route'
import { useStack } from '../lib/useStack'
import { Rules } from './Missions'

function GoalBars({ ids, labels, current, goal }: { ids: string[]; labels: string[]; current: number[]; goal: Record<string, number> }) {
  const pos = (x: number) => 50 + (Math.max(-1.5, Math.min(1.5, x)) / 1.5) * 50
  return (
    <dl className="space-y-2.5">
      {ids.map((id, j) => {
        const g = goal[id]
        const v = current[j]
        const w = (Math.min(Math.abs(v), 1.5) / 1.5) * 50
        const close = g !== undefined && Math.abs(v - g) < 0.15
        return (
          <div key={id} className={`grid grid-cols-[7.5rem_1fr] items-center gap-3 text-sm transition ${g === undefined && Object.keys(goal).length ? 'opacity-45' : ''}`}>
            <dt className={close ? 'font-medium text-teal' : ''}>{labels[j]}{close && ' ✓'}</dt>
            <dd className="relative h-3 bg-sunk" aria-hidden="true">
              <div className="absolute left-1/2 top-0 h-full w-px bg-ink/30" />
              <div className="absolute top-0 h-full transition-all duration-700 ease-out" style={{ background: v >= 0 ? UP : DOWN, left: `${v >= 0 ? 50 : 50 - w}%`, width: `${w}%` }} />
              {g !== undefined && <div className="absolute -top-1.5 h-6 w-1 bg-ink" style={{ left: `calc(${pos(g)}% - 2px)` }} />}
              <span className="sr-only">{labels[j]} now {v.toFixed(2)}{g !== undefined ? `, goal ${g}` : ''}</span>
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

export default function Mission({ route }: { route: Route }) {
  const t = useText()
  const { level } = useLevel()
  const { byId, meta } = useData()
  const m = missions.find((x) => x.id === route.path[1])
  const s = useStack([], m?.maxMoves ?? 3)
  const [submitted, setSubmitted] = useState(false)
  const [hint, setHint] = useState(0)
  if (!m) return <p>Mission not found. <a className="underline" href="#/missions">All missions</a></p>
  const actions = s.stack.map((id) => byId.get(id)!)
  const res = missionScore(actions, m.goal, meta, m.adapt)
  const ids = meta.pathways.map((p) => p.id)
  const labels = meta.pathways.map((p) => pathwayName(p.id, p.label, level))
  const passed = res.score >= m.passScore
  const submit = () => { setSubmitted(true); saveProgress(`mission:${m.id}`, res.score) }
  const nextMission = missions[missions.findIndex((x) => x.id === m.id) + 1]

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center gap-5">
        <Specimen id={m.id} done={submitted && passed} size="size-16" />
        <div className="space-y-1">
          <p className="eyebrow"><a className="hover:underline" href="#/missions">Missions</a></p>
          <h1 className="text-4xl sm:text-5xl">{m.title}</h1>
        </div>
        <div className="sm:ml-auto"><Rules m={m} /></div>
      </header>
      <Md text={t(m.brief)} className="max-w-3xl text-lg font-light text-ink/80" />

      {!submitted && (
        <section className="space-y-3">
          {/* Move slots: fill them like a hand of cards; click a filled slot to take the move back */}
          <ol className="grid grid-cols-1 gap-2 sm:grid-cols-3" aria-label="Your moves">
            {Array.from({ length: m.maxMoves }, (_, i) => {
              const a = actions[i]
              return (
                <li key={i}>
                  {a ? (
                    <button onClick={() => s.remove(a.id)} aria-label={`Remove ${a.name}`}
                      className="fade-in group flex h-full w-full items-center justify-between gap-2 border border-ink bg-card px-4 py-3 text-left transition hover:bg-ink hover:text-paper">
                      <span>
                        <span className="block font-mono text-[10px] uppercase tracking-[0.08em] opacity-60">{a.type === 'drug' ? 'Drug' : 'Switch off'}{m.adapt && i === 0 ? ' · fading' : ''}</span>
                        <span className="font-display text-xl">{a.name}</span>
                      </span>
                      <span className="opacity-50 group-hover:opacity-100">×</span>
                    </button>
                  ) : (
                    <div className="flex h-full min-h-[4.25rem] items-center border border-dashed border-ink/30 px-4 font-mono text-[11px] uppercase tracking-[0.08em] text-faint">
                      Empty move
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
          {!s.full ? <ActionSearch onPick={s.add} label="Add a move" /> : <p className="text-sm text-muted">All moves used. Click one to take it back.</p>}
          {m.adapt && s.stack.length > 0 && (
            <p className="fade-in border-l-4 border-l-iodine bg-card p-3 text-sm"><Md text={t(m.adapt.note)} className="inline" /> <span className="text-muted">(Scripted illustration.)</span></p>
          )}
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CellScene className="h-[60vh] sm:h-[50vh] lg:h-auto lg:min-h-[26rem]" labels={false}
          cells={[
            { key: 'k562', variant: 'cancer', glow: organelleGlow(combine(actions, 'k562'), meta), title: 'Cancer' },
            { key: 'rpe1', variant: 'healthy', glow: organelleGlow(combine(actions, 'rpe1'), meta), title: 'Healthy-like' },
          ]} />
        <div className="space-y-4">
          <section className="space-y-3 panel p-4">
            <h2 className="flex items-center gap-2 font-display text-xl"><span className="inline-block size-2.5 bg-eosin" />Cancer cell: hit the black marks</h2>
            <GoalBars ids={ids} labels={labels} current={res.target} goal={m.goal.pathways} />
          </section>
          <section className="space-y-3 panel p-4">
            <h2 className="flex items-center gap-2 font-display text-xl"><span className="inline-block size-2.5 bg-teal" />Healthy cell: {m.goal.harmWeight ? 'keep it calm' : 'side effects (not scored)'}</h2>
            <GoalBars ids={ids} labels={labels} current={res.healthy} goal={{}} />
          </section>
        </div>
      </div>

      {/* Score meter */}
      <section className="relative space-y-4 border border-ink/70 bg-card p-5" aria-live="polite">
        {submitted && passed && <span className="stamp absolute right-5 top-4">Passed</span>}
        <div className="flex flex-wrap items-end gap-4">
          <div className="font-display text-6xl font-light tabular-nums">{res.score}</div>
          <p className="pb-2 text-sm text-muted">{passed ? 'Above the pass mark' : s.stack.length ? 'Keep going' : 'Make your first move'}</p>
          {!submitted && <button className="btn-primary ml-auto" onClick={submit} disabled={!s.stack.length}>Submit</button>}
        </div>
        <div className="relative mt-6 h-3 bg-sunk">
          <div className={`h-full transition-all duration-700 ease-out ${passed ? 'bg-teal' : 'bg-iodine'}`} style={{ width: `${res.score}%` }} />
          <div className="absolute -top-1.5 h-6 w-0.5 bg-ink" style={{ left: `${m.passScore}%` }} />
          <span className="absolute -top-6 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.08em] text-muted" style={{ left: `${m.passScore}%` }}>Pass</span>
        </div>
      </section>

      {!submitted && m.hints.length > 0 && (
        <div className="space-y-2 text-sm">
          {m.hints.slice(0, hint).map((h, i) => <p key={i} className="fade-in border-l-2 border-l-ink/40 pl-3 text-ink/80">{h}</p>)}
          {hint < m.hints.length && <button className="btn" onClick={() => setHint(hint + 1)}>Show a hint</button>}
        </div>
      )}

      {submitted && (
        <section className="fade-in space-y-4 border border-line border-l-4 border-l-teal bg-card p-6">
          <h2 className="text-4xl">{passed ? 'Mission complete.' : 'Not quite. Try again?'}</h2>
          <p className="eyebrow">The real science</p>
          <Md text={t(m.debrief)} className="text-ink" />
          <p className="text-xs text-muted">A game on lab cell data, not advice about any real treatment.</p>
          <div className="flex flex-wrap gap-2">
            <button className="btn" onClick={() => { setSubmitted(false); s.reset() }}>Try again</button>
            {passed && nextMission
              ? <a className="btn-primary" href={`#/mission/${nextMission.id}`}>Next mission: {nextMission.title} →</a>
              : <a className="btn" href="#/missions">All missions</a>}
          </div>
        </section>
      )}
    </div>
  )
}

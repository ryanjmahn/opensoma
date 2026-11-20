import { useState } from 'react'
import { CellScene, type Organelle } from '../components/cell/CellScene'
import { PipelineJourney } from '../components/learn/PipelineJourney'
import { Quiz } from '../components/learn/Quiz'
import { MoleculeViewer } from '../components/molecule/MoleculeViewer'
import { PathwayNetwork } from '../components/pathways/PathwayNetwork'
import { ResultPanel, targetsOf } from '../components/playground/ResultPanel'
import { Verdict } from '../components/playground/Verdict'
import { Md } from '../components/ui/Md'
import { stories, structures } from '../lib/content'
import { LINES, useData } from '../lib/data'
import { useText } from '../lib/level'
import { combine } from '../lib/model'
import { saveProgress } from '../lib/progress'
import { href, replaceParams, type Route } from '../lib/route'

export default function Story({ route }: { route: Route }) {
  const t = useText()
  const { byId, meta } = useData()
  const story = stories.find((s) => s.id === route.path[1])
  const [i, setI] = useState(() => Number(route.params.get('step') ?? 0) || 0)
  const [finished, setFinished] = useState(false)
  if (!story) return <p>Story not found. <a className="underline" href="#/learn">Back to Learn</a></p>
  const quizStep = story.quiz ? story.steps.length : -1
  const total = story.steps.length + (story.quiz ? 1 : 0)
  const go = (n: number) => { setI(n); replaceParams({ step: n ? String(n) : undefined }) }
  const step = story.steps[i]
  const tryActions = (step?.try?.actions ?? []).map((id) => byId.get(id)).filter((a) => !!a)

  const finish = (score?: number) => {
    saveProgress(`story:${story.id}`, 1)
    if (score !== undefined) saveProgress(`quiz:${story.id}`, score)
    setFinished(true)
  }

  if (finished)
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-10 text-center">
        <p className="eyebrow justify-center">Complete</p>
        <h1 className="text-4xl sm:text-5xl">You finished “{story.title}”</h1>
        <p className="text-ink/80">Now try it yourself: poke the cell in the playground, or take on a mission.</p>
        <div className="flex justify-center gap-2">
          <a className="btn" href={href('play', { a: story.steps.flatMap((s) => s.try?.actions ?? []).slice(0, 2).join(',') || undefined })}>Open playground</a>
          <a className="btn" href="#/missions">Missions</a>
          <a className="btn" href="#/learn">More lessons</a>
        </div>
      </div>
    )

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-sm text-muted"><a href="#/learn" className="hover:underline">Learn</a> · {story.kind === 'tour' ? 'Guided tour' : 'Lesson'}</p>
          <h1 className="text-4xl sm:text-5xl">{story.title}</h1>
        </div>
        <p className="sr-only" aria-live="polite">Step {i + 1} of {total}</p>
      </header>
      <div className="h-1 overflow-hidden rounded bg-sunk" aria-hidden="true">
        <div className="h-full bg-accent transition-all" style={{ width: `${((i + 1) / total) * 100}%` }} />
      </div>

      {i === quizStep ? (
        <Quiz questions={story.quiz!} onDone={finish} />
      ) : (
        <div key={i} className="grid gap-5 page-enter lg:grid-cols-[1.2fr_1fr]">
          <div className="min-w-0 space-y-3">
            {step.view === 'network' && (
              <PathwayNetwork meta={meta} highlight={step.highlight} r={tryActions.length ? combine(tryActions, 'k562') : null} targets={targetsOf(tryActions)} />
            )}
            {step.view === 'molecule' && step.pdb && (
              <>
                <MoleculeViewer id={step.pdb} className="h-[40vh] sm:h-[50vh]" />
                <p className="text-sm text-muted">{structures.find((s) => s.pdb === step.pdb)?.caption}</p>
              </>
            )}
            {step.view === 'pipeline' && <PipelineJourney />}
            {(step.view === 'cell' || !step.view) && (
              <CellScene className="h-[38vh] sm:h-[50vh]" cells={[{ key: step.cell ?? 'cancer', variant: step.cell ?? 'cancer' }]} focus={(step.focus as Organelle) ?? null} />
            )}
          </div>
          <article className="min-w-0 space-y-4">
            <h2 className="text-3xl">{step.title}</h2>
            <Md text={t(step.text)} className="text-ink" />
            {tryActions.length > 0 && (
              <section className="space-y-3 rounded-sm border border-ink/30 border-l-4 border-l-eosin bg-card p-4">
                <h3 className="font-semibold">Try it: {tryActions.map((a) => a.name).join(' + ')}</h3>
                {step.try?.note && <Md text={t(step.try.note)} className="text-sm text-ink/80" />}
                <Verdict actions={tryActions} />
                {LINES.map((l) => <ResultPanel key={l} actions={tryActions} line={l} genes={6} />)}
                <a className="btn" href={href('play', { a: step.try!.actions.join(',') })}>Open in playground →</a>
              </section>
            )}
            {step.sources && <p className="text-xs text-muted">Sources: <Md text={step.sources.map((s) => `[@${s}]`).join(' ')} className="inline" /></p>}
          </article>
        </div>
      )}

      <nav className="flex justify-between border-t border-line pt-4" aria-label="Story navigation">
        <button className="btn" onClick={() => go(i - 1)} disabled={i === 0}>← Back</button>
        {i < total - 1 ? (
          <button className="btn-primary" onClick={() => go(i + 1)}>Next →</button>
        ) : i !== quizStep ? (
          <button className="btn-primary" onClick={() => finish()}>Finish ✓</button>
        ) : null}
      </nav>
      {story.review && <p className="text-xs text-muted">{story.review}</p>}
    </div>
  )
}

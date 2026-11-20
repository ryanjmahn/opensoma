import { useState } from 'react'
import type { QuizQ } from '../../lib/content'
import { useText } from '../../lib/level'
import { Md } from '../ui/Md'

export function Quiz({ questions, onDone }: { questions: QuizQ[]; onDone?: (score: number) => void }) {
  const t = useText()
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null))
  const done = answers.every((a) => a !== null)
  const score = answers.filter((a, i) => a === questions[i].answer).length
  return (
    <section aria-label="Quiz" className="space-y-5">
      <h2 className="text-3xl">Quick quiz</h2>
      {questions.map((q, i) => {
        const a = answers[i]
        return (
          <fieldset key={i} className="space-y-2 panel p-4">
            <legend className="px-1 font-medium">{i + 1}. {t(q.q)}</legend>
            <div className="grid gap-2">
              {q.options.map((o, j) => {
                const state = a === null ? '' : j === q.answer ? 'ring-emerald-600 bg-emerald-400/10' : j === a ? 'ring-rose-600 bg-rose-400/10' : 'opacity-60'
                return (
                  <button key={j} disabled={a !== null} onClick={() => setAnswers(answers.map((x, k) => (k === i ? j : x)))}
                    className={`rounded-sm px-3 py-2 text-left ring-1 ring-line hover:bg-sunk ${state}`}>
                    {o} {a !== null && j === q.answer && '✓'}
                  </button>
                )
              })}
            </div>
            {a !== null && <div className="text-sm text-ink/80" aria-live="polite"><strong>{a === q.answer ? 'Correct!' : 'Not quite.'}</strong> <Md text={t(q.explain)} /></div>}
          </fieldset>
        )
      })}
      {done && (
        <div className="flex items-center gap-3 rounded-sm bg-accent/10 p-4">
          <p className="text-lg">You got <strong>{score} / {questions.length}</strong>.</p>
          <button className="btn" onClick={() => onDone?.(score)}>Finish</button>
        </div>
      )}
    </section>
  )
}

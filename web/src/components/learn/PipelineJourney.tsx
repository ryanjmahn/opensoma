import { useState } from 'react'
import pipeline from '../../../../content/pipeline.json'
import { useText, type Leveled } from '../../lib/level'
import { Md } from '../ui/Md'

interface Stage { id: string; label: string; time: string; text: Leveled; fact?: string }

export function PipelineJourney() {
  const t = useText()
  const stages = pipeline.stages as Stage[]
  const [i, setI] = useState(0)
  const s = stages[i]
  return (
    <div className="space-y-4 rounded-sm bg-paper p-4">
      <ol className="flex flex-wrap gap-1" aria-label="Drug discovery stages">
        {stages.map((st, k) => (
          <li key={st.id} className="flex items-center gap-1">
            {k > 0 && <span className="text-faint" aria-hidden="true">→</span>}
            <button onClick={() => setI(k)} aria-current={k === i ? 'step' : undefined}
              className={`rounded-sm px-2 py-1 text-sm ${k === i ? 'bg-accent/10 text-accent ring-1 ring-accent/40' : 'text-muted hover:text-ink'}`}>
              {st.label}
            </button>
          </li>
        ))}
      </ol>
      <div className="space-y-2">
        <h3 className="text-xl font-semibold">{s.label} <span className="text-sm font-normal text-muted">· typical time: {s.time}</span></h3>
        <Md text={t(s.text)} className="text-ink/80" />
        {s.fact && <Md text={s.fact} className="text-sm text-amber-800" />}
      </div>
      <div className="grid gap-2 text-sm sm:grid-cols-3">
        {pipeline.totals.map((x) => (
          <div key={x.label} className="rounded-sm bg-card p-3">
            <div className="text-2xl font-semibold">{x.value}</div>
            <Md text={x.label} className="text-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}

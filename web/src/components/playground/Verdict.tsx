import { useData, type Action } from '../../lib/data'
import { verdict } from '../../lib/explain'
import { combine } from '../../lib/model'

const TONE = {
  selective: 'border-l-teal',
  both: 'border-l-iodine',
  healthy: 'border-l-eosin',
  none: 'border-l-line',
}

/** The one-line answer to "so what happened?", comparing the cancer cell with the healthy-like cell. */
export function Verdict({ actions, stacked }: { actions: Action[]; stacked?: boolean }) {
  const { meta } = useData()
  const c = combine(actions, 'k562')
  const h = combine(actions, 'rpe1')
  if (!c || !h) return null
  const v = verdict(c, h, meta)
  const bar = (x: number) => `${Math.min(x / 1.5, 1) * 100}%`
  return (
    <section aria-live="polite" className={`grid gap-5 border border-line border-l-4 bg-card p-5 ${stacked ? '' : 'md:grid-cols-[1.4fr_1fr]'} ${TONE[v.tone]}`}>
      <div className="space-y-2">
        <p className="eyebrow">The verdict</p>
        <h2 className="text-3xl">{v.title}</h2>
        <p className="text-ink/80">{v.body}</p>
      </div>
      <div className="space-y-3 self-center" aria-label="How much each cell changed">
        {[['Cancer cell', v.cancer, 'bg-eosin'], ['Healthy-like cell', v.healthy, 'bg-teal']].map(([label, x, color]) => (
          <div key={label as string} className="space-y-1">
            <div className="flex justify-between font-mono text-[11px] uppercase tracking-[0.08em]">
              <span>{label}</span><span className="text-muted">{(x as number) < 0.25 ? 'barely changed' : (x as number) < 0.6 ? 'changed some' : (x as number) < 1 ? 'changed a lot' : 'changed hugely'}</span>
            </div>
            <div className="h-2 bg-sunk"><div className={`h-full ${color}`} style={{ width: bar(x as number) }} /></div>
          </div>
        ))}
      </div>
    </section>
  )
}

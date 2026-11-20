import { useData, type Action, type LineId } from '../../lib/data'
import { combine } from '../../lib/model'
import { describe } from '../../lib/explain'
import { useLevel } from '../../lib/level'
import { drugs } from '../../lib/content'
import { Badge } from './Badge'
import { PathwayBars } from './PathwayBars'
import { TopGenes } from './TopGenes'

export function targetsOf(actions: Action[]): string[] {
  return actions.flatMap((a) => (a.type === 'gene' ? [a.name] : drugs.find((d) => `d:${d.id}` === a.id)?.targets ?? []))
}

export function CellHeader({ line }: { line: LineId }) {
  const { meta } = useData()
  const l = meta.lines[line]
  return (
    <h3 className="font-semibold">
      <span aria-hidden="true" className={`mr-1.5 inline-block size-2.5 ${l.role === 'cancer' ? 'bg-eosin' : 'bg-teal'}`} />{l.role === 'cancer' ? 'Cancer cell' : 'Healthy-like cell'} <span className="font-normal text-muted">· {l.name}</span>
    </h3>
  )
}

export function ResultPanel({ actions, line, onGene, genes = 10, highlight, onHover }: {
  actions: Action[]; line: LineId; onGene?: (g: string) => void; genes?: number; highlight?: (id: string) => boolean; onHover?: (id: string | null) => void
}) {
  const { meta } = useData()
  const { level } = useLevel()
  const r = combine(actions, line)
  return (
    <section className="space-y-3 panel p-4" aria-label={`${meta.lines[line].name} results`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CellHeader line={line} />
        {r && <Badge r={r} />}
      </div>
      {!r ? (
        <p className="text-sm text-muted">Untouched. Pick an experiment to see how this cell responds.</p>
      ) : (
        <>
          <ul className="space-y-1 text-[15px] leading-snug text-ink" aria-live="polite">
            {describe(r, meta).map((t) => <li key={t}>{t}</li>)}
          </ul>
          <PathwayBars r={r} meta={meta} highlight={highlight} onHover={onHover} />
          {(
            <details className="text-sm" open={level === 'deep'}>
              <summary className="cursor-pointer text-ink/80">Genes that changed most</summary>
              <div className="pt-2"><TopGenes r={r} targets={targetsOf(actions)} onGene={onGene} limit={genes} /></div>
            </details>
          )}
        </>
      )}
    </section>
  )
}

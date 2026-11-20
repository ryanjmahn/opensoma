import type { LineResult } from '../../lib/data'
import { useData } from '../../lib/data'
import { DOWN, UP } from './PathwayBars'

export function TopGenes({ r, targets, onGene, limit = 10 }: { r: LineResult; targets: string[]; onGene?: (g: string) => void; limit?: number }) {
  const { readout, info } = useData()
  return (
    <ol className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
      {r.top.slice(0, limit).map(([i, z]) => {
        const g = readout[i]
        return (
          <li key={i} className="flex items-center justify-between gap-2">
            <button className="truncate text-left hover:underline" onClick={() => onGene?.(g)} title={info[g]?.protein || g}>
              {g}
              {targets.includes(g) && <span className="ml-1 text-xs text-muted">(target)</span>}
            </button>
            <span className="font-mono text-xs tabular-nums" style={{ color: z > 0 ? UP : DOWN }}>
              {z > 0 ? '▲' : '▼'}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

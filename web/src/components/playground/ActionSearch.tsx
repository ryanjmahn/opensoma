import { useId, useMemo, useState } from 'react'
import { useData } from '../../lib/data'
import { aliases, drugs } from '../../lib/content'

export interface SearchItem { id: string; label: string; sub: string; kind: 'gene' | 'drug' }

export function useSearchItems(): SearchItem[] {
  const { actions, info } = useData()
  return useMemo(() => {
    const drugById = new Map(drugs.map((d) => [d.id, d]))
    return actions.map((a) => {
      if (a.type === 'drug') {
        const d = drugById.get(a.id.slice(2))
        return { id: a.id, label: a.name, sub: `drug → ${d?.targets.join(' + ')}`, kind: 'drug' as const }
      }
      return { id: a.id, label: a.name, sub: info[a.name]?.protein || 'gene', kind: 'gene' as const }
    })
  }, [actions, info])
}

export function searchItems(items: SearchItem[], q: string, limit = 8): SearchItem[] {
  const s = q.trim().toLowerCase()
  if (!s) return []
  const alias = aliases[s]
  const score = (it: SearchItem) => {
    const l = it.label.toLowerCase()
    if (alias && it.id === `g:${alias}`) return 0
    if (l === s) return 1
    if (l.startsWith(s)) return 2
    if (it.sub.toLowerCase().includes(s)) return 3
    return 9
  }
  return items.map((it) => [score(it), it] as const).filter(([sc]) => sc < 9).sort((a, b) => a[0] - b[0]).slice(0, limit).map(([, it]) => it)
}

export function ActionSearch({ onPick, autoFocus, label = 'Search genes and drugs' }: {
  onPick: (id: string) => void; autoFocus?: boolean; label?: string
}) {
  const items = useSearchItems()
  const [q, setQ] = useState('')
  const [hi, setHi] = useState(0)
  const results = searchItems(items, q)
  const listId = useId()
  const pick = (it?: SearchItem) => {
    if (!it) return
    onPick(it.id)
    setQ('')
  }
  return (
    <div className="relative">
      <input
        role="combobox"
        aria-expanded={results.length > 0}
        aria-controls={listId}
        aria-activedescendant={results[hi] ? `${listId}-${hi}` : undefined}
        aria-label={label}
        autoFocus={autoFocus}
        value={q}
        onChange={(e) => { setQ(e.target.value); setHi(0) }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, results.length - 1)) }
          if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)) }
          if (e.key === 'Enter') pick(results[hi])
          if (e.key === 'Escape') setQ('')
        }}
        className="w-full border border-ink/50 bg-card px-4 py-3 text-ink placeholder:text-faint focus:border-ink focus:outline-none"
      />
      {results.length > 0 && (
        <ul data-lenis-prevent id={listId} role="listbox" className="absolute z-20 mt-1 w-full overflow-hidden rounded-sm border border-line bg-card shadow-xl">
          {results.map((it, i) => (
            <li
              key={it.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === hi}
              onMouseDown={(e) => { e.preventDefault(); pick(it) }}
              onMouseEnter={() => setHi(i)}
              className={`flex cursor-pointer justify-between gap-3 px-3 py-2 text-sm ${i === hi ? 'bg-sunk' : ''}`}
            >
              <span className="font-medium">{it.label}</span>
              <span className="truncate text-xs text-muted">{it.sub}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

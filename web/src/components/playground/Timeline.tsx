import { useData } from '../../lib/data'

export function Timeline({ history, index, onJump }: { history: string[][]; index: number; onJump: (i: number) => void }) {
  const { byId } = useData()
  const label = (stack: string[], prev: string[]) => {
    const added = stack.filter((x) => !prev.includes(x))
    const removed = prev.filter((x) => !stack.includes(x))
    if (!stack.length) return 'Start'
    if (added.length) return `+ ${added.map((x) => byId.get(x)?.name).join(', ')}`
    if (removed.length) return `− ${removed.map((x) => byId.get(x)?.name).join(', ')}`
    return 'Change'
  }
  return (
    <nav data-lenis-prevent aria-label="Timeline" className="flex items-center gap-2 overflow-x-auto pb-1 text-sm">
      <button className="btn" onClick={() => onJump(index - 1)} disabled={index === 0} aria-label="Undo">↶ Undo</button>
      <button className="btn" onClick={() => onJump(index + 1)} disabled={index >= history.length - 1} aria-label="Redo">↷ Redo</button>
      <ol className="flex items-center gap-1">
        {history.map((s, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-faint">→</span>}
            <button onClick={() => onJump(i)} aria-current={i === index ? 'step' : undefined}
              className={`whitespace-nowrap px-2 py-0.5 ${i === index ? 'bg-accent/10 text-accent ring-1 ring-accent/40' : i > index ? 'text-faint' : 'text-muted hover:text-ink'}`}>
              {label(s, history[i - 1] ?? [])}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )
}

import { sources } from '../lib/content'
import { useData } from '../lib/data'

export function Sources() {
  const { meta } = useData()
  return <SourcesList ids={null} generated={meta.generated} />
}

function SourcesList({ ids, generated }: { ids: string[] | null; generated: string }) {
  const entries = Object.entries(sources).filter(([k]) => !ids || ids.includes(k))
  const kinds = ['data', 'science', 'textbook', 'public', 'software']
  return (
    <div className="space-y-6">
      <h1 className="text-4xl sm:text-5xl">Sources</h1>
      <p className="text-ink/80">Every claim in OpenSoma should point here. Spotted a mistake? Please open an issue on GitHub. Data generated {generated}.</p>
      {kinds.map((k) => (
        <section key={k} className="space-y-2">
          <h2 className="text-3xl capitalize">{k === 'public' ? 'For patients and the public' : k}</h2>
          <ul className="space-y-2 text-sm">
            {entries.filter(([, v]) => v.kind === k).map(([id, v]) => (
              <li key={id} id={id} className="target:rounded target:bg-accent/10">
                <span className="font-mono text-xs text-muted">[{id}]</span> {v.cite}{' '}
                <a className="text-accent underline" href={v.url} target="_blank" rel="noreferrer">link</a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

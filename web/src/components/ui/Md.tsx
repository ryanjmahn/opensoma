import { Fragment, type ReactNode } from 'react'
import { sources } from '../../lib/content'

// Tiny inline markdown: **bold**, *italic*, [text](url), [@sourceId] citations. Paragraphs split on blank lines.
const TOKEN = /(\*\*[^*]+\*\*|\*[^*]+\*|\[@[\w]+\]|\[[^\]]+\]\([^)]+\))/g

function inline(text: string): ReactNode[] {
  return text.split(TOKEN).map((part, i) => {
    if (part.startsWith('**')) return <strong key={i} className="text-ink">{part.slice(2, -2)}</strong>
    if (part.startsWith('[@')) {
      const id = part.slice(2, -1)
      const s = sources[id]
      return (
        <a key={i} href={`#/sources#${id}`} title={s?.cite ?? id} className="align-super text-[0.7em] text-accent hover:underline">
          [{id}]
        </a>
      )
    }
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (link) {
      const external = /^https?:/.test(link[2])
      return (
        <a key={i} href={link[2]} className="text-accent underline" {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>
          {link[1]}
        </a>
      )
    }
    if (part.startsWith('*') && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>
    return <Fragment key={i}>{part}</Fragment>
  })
}

export function Md({ text, className = '' }: { text: string; className?: string }) {
  return (
    <div className={`space-y-3 leading-relaxed ${className}`}>
      {text.split(/\n\s*\n/).map((p, i) =>
        p.startsWith('## ') ? (
          <h2 key={i} className="pt-3 text-xl font-semibold text-ink">{inline(p.slice(3))}</h2>
        ) : p.trim().startsWith('- ') ? (
          <ul key={i} className="list-disc space-y-1 pl-5">
            {p.trim().split(/\n- /).map((li, j) => <li key={j}>{inline(li.replace(/^- /, ''))}</li>)}
          </ul>
        ) : (
          <p key={i}>{inline(p)}</p>
        ),
      )}
    </div>
  )
}

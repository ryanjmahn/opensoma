import { drugs } from '../../lib/content'
import { href } from '../../lib/route'

const CLASS = { targeted: 'Targeted therapy', chemo: 'Chemotherapy', research: 'Research tool', investigational: 'Investigational' }

export function DrugCard({ id }: { id: string }) {
  const d = drugs.find((x) => x.id === id)
  if (!d) return null
  return (
    <article className="space-y-1 panel p-4 text-sm">
      <h3 className="font-semibold">{d.name} <span className="font-normal text-muted">· {CLASS[d.class]} · targets {d.targets.join(' + ')}</span></h3>
      <p className="text-ink/80">{d.how}</p>
      <p className="text-muted">{d.status}</p>
      <p className="text-amber-800">How we model it: {d.caveat}</p>
      {d.pdb && <a className="btn mt-1 inline-block" href={href(`molecule/${d.pdb}`)}>See it bind in 3D</a>}
    </article>
  )
}

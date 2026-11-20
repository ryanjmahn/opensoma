import { useData } from '../../lib/data'
import { href } from '../../lib/route'
import { structures } from '../../lib/content'

export const ORGANELLE_LABEL: Record<string, string> = {
  nucleus: 'Nucleus', mito: 'Mitochondria', er: 'Endoplasmic reticulum', golgi: 'Golgi apparatus',
  membrane: 'Cell membrane', lysosome: 'Lysosomes', cytoplasm: 'Cytoplasm',
}

export function GeneInfo({ gene, onClose }: { gene: string; onClose?: () => void }) {
  const { info, byId } = useData()
  const g = info[gene]
  const pdbs = structures.filter((s) => s.gene === gene)
  return (
    <section aria-label={`About ${gene}`} className="space-y-2 panel p-4 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold">{gene}</h3>
          {g?.protein && <p className="text-muted">{g.protein}</p>}
        </div>
        {onClose && <button onClick={onClose} aria-label="Close gene info" className="text-muted hover:text-ink">✕</button>}
      </div>
      {g?.cancer && (
        <p className="rounded-md bg-violet-400/10 px-2 py-1 text-violet-800">
          {g.cancer === 'oncogene' ? 'Often mutated in cancer as a "stuck gas pedal" (oncogene)' : 'Often broken in cancer as a "failed brake" (tumor suppressor)'}
        </p>
      )}
      {g?.fn ? <p className="text-ink/80">{g.fn}</p> : <p className="text-muted">No UniProt summary available.</p>}
      {g?.org && <p className="text-muted">Lives mainly in: <span className="text-ink">{ORGANELLE_LABEL[g.org]}</span></p>}
      <div className="flex flex-wrap gap-2 pt-1">
        {byId.has(`g:${gene}`) && <a className="btn" href={href('play', { a: `g:${gene}` })}>Turn it off →</a>}
        <a className="btn" href={href('explore', { focus: gene })}>Find in cell</a>
        {pdbs.map((s) => <a key={s.pdb} className="btn" href={href(`molecule/${s.pdb}`)}>3D: {s.title}</a>)}
        {!pdbs.length && g?.acc && <a className="btn" href={href(`molecule/AF-${g.acc}`)}>3D (AlphaFold prediction)</a>}
      </div>
      <p className="text-xs text-muted">
        Source: {g?.acc ? <a className="underline" target="_blank" rel="noreferrer" href={`https://www.uniprot.org/uniprotkb/${g.acc}`}>UniProt {g.acc}</a> : 'UniProt'} ·{' '}
        <a className="underline" target="_blank" rel="noreferrer" href={`https://www.ncbi.nlm.nih.gov/gene/?term=${gene}[sym]+AND+human[orgn]`}>NCBI Gene</a>
      </p>
    </section>
  )
}

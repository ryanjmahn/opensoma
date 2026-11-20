import { useEffect, useRef, useState } from 'react'

export type Look = 'cartoon' | 'surface' | 'atoms'
export type Paint = 'spectrum' | 'chain' | 'plain'
export interface ViewerApi { focusDrug: () => void; reset: () => void; png: () => string; hasDrug: boolean }

// Water, salts and crystallization buffers: always hidden, never counted as "the drug".
const JUNK = ['HOH', 'DOD', 'NA', 'CL', 'K', 'SO4', 'GOL', 'EDO', 'PEG', 'ACT', 'DMS']
const IONS = ['MG', 'ZN', 'CA', 'MN']

type Props = {
  id: string; className?: string; look?: Look; paint?: Paint; showDrug?: boolean; spin?: boolean; onReady?: (api: ViewerApi | null) => void
}

/**
 * Shows a protein structure. `id` is a PDB id (experimental structure from RCSB) or "AF-<UniProt>"
 * (AlphaFold prediction). 3Dmol.js loads only when this mounts. Look, color and spin change live,
 * without reloading the structure.
 */
export function MoleculeViewer(props: Props) {
  return <Viewer key={props.id} {...props} /> // remount per structure so state starts fresh
}

// 3Dmol's runtime objects are loosely typed; keep them behind these two refs.
type Any3D = any // eslint-disable-line @typescript-eslint/no-explicit-any

function Viewer({ id, className = 'h-[50vh] sm:h-[60vh]', look = 'cartoon', paint = 'spectrum', showDrug = true, spin = true, onReady }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const v = useRef<Any3D>(null)
  const lib = useRef<Any3D>(null)
  const ready = useRef(onReady)
  useEffect(() => { ready.current = onReady })
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [err, setErr] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const $3Dmol = await import('3dmol')
        let url = `https://files.rcsb.org/download/${id}.cif`
        if (id.startsWith('AF-')) {
          const res = await fetch(`https://alphafold.ebi.ac.uk/api/prediction/${id.slice(3)}`)
          if (!res.ok) throw new Error('No AlphaFold model for this protein')
          url = (await res.json())[0].cifUrl
        }
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Structure download failed (${res.status})`)
        const text = await res.text()
        if (cancelled || !el.current) return
        const viewer = $3Dmol.createViewer(el.current, { backgroundColor: '#faf8f3' })
        viewer.addModel(text, 'cif')
        viewer.zoomTo()
        v.current = viewer
        lib.current = $3Dmol
        setStatus('ready')
      } catch (e) {
        if (!cancelled) { setErr(String((e as Error).message)); setStatus('error') }
      }
    })()
    return () => { cancelled = true; v.current?.clear(); v.current = null; ready.current?.(null) }
  }, [id])

  // Restyle whenever the look changes.
  useEffect(() => {
    const viewer = v.current
    if (status !== 'ready' || !viewer) return
    const color = paint === 'spectrum' ? { color: 'spectrum' } : paint === 'chain' ? { colorscheme: 'chain' } : { color: '#b9b1a3' }
    const protein = { hetflag: false }
    viewer.removeAllSurfaces()
    if (look === 'cartoon') viewer.setStyle(protein, { cartoon: { ...color } })
    if (look === 'atoms') viewer.setStyle(protein, { sphere: { ...color, scale: 0.85 } })
    if (look === 'surface') {
      viewer.setStyle(protein, { cartoon: { ...color, opacity: 0.35 } })
      viewer.addSurface(lib.current.SurfaceType.VDW, { opacity: 0.8, ...(paint === 'plain' ? { color: '#d9d2c4' } : { colorscheme: 'chain' }) }, protein)
    }
    viewer.setStyle({ hetflag: true }, showDrug ? { stick: { colorscheme: 'yellowCarbon', radius: 0.28 } } : {})
    viewer.setStyle({ resn: JUNK }, {})
    viewer.setStyle({ resn: IONS }, showDrug ? { sphere: { radius: 0.6, color: '#8a8378' } } : {})
    viewer.render()
  }, [status, look, paint, showDrug])

  useEffect(() => {
    if (status === 'ready') v.current?.spin(spin ? 'y' : false, 0.4)
  }, [status, spin])

  // Hand the page a small control API once the structure is loaded.
  useEffect(() => {
    const viewer = v.current
    if (status !== 'ready' || !viewer) return
    const drugSel = { hetflag: true, not: { resn: [...JUNK, ...IONS] } }
    ready.current?.({
      hasDrug: viewer.selectedAtoms(drugSel).length > 0,
      focusDrug: () => viewer.zoomTo(drugSel, 900),
      reset: () => viewer.zoomTo({}, 700),
      png: () => viewer.pngURI(),
    })
  }, [status])

  return (
    <div data-lenis-prevent className={`relative overflow-hidden border border-line bg-card ${className}`} role="img"
      aria-label={`3D structure ${id}. Protein as ${look === 'cartoon' ? 'ribbons' : look}, drug or small molecules as yellow sticks.`}>
      <div ref={el} className="absolute inset-0" />
      {status === 'loading' && <p className="absolute inset-0 grid place-items-center text-muted">Loading 3D structure…</p>}
      {status === 'error' && <p className="absolute inset-0 grid place-items-center p-6 text-center text-rose-800">Couldn't load structure: {err}</p>}
      <p className="pointer-events-none absolute bottom-2 left-3 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
        {id.startsWith('AF-') ? '◐ AlphaFold prediction' : `● Experimental structure · PDB ${id}`}
      </p>
    </div>
  )
}

import { network } from '../../lib/content'
import type { LineResult, Meta } from '../../lib/data'
import { scaled } from '../../lib/model'
import { DOWN, UP } from '../playground/PathwayBars'

// shortcut: SVG is plenty for ~35 nodes; switch to canvas/WebGL if networks grow past a few hundred nodes
const COMPARTMENT_FILL: Record<string, string> = {
  membrane: 'rgba(46,124,119,0.16)', cytoplasm: 'rgba(196,138,58,0.05)', mito: 'rgba(196,84,122,0.14)', nucleus: 'rgba(61,58,143,0.12)',
}

function tint(v: number | null | undefined, max: number) {
  if (v == null) return { fill: '#faf8f3', stroke: '#b9b1a3', strength: 0 }
  const s = Math.min(Math.abs(v) / max, 1)
  const c = v >= 0 ? UP : DOWN
  return { fill: `color-mix(in srgb, ${c} ${Math.round(s * 80)}%, #faf8f3)`, stroke: s > 0.15 ? c : '#8a8378', strength: s }
}

export function PathwayNetwork({ r, meta, targets = [], highlight = [], onGene }: {
  r?: LineResult | null; meta: Meta; targets?: string[]; highlight?: string[]; onGene?: (g: string) => void
}) {
  const [W, H] = network.size
  const byId = new Map(network.nodes.map((n) => [n.id, n]))
  const pw = r ? scaled(r, meta) : null
  const valueOf = (n: (typeof network.nodes)[number]) => {
    if (!r) return null
    if (n.process) return pw![meta.pathways.findIndex((p) => p.id === n.process)]
    return r.net[meta.net_genes.indexOf(n.gene!)]
  }
  return (
    <figure className="space-y-2">
      <div data-lenis-prevent className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[680px] border border-line bg-card" role="img" aria-label={network.title}>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#8a8378" />
          </marker>
          <marker id="tee" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="8" markerHeight="8" orient="auto">
            <path d="M5,0 L5,10" stroke="#c4547a" strokeWidth="3" />
          </marker>
        </defs>
        {network.compartments.map((c) => (
          <g key={c.id}>
            <rect x={c.x} y={c.y} width={c.w} height={c.h} rx={c.id === 'mito' ? 90 : 18} fill={COMPARTMENT_FILL[c.id]} filter={c.id === 'cytoplasm' ? undefined : 'url(#stain)'} stroke={c.id === 'cytoplasm' ? '#cfc7b8' : 'none'} strokeDasharray="4 6" />
            <text x={c.x + c.w - 14} y={c.id === 'nucleus' ? c.y + c.h - 12 : c.y + 20} textAnchor="end" className="fill-muted font-mono text-[13px] uppercase tracking-[0.1em]">{c.label}</text>
          </g>
        ))}
        {network.edges.map(([a, b, sign]) => {
          const A = byId.get(a)!, B = byId.get(b)!
          const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy)
          const pad = 30
          return (
            <line key={`${a}-${b}`} x1={A.x + (dx / len) * pad} y1={A.y + (dy / len) * pad} x2={B.x - (dx / len) * pad} y2={B.y - (dy / len) * pad}
              stroke={sign === '-' ? '#c4547a' : '#8a8378'} strokeWidth={2} markerEnd={sign === '-' ? 'url(#tee)' : 'url(#arrow)'} opacity={0.8} />
          )
        })}
        {network.nodes.map((n) => {
          const v = valueOf(n)
          const t = tint(v, n.process ? 1 : 1.5)
          const isTarget = !!n.gene && targets.includes(n.gene)
          const hl = highlight.includes(n.id)
          const label = `${n.label}${n.role ? `: ${n.role}` : ''}${v != null ? `. Change ${v.toFixed(2)}` : r ? '. Not measured' : ''}`
          return (
            <g key={n.id} transform={`translate(${n.x},${n.y})`} className={t.strength > 0.35 ? 'pulse' : undefined}
              role={n.gene ? 'button' : undefined} tabIndex={n.gene ? 0 : undefined} aria-label={label}
              onClick={() => n.gene && onGene?.(n.gene)} onKeyDown={(e) => e.key === 'Enter' && n.gene && onGene?.(n.gene)}
              style={{ cursor: n.gene ? 'pointer' : undefined }}>
              <title>{label}</title>
              {hl && <circle r={40} fill="none" stroke="#c48a3a" strokeWidth={3} strokeDasharray="6 4" />}
              {n.process ? (
                <rect x={-70} y={-20} width={140} height={40} rx={20} fill={t.fill} stroke={t.stroke} strokeWidth={2} />
              ) : (
                <circle r={26} fill={t.fill} stroke={isTarget ? '#1a1820' : t.stroke} strokeWidth={isTarget ? 4 : 1.5} />
              )}
              {isTarget && <text y={-32} textAnchor="middle" className="fill-ink text-[14px] font-bold">✕ off</text>}
              <text y={n.process ? 5 : 44} textAnchor="middle" className="fill-ink text-[14px]" style={{ fontWeight: n.process ? 600 : 400 }}>
                {n.label}
              </text>
            </g>
          )
        })}
      </svg>
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-faint sm:hidden">Swipe sideways to see the whole map →</p>
      <figcaption className="font-mono text-[11px] text-muted">
        Simplified map · mRNA, not protein activity · <span style={{ color: UP }}>■ up</span> <span style={{ color: DOWN }}>■ down</span>
      </figcaption>
    </figure>
  )
}

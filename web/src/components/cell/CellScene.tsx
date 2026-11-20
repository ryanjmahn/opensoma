import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import type { LineResult, Meta } from '../../lib/data'
import { scaled } from '../../lib/model'
import { DOWN, UP } from '../playground/PathwayBars'

/*
 * How 3D in the browser works here: three.js draws on the GPU via WebGL. react-three-fiber lets us
 * describe the scene as React components and runs a render loop (~60 frames/s); useFrame runs every
 * frame. The cell is drawn as a "specimen" of square dots, each organelle tinted like a histology stain.
 */

export type Organelle = 'membrane' | 'nucleus' | 'mito' | 'er' | 'golgi' | 'lysosome' | 'cytoplasm'
export type Glow = Partial<Record<Organelle, number>>
type V3 = [number, number, number]

export const ORGANELLES: { id: Organelle; label: string; pos: V3; dist: number; blurb: string }[] = [
  { id: 'membrane', label: 'Cell membrane', pos: [0, 0, 0], dist: 13, blurb: 'The oily skin of the cell. Receptors here catch growth signals from outside.' },
  { id: 'nucleus', label: 'Nucleus', pos: [0, 0, 0], dist: 5.5, blurb: 'Holds the DNA. Genes are read here, and the decision to divide is made here.' },
  { id: 'mito', label: 'Mitochondria', pos: [3.1, 1.2, 1.6], dist: 3, blurb: 'Power plants that make energy, and the trigger point for cell death (apoptosis).' },
  { id: 'er', label: 'Endoplasmic reticulum', pos: [-1.2, 1.6, 2.2], dist: 3.5, blurb: 'A folded factory where many proteins are made and folded. Misfolding sets off a stress alarm.' },
  { id: 'golgi', label: 'Golgi apparatus', pos: [2.4, -1.6, 1.6], dist: 3, blurb: 'The post office: packs and ships proteins.' },
  { id: 'lysosome', label: 'Lysosomes', pos: [-2.8, -1.6, 1.4], dist: 3, blurb: 'Recycling bins that break down old parts.' },
  { id: 'cytoplasm', label: 'Cytoplasm', pos: [1.5, 2.8, 2.4], dist: 4, blurb: 'The jelly between organelles, busy with ribosomes making proteins and signal relays.' },
]

// Histology-stain palette: hematoxylin (nucleus), eosin (mitochondria), iodine (Golgi)…
export const STAIN: Record<Organelle | 'nucleolus' | 'chromatin', string> = {
  membrane: '#7d9f9a', nucleus: '#3d3a8f', chromatin: '#7471c0', nucleolus: '#24225c', mito: '#c4547a',
  er: '#2e7c77', golgi: '#c48a3a', lysosome: '#8a4f7d', cytoplasm: '#a59d90',
}

/** Where each pathway mostly happens (a simplification), used to link rows of bars to parts of the 3D cell. */
export const PATHWAY_ORGANELLE: Record<string, Organelle> = { growth: 'membrane', division: 'nucleus', dna_repair: 'nucleus', death: 'mito', metabolism: 'mito', stress: 'er', translation: 'cytoplasm' }

const GLOW_PATHWAYS: Record<Organelle, string[]> = {
  nucleus: ['division', 'dna_repair'], mito: ['metabolism', 'death'], er: ['stress'], membrane: ['growth'],
  cytoplasm: ['translation'], golgi: [], lysosome: [],
}

/** Map pathway scores onto organelles (a simplification: each pathway is drawn where it mostly happens). */
export function organelleGlow(r: LineResult | null | undefined, meta: Meta): Glow {
  if (!r) return {}
  const s = scaled(r, meta)
  const out: Glow = {}
  for (const [org, ps] of Object.entries(GLOW_PATHWAYS)) {
    const vals = ps.map((p) => s[meta.pathways.findIndex((x) => x.id === p)])
    if (vals.length) out[org as Organelle] = vals.reduce((a, b) => a + b, 0) / vals.length
  }
  return out
}

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// --- point samplers (local coordinates) ---
type Rand = () => number
const unit = (r: Rand): V3 => {
  const th = r() * Math.PI * 2, z = 2 * r() - 1, s = Math.sqrt(1 - z * z)
  return [s * Math.cos(th), z, s * Math.sin(th)]
}
const lumps = (d: V3, amp: number) => 1 + amp * (Math.sin(3.1 * d[0] + 1.3) * Math.sin(2.7 * d[1] + 0.4) + 0.6 * Math.sin(4.3 * d[2] + 2.1) * Math.cos(3.3 * d[0]))

function shell(r: Rand, n: number, radius: number, amp = 0, thickness = 0.04): number[] {
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    const d = unit(r), k = radius * lumps(d, amp) * (1 - r() * thickness)
    out.push(d[0] * k, d[1] * k, d[2] * k)
  }
  return out
}

function ball(r: Rand, n: number, radius: number, c: V3 = [0, 0, 0]): number[] {
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    const d = unit(r), k = radius * Math.cbrt(r())
    out.push(c[0] + d[0] * k, c[1] + d[1] * k, c[2] + d[2] * k)
  }
  return out
}

function transformed(local: number[], pos: V3, rot: V3): number[] {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(1, 1, 1))
  const v = new THREE.Vector3(), out: number[] = []
  for (let i = 0; i < local.length; i += 3) {
    v.set(local[i], local[i + 1], local[i + 2]).applyMatrix4(m)
    out.push(v.x, v.y, v.z)
  }
  return out
}

function capsule(r: Rand, n: number, rad: number, len: number): number[] {
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    const y = (r() - 0.5) * (len + 2 * rad)
    const cap = Math.abs(y) > len / 2 ? Math.sqrt(Math.max(0, rad * rad - (Math.abs(y) - len / 2) ** 2)) : rad
    const th = r() * Math.PI * 2
    out.push(Math.cos(th) * cap, y, Math.sin(th) * cap)
  }
  return out
}

function torusArc(r: Rand, n: number, R: number, tube: number, arc: number): number[] {
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    const u = r() * arc, v = r() * Math.PI * 2
    out.push((R + tube * Math.cos(v)) * Math.cos(u), (R + tube * Math.cos(v)) * Math.sin(u), tube * Math.sin(v))
  }
  return out
}

function useCellPoints(cancer: boolean) {
  return useMemo(() => {
    const r = rng(cancer ? 11 : 5)
    const nucR = cancer ? 2.15 : 1.8
    const mitos: number[] = [], er: number[] = [], golgi: number[] = [], lyso: number[] = []
    // A few mitochondria sit at the camera's 'Mitochondria' stop so a fly-in lands on one; the rest are scattered.
    for (const [pos, rot] of [[[3.1, 1.2, 1.6], [0.3, 0.2, 1.2]], [[3.5, 0.5, 1.0], [1.1, 0.4, 0.2]], [[2.7, 1.8, 2.1], [0.2, 1.3, 0.6]]] as [V3, V3][])
      mitos.push(...transformed(capsule(r, 160, 0.22, 0.7), pos, rot))
    for (let i = 0; i < (cancer ? 12 : 8); i++) {
      const d = unit(r), k = 2.9 + r() * 1.4
      mitos.push(...transformed(capsule(r, 140, 0.22, 0.7), [d[0] * k, d[1] * k, d[2] * k], [r() * 3, r() * 3, r() * 3]))
    }
    for (let i = 0; i < 7; i++) er.push(...transformed(torusArc(r, 260, nucR + 0.5 + i * 0.12, 0.04, Math.PI * 1.3), [0, 0, 0], [r() * 3, r() * 3, 0]))
    for (let i = 0; i < 4; i++) golgi.push(...transformed(torusArc(r, 150, 0.7 - i * 0.08, 0.05, Math.PI * 1.2), [2.4, -1.6 + i * 0.18, 1.6], [Math.PI / 2 + 0.4, 0.8, 0]))
    for (let i = 0; i < 6; i++) {
      const c: V3 = [-2.6 - r() * 0.8, -1.4 - r(), 0.8 + r() * 1.4]
      lyso.push(...ball(r, 70, 0.22, c))
    }
    const ribo: number[] = []
    for (let i = 0; i < 1100; i++) {
      const d = unit(r), k = nucR + 0.5 + r() * (4.6 - nucR)
      ribo.push(d[0] * k, d[1] * k, d[2] * k)
    }
    return {
      membrane: { pts: shell(r, cancer ? 3200 : 2800, 5, cancer ? 0.07 : 0.015, 0.02), size: 0.06 },
      nucleus: { pts: shell(r, 2400, nucR, cancer ? 0.16 : 0.02, 0.06), size: 0.065 },
      chromatin: { pts: ball(r, 900, nucR * 0.9), size: 0.05 },
      nucleolus: { pts: ball(r, 350, cancer ? 0.6 : 0.45, [0.6, 0.5, 0.9]), size: 0.07 },
      mito: { pts: mitos, size: 0.07 },
      er: { pts: er, size: 0.055 },
      golgi: { pts: golgi, size: 0.07 },
      lysosome: { pts: lyso, size: 0.07 },
      cytoplasm: { pts: ribo, size: 0.045 },
    }
  }, [cancer])
}

function Dots({ pts, color, size, glow = 0, dim = false, big = false }: { pts: number[]; color: string; size: number; glow?: number; dim?: boolean; big?: boolean }) {
  const ref = useRef<THREE.PointsMaterial>(null)
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [pts])
  useEffect(() => () => geom.dispose(), [geom])
  const s = Math.min(Math.abs(glow), 1.5) / 1.5
  const col = useMemo(() => new THREE.Color(color).lerp(new THREE.Color(glow >= 0 ? UP : DOWN), s * 0.85), [color, glow, s])
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const base = size * (1 + s * 0.3) * (big ? 1.7 : 1)
  useFrame(({ clock }, dt) => {
    const m = ref.current
    if (!m) return
    // ease opacity and size toward their targets so hover/dim changes glide instead of snapping
    const k = Math.min(1, dt * 8)
    m.opacity += ((dim ? 0.12 : 0.92) - m.opacity) * k
    const pulse = s > 0.1 && !reduce ? 1 + s * 0.6 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 3)) : 1
    m.size += (base * pulse - m.size) * k
  })
  return (
    <points geometry={geom}>
      <pointsMaterial ref={ref} color={col} size={size} sizeAttenuation transparent opacity={0.92} depthWrite={false} />
    </points>
  )
}

/** Invisible shapes so clicks and hovers land on organelles (points alone are hard to hit). */
function HitArea({ o, onSelect, onHover, children, position }: {
  o: Organelle; onSelect?: (o: Organelle) => void; onHover?: (o: Organelle | null) => void; children: React.ReactNode; position?: V3
}) {
  return (
    <mesh position={position}
      onClick={(e) => { e.stopPropagation(); onSelect?.(o) }}
      onPointerOver={(e) => { e.stopPropagation(); onHover?.(o); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { onHover?.(null); document.body.style.cursor = '' }}>
      {children}
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}

export function Cell({ variant, glow = {}, position = [0, 0, 0], onSelect, onHover, hover = null, hidden }: {
  variant: 'cancer' | 'healthy'; glow?: Glow; position?: V3; onSelect?: (o: Organelle) => void
  onHover?: (o: Organelle | null) => void; hover?: Organelle | null; hidden?: Set<Organelle>
}) {
  const cancer = variant === 'cancer'
  const p = useCellPoints(cancer)
  const look = (o: Organelle) => ({ dim: !!hover && hover !== o, big: hover === o })
  const show = (o: Organelle) => !hidden?.has(o)
  const hit = { onSelect, onHover }
  return (
    <group position={position}>
      {show('membrane') && <Dots {...p.membrane} color={STAIN.membrane} glow={glow.membrane} {...look('membrane')} />}
      {show('nucleus') && (
        <>
          <Dots {...p.nucleus} color={STAIN.nucleus} glow={glow.nucleus} {...look('nucleus')} />
          <Dots {...p.chromatin} color={STAIN.chromatin} glow={glow.nucleus} {...look('nucleus')} />
          <Dots {...p.nucleolus} color={STAIN.nucleolus} {...look('nucleus')} />
        </>
      )}
      {show('mito') && <Dots {...p.mito} color={STAIN.mito} glow={glow.mito} {...look('mito')} />}
      {show('er') && <Dots {...p.er} color={STAIN.er} glow={glow.er} {...look('er')} />}
      {show('golgi') && <Dots {...p.golgi} color={STAIN.golgi} {...look('golgi')} />}
      {show('lysosome') && <Dots {...p.lysosome} color={STAIN.lysosome} {...look('lysosome')} />}
      {show('cytoplasm') && <Dots {...p.cytoplasm} color={STAIN.cytoplasm} glow={glow.cytoplasm} {...look('cytoplasm')} />}
      {onSelect && (
        <>
          {show('nucleus') && <HitArea o="nucleus" {...hit}><sphereGeometry args={[cancer ? 2.2 : 1.85, 24, 24]} /></HitArea>}
          {show('mito') && <HitArea o="mito" {...hit} position={[3.1, 1.2, 1.6]}><sphereGeometry args={[0.9, 12, 12]} /></HitArea>}
          {show('golgi') && <HitArea o="golgi" {...hit} position={[2.4, -1.4, 1.6]}><sphereGeometry args={[0.8, 12, 12]} /></HitArea>}
          {show('lysosome') && <HitArea o="lysosome" {...hit} position={[-3, -1.9, 1.5]}><sphereGeometry args={[0.8, 12, 12]} /></HitArea>}
        </>
      )}
    </group>
  )
}

function CameraRig({ focus, origin }: { focus?: Organelle | null; origin: V3 }) {
  const { camera, controls } = useThree() as unknown as { camera: THREE.Camera; controls: { target: THREE.Vector3; update: () => void } | null }
  const [ox, oy, oz] = origin
  const goal = useMemo(() => {
    const o = ORGANELLES.find((x) => x.id === (focus ?? 'membrane'))!
    const target = new THREE.Vector3(...o.pos).add(new THREE.Vector3(ox, oy, oz))
    const dir = o.id === 'membrane' || o.id === 'nucleus' ? new THREE.Vector3(0.25, 0.25, 1) : new THREE.Vector3(...o.pos).normalize()
    return { pos: target.clone().add(dir.normalize().multiplyScalar(o.dist)), target }
  }, [focus, ox, oy, oz])
  const t = useRef(0)
  useEffect(() => { t.current = 0 }, [goal])
  useFrame((_, dt) => {
    if (t.current >= 1) return // after arriving, the user is free to orbit
    t.current = Math.min(1, t.current + dt * 1.2)
    const k = 1 - Math.pow(1 - t.current, 3)
    camera.position.lerp(goal.pos, k * 0.25)
    if (controls) {
      controls.target.lerp(goal.target, k * 0.25)
      controls.update()
    } else camera.lookAt(goal.target) // touch screens before "Rotate & zoom": no controls mounted
  })
  return null
}

interface Label { key: string; pos: V3; text: string; onClick?: () => void; o?: Organelle }

/** Keeps plain HTML labels glued to 3D points: project each point to the screen every frame. */
function LabelProjector({ labels, els }: { labels: Label[]; els: React.RefObject<(HTMLElement | null)[]> }) {
  const v = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera, size }) => {
    labels.forEach((l, i) => {
      const el = els.current?.[i]
      if (!el) return
      v.set(...l.pos).project(camera)
      el.style.display = v.z > 1 ? 'none' : ''
      el.style.transform = `translate(-50%, -50%) translate(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px)`
    })
  })
  return null
}

function Spin({ on, children }: { on: boolean; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((_, dt) => { if (on && ref.current) ref.current.rotation.y += dt * 0.12 })
  return <group ref={ref}>{children}</group>
}

const media = (q: string) => typeof window !== 'undefined' && !!window.matchMedia?.(q).matches

export interface CellSpec { key: string; variant: 'cancer' | 'healthy'; glow?: Glow; title?: string }

export function CellScene({ cells, focus, focusCell = 0, onSelect, labels = true, spin = false, className = 'h-[48vh] lg:h-[60vh]', bare = false, hover = null, onHover, hidden, children }: {
  cells: CellSpec[]; focus?: Organelle | null; focusCell?: number; onSelect?: (o: Organelle, cell: number) => void
  labels?: boolean; spin?: boolean; className?: string; bare?: boolean
  hover?: Organelle | null; onHover?: (o: Organelle | null) => void; hidden?: Set<Organelle>; children?: ReactNode
}) {
  // Phones: stack cells vertically, and leave one-finger swipes to page scrolling until the user opts in.
  const narrow = media('(max-width: 640px)')
  const coarse = media('(pointer: coarse)')
  const [active, setActive] = useState(!coarse)
  const gap = 11.5
  const pos = (i: number): V3 => (narrow ? [0, -(i - (cells.length - 1) / 2) * gap, 0] : [(i - (cells.length - 1) / 2) * gap, 0, 0])
  const zoomOut = cells.length > 1 && !focus
  const labelEls = useRef<(HTMLElement | null)[]>([])
  const labelSpecs: Label[] = cells.flatMap((c, i) => {
    const [x, y, z] = pos(i)
    const out: Label[] = []
    if (c.title) out.push({ key: `${c.key}-title`, pos: [x, y - 5.9, z], text: c.title })
    if (labels && (cells.length === 1 || i === focusCell))
      for (const o of ORGANELLES) {
        if (hidden?.has(o.id)) continue
        const p = o.id === 'membrane' ? [0, 5.4, 0] : o.id === 'nucleus' ? [0, c.variant === 'cancer' ? 2.5 : 2.1, 0] : o.pos
        out.push({ key: `${c.key}-${o.id}`, pos: [x + p[0], y + p[1], z + p[2]], text: o.label, onClick: () => onSelect?.(o.id, i), o: o.id })
      }
    return out
  })
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  return (
    <div className={`relative overflow-hidden ${bare ? '' : 'border border-line bg-[radial-gradient(ellipse_at_center,#fbf9f4_0%,#f3efe8_70%)]'} ${className}`}
      aria-label="3D cell illustration. Use the organelle buttons to move the camera." role="region" {...(active ? { 'data-lenis-prevent': '' } : {})}>
      <Canvas camera={{ position: [0, 2, zoomOut ? (narrow ? 30 : 21) : narrow ? 16 : 13], fov: 45 }} dpr={[1, 2]} gl={{ alpha: true, antialias: true }}>
        <Spin on={spin && !reduce}>
          {cells.map((c, i) => (
            <Cell key={c.key} variant={c.variant} glow={c.glow} position={pos(i)} onSelect={onSelect ? (o) => onSelect(o, i) : undefined}
              onHover={onHover} hover={hover} hidden={hidden} />
          ))}
        </Spin>
        {active && <OrbitControls makeDefault enablePan={false} minDistance={2} maxDistance={45} />}
        {(focus || cells.length === 1) && <CameraRig focus={focus} origin={pos(focusCell)} />}
        <LabelProjector labels={labelSpecs} els={labelEls} />
      </Canvas>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {labelSpecs.map((l, i) => {
          const cls = 'pointer-events-auto absolute left-0 top-0 whitespace-nowrap font-mono uppercase tracking-[0.08em]'
          return l.onClick ? (
            <button key={l.key} ref={(el) => { labelEls.current[i] = el }} onClick={l.onClick}
              onMouseEnter={() => onHover?.(l.o ?? null)} onMouseLeave={() => onHover?.(null)} onFocus={() => onHover?.(l.o ?? null)} onBlur={() => onHover?.(null)}
              className={`${cls} border px-1.5 py-0.5 text-[10px] transition ${hover && hover === l.o ? 'border-ink bg-ink text-paper' : hover ? 'border-ink/20 bg-paper/60 text-ink/40' : 'border-ink/60 bg-paper/85 text-ink hover:bg-ink hover:text-paper'}`}>{l.text}</button>
          ) : (
            <div key={l.key} ref={(el) => { labelEls.current[i] = el }} className={`${cls} border border-ink bg-paper px-2 py-1 text-[11px] text-ink`}>{l.text}</div>
          )
        })}
      </div>
      {children}
      {!bare && <p className="pointer-events-none absolute bottom-2 left-3 font-mono text-[10px] uppercase tracking-[0.1em] text-faint">Illustration · not to scale{active && !coarse ? ' · drag to rotate · scroll to zoom' : ''}</p>}
      {coarse && !bare && (
        <button onClick={() => setActive(!active)} className={`absolute right-2 top-2 ${active ? 'btn-primary' : 'btn bg-paper/90'}`}>
          {active ? 'Done' : 'Rotate & zoom'}
        </button>
      )}
    </div>
  )
}

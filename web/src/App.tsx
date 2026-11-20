import { lazy, Suspense, useEffect, useRef } from 'react'
import { StainDefs } from './components/ui/Stain'
import { DataProvider } from './lib/data'
import { LevelProvider } from './lib/level'
import { AutoReveal, useSmoothScroll } from './lib/motion'
import { useRoute } from './lib/route'
import { Safety, SafetyNote, Teacher, Worksheet } from './pages/Info'
import { Sources } from './pages/Lists'

// 3D-heavy pages load on demand so the first page paints fast.
const Home = lazy(() => import('./pages/Home'))
const Explore = lazy(() => import('./pages/Explore'))
const Play = lazy(() => import('./pages/Play'))
const Compare = lazy(() => import('./pages/Compare'))
const Story = lazy(() => import('./pages/Story'))
const Mission = lazy(() => import('./pages/Mission'))
const Learn = lazy(() => import('./pages/Learn'))
const How = lazy(() => import('./pages/How'))
const Molecule = lazy(() => import('./pages/Molecule'))
const Missions = lazy(() => import('./pages/Missions'))

const NAV = [
  ['explore', 'Explore'], ['play', 'Playground'], ['compare', 'Compare'], ['learn', 'Learn'], ['missions', 'Missions'], ['how', 'How it works'],
]

/** Logo mark: a 5×5 pixel cell with a stained nucleus. */
export function Mark({ className = 'size-5' }: { className?: string }) {
  const on = ['01110', '10001', '10201', '10001', '01110']
  return (
    <svg viewBox="0 0 5 5" className={className} aria-hidden="true" shapeRendering="crispEdges">
      {on.flatMap((row, y) => [...row].map((c, x) => c !== '0' && <rect key={`${x}${y}`} x={x + 0.08} y={y + 0.08} width="0.84" height="0.84" fill={c === '2' ? '#c4547a' : 'currentColor'} />))}
    </svg>
  )
}

function Logo() {
  return (
    <a href="#/" className="flex items-center gap-2" aria-label="OpenSoma home">
      <Mark className="size-6" />
      <span className="font-display text-2xl leading-none tracking-tight">OpenSoma</span>
    </a>
  )
}

/** Thin reading-progress line under the header (the home page has its own). */
function ReadProgress() {
  const bar = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let id = requestAnimationFrame(function tick() {
      const max = document.documentElement.scrollHeight - window.innerHeight
      if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`
      id = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(id)
  }, [])
  return <div ref={bar} className="absolute bottom-[-1px] left-0 h-px w-full origin-left bg-ink" style={{ transform: 'scaleX(0)' }} aria-hidden="true" />
}

function Header() {
  const route = useRoute()
  const links = NAV.map(([id, label]) => {
    const active = route.path[0] === id || (id === 'learn' && route.path[0] === 'story') || (id === 'missions' && route.path[0] === 'mission')
    return (
      <a key={id} href={`#/${id}`} aria-current={active ? 'page' : undefined}
        className={`flex items-center gap-1.5 whitespace-nowrap py-2 font-mono lg:py-1 text-[11px] uppercase tracking-[0.1em] transition ${active ? 'text-ink' : 'text-muted hover:text-ink'}`}>
        <span aria-hidden="true" className={`size-1.5 ${active ? 'bg-eosin' : 'bg-transparent'}`} />{label}
      </a>
    )
  })
  return (
    <header className="no-print sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
      {route.path.length > 0 && <ReadProgress key={route.path.join('/')} />}
      <div className="mx-auto flex max-w-7xl items-center gap-8 px-4 py-3">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-6 lg:flex">{links}</nav>
        <details key={route.path.join("/")} className="relative ml-auto lg:hidden">
          <summary className="btn list-none">Menu</summary>
          <div className="absolute right-0 top-full mt-2 w-60 space-y-1 border border-ink/60 bg-paper p-4 shadow-lg">
            <nav aria-label="Main (mobile)" className="space-y-1">{links}</nav>
          </div>
        </details>
      </div>
    </header>
  )
}

const FOOTER_COLS: [string, [string, string][]][] = [
  ['Play', [['#/explore', 'Explore the cell'], ['#/play', 'Playground'], ['#/compare', 'Compare'], ['#/missions', 'Missions']]],
  ['Learn', [['#/learn', 'Tours and lessons'], ['#/molecule/1IEP', 'Molecules'], ['#/teacher', 'For teachers']]],
  ['About', [['#/how', 'How this works'], ['#/sources', 'Sources'], ['#/safety', 'Not medical advice']]],
]

function Footer() {
  return (
    <footer className="no-print mt-16 sm:mt-24 border-t border-ink/80 bg-card">
      <div className="mx-auto max-w-7xl space-y-12 px-4 py-14">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-5">
            <Mark className="size-10" />
            <p className="max-w-md font-display text-3xl font-light leading-tight sm:text-4xl">A cell you can poke, built from real experiments.</p>
          </div>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
            {FOOTER_COLS.map(([title, links]) => (
              <div key={title} className="space-y-3">
                <p className="eyebrow">{title}</p>
                <ul className="space-y-2 text-sm">
                  {links.map(([h, t]) => <li key={h}><a href={h} className="text-ink/80 hover:text-ink hover:underline">{t}</a></li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="border-l-4 border-l-eosin bg-paper p-5 text-sm text-ink/80">
          <p className="eyebrow mb-2">Not medical advice</p>
          <SafetyNote compact />
        </div>
        <div className="flex flex-wrap justify-between gap-3 border-t border-line pt-5 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
          <span>OpenSoma · open source · built for learning</span>
          <span>Data: Replogle et al. 2022 (CC BY 4.0) · Reactome · UniProt · RCSB PDB</span>
        </div>
      </div>
    </footer>
  )
}

function Page() {
  const route = useRoute()
  const [p] = route.path
  const pages: Record<string, React.ReactNode> = {
    explore: <Explore route={route} />, play: <Play key={route.params.get('a') ?? ''} route={route} />, compare: <Compare route={route} />,
    learn: <Learn />, story: <Story key={route.path[1]} route={route} />, missions: <Missions />, mission: <Mission key={route.path[1]} route={route} />,
    molecule: <Molecule route={route} />, how: <How />, sources: <Sources />, safety: <Safety />, teacher: <Teacher />,
    worksheet: <Worksheet route={route} />,
  }
  return (
    <Suspense fallback={<p className="eyebrow">Loading</p>}>
      {/* key: replay the page-enter animation and reset reveals on every route */}
      <div key={route.path.join('/')} className="page-enter">
        <AutoReveal>{pages[p ?? ''] ?? <Home />}</AutoReveal>
      </div>
    </Suspense>
  )
}

export default function App() {
  useSmoothScroll()
  return (
    <LevelProvider>
      <StainDefs />
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-ink focus:px-3 focus:py-1 focus:text-paper">Skip to content</a>
      <Header />
      <main id="main" className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        <DataProvider><Page /></DataProvider>
      </main>
      <Footer />
    </LevelProvider>
  )
}

import { useEffect, useState } from 'react'
import { scrollToTop } from './motion'

// Hash routing (#/play?a=g:KRAS) works on GitHub Pages with no server config.
export interface Route { path: string[]; params: URLSearchParams }

export function parseHash(hash: string): Route {
  const [p, q = ''] = hash.replace(/^#\/?/, '').split('?')
  return { path: p.split('/').filter(Boolean).map(decodeURIComponent), params: new URLSearchParams(q) }
}

export function useRoute(): Route {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const on = () => {
      setHash(window.location.hash)
      scrollToTop()
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return parseHash(hash)
}

export function href(path: string, params?: Record<string, string | undefined>): string {
  const q = new URLSearchParams(Object.entries(params ?? {}).filter((e): e is [string, string] => !!e[1]))
  const s = q.toString()
  return `#/${path}${s ? `?${s}` : ''}`
}

/** Update query params without adding a history entry or scrolling. */
export function replaceParams(params: Record<string, string | undefined>) {
  const { path, params: cur } = parseHash(window.location.hash)
  for (const [k, v] of Object.entries(params)) {
    if (v) cur.set(k, v)
    else cur.delete(k)
  }
  const s = cur.toString()
  history.replaceState(null, '', `#/${path.join('/')}${s ? `?${s}` : ''}`)
}

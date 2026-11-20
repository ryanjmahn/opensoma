import { createContext, useContext, useState, type ReactNode } from 'react'

export type Level = 'simple' | 'student' | 'deep'
export const LEVELS: { id: Level; label: string }[] = [
  { id: 'simple', label: 'Simple' },
  { id: 'student', label: 'Student' },
  { id: 'deep', label: 'Deep' },
]
/** Content text: either one string for everyone, or one per level. */
export type Leveled = string | Partial<Record<Level, string>>

export function pick(t: Leveled | undefined, level: Level): string {
  if (!t) return ''
  if (typeof t === 'string') return t
  return t[level] ?? t.student ?? t.simple ?? t.deep ?? ''
}

const isLevel = (v: unknown): v is Level => v === 'simple' || v === 'student' || v === 'deep'

function initial(): Level {
  const fromUrl = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('level')
  return isLevel(fromUrl) ? fromUrl : 'simple' // no switch in the UI; teacher share links can still set it
}

const Ctx = createContext<{ level: Level; setLevel: (l: Level) => void }>({ level: 'simple', setLevel: () => {} })

export function LevelProvider({ children }: { children: ReactNode }) {
  const [level, set] = useState<Level>(initial)
  const setLevel = (l: Level) => set(l)
  return <Ctx.Provider value={{ level, setLevel }}>{children}</Ctx.Provider>
}

export const useLevel = () => useContext(Ctx)

export function useText() {
  const { level } = useLevel()
  return (t: Leveled | undefined) => pick(t, level)
}

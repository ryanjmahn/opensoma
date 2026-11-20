// Per-viewer progress (completed lessons, best mission scores). Browser-only convenience; safe if storage is blocked.
const KEY = 'opensoma.progress'
type Progress = Record<string, number>

export function getProgress(): Progress {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function saveProgress(id: string, value: number) {
  try {
    const p = getProgress()
    p[id] = Math.max(p[id] ?? 0, value)
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    /* ignore */
  }
}

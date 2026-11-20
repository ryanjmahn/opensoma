import { useState } from 'react'

/** A list of applied actions, with full undo/redo history. */
export function useStack(initial: string[] = [], max = 4) {
  const [{ history, index }, set] = useState({ history: [initial], index: 0 })
  const stack = history[index]
  const push = (next: string[]) => set({ history: [...history.slice(0, index + 1), next], index: index + 1 })
  return {
    stack, history, index,
    add: (id: string) => { if (!stack.includes(id) && stack.length < max) push([...stack, id]) },
    remove: (id: string) => push(stack.filter((x) => x !== id)),
    clear: () => stack.length && push([]),
    reset: (s: string[] = []) => set({ history: [s], index: 0 }),
    jump: (i: number) => set({ history, index: Math.max(0, Math.min(i, history.length - 1)) }),
    full: stack.length >= max,
  }
}

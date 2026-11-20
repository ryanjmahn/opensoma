import { expect, test } from 'vitest'
import type { Action, LineResult, Meta } from './data'
import { combine, confidence, missionScore } from './model'

const lr = (pw: number[], extra: Partial<LineResult> = {}): LineResult => ({ m: 1, pw, top: [[0, pw[0]]], net: [pw[0], null], ...extra })
const act = (id: string, k: number[], r: number[], extra: Partial<LineResult> = {}): Action => ({ id, type: 'gene', name: id, r: { k562: lr(k, extra), rpe1: lr(r, extra) } })
const meta = { pathways: [{ id: 'growth', scale: 1 }, { id: 'division', scale: 1 }] } as unknown as Meta

test('single action passes through unchanged; combos add up and become predicted', () => {
  const a = act('a', [-0.2, -0.4], [0, 0])
  const b = act('b', [-0.1, -0.1], [0, 0], { m: 0, c: 0.5 })
  expect(combine([a], 'k562')).toBe(a.r.k562)
  const c = combine([a, b], 'k562')!
  expect(c.pw).toEqual([-0.30000000000000004, -0.5])
  expect(c.m).toBe(0)
  expect(c.c).toBeCloseTo(0.4) // min(1, 0.5) * 0.8
  expect(c.net).toEqual([-0.30000000000000004, null])
  expect(combine([], 'k562')).toBeNull()
})

test('confidence bands', () => {
  expect(confidence(lr([0]))).toBe('measured')
  expect(confidence(lr([0], { m: 0, c: 0.6 }))).toBe('high')
  expect(confidence(lr([0], { m: 0, c: 0.3 }))).toBe('medium')
  expect(confidence(lr([0], { m: 0, c: 0.1 }))).toBe('low')
})

test('mission score: perfect hit is 100, harm subtracts, adaptation fades the first move', () => {
  const goal = { cell: 'k562' as const, pathways: { division: -0.5 } }
  const hit = act('hit', [0, -0.5], [0, 0])
  const harmful = act('harm', [0, -0.5], [1, 1])
  expect(missionScore([hit], goal, meta).score).toBe(100)
  expect(missionScore([], goal, meta).score).toBe(0)
  expect(missionScore([harmful], { ...goal, harmWeight: 0.5 }, meta).score).toBe(50)
  const adapted = missionScore([hit], goal, meta, { recovery: 0.7 })
  expect(adapted.target[1]).toBeCloseTo(-0.15)
})

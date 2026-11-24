import { describe, expect, it } from 'vitest'
import { simulate } from './sim.ts'

// Pace guard (docs/ECONOMY.md §3): a bot playing 150 active minutes a day against the real server logic.
// Wide bands on purpose: they catch broken balance, not single-digit tuning.
describe('pace', () => {
  it('levels at the planned speed over three days', async () => {
    const r = await simulate({ days: 3, activeMinPerDay: 150, seed: 0.5 })
    // level 10 within the first 40 minutes (0.0.6: no quest money any more, so the first boosters come a little later)
    expect(r.levels[10]!.activeMin).toBeLessThanOrEqual(40)
    expect(r.levels[20]!.day).toBeLessThanOrEqual(2)
    expect(r.levels[30]?.day ?? 99).toBeLessThanOrEqual(3)
    expect(r.finalLevel).toBeGreaterThanOrEqual(30)
    expect(r.finalLevel).toBeLessThanOrEqual(50)
    // idle income and quests carry the money, the Kartenladen is not a money printer
    expect((r.income.ankauf ?? 0) / Object.values(r.income).reduce((s, v) => s + v, 0)).toBeLessThan(0.1)
  }, 300_000)
})

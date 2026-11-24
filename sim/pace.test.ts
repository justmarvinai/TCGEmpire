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
    // Since 0.0.6 level 30 lands right at the end of day 3 (about 6,8 of the 7,5 active hours), so it is a coin flip
    // whether a run reaches it on day 3 or 4: 0.0.10 measured 11 of 20 seeds on day 3. The band checks the level
    // after three days instead, which was 28-33 in all 20 runs.
    expect(r.finalLevel).toBeGreaterThanOrEqual(28)
    expect(r.finalLevel).toBeLessThanOrEqual(50)
    // idle income and quests carry the money, the Kartenladen is not a money printer
    expect((r.income.ankauf ?? 0) / Object.values(r.income).reduce((s, v) => s + v, 0)).toBeLessThan(0.1)
  }, 300_000)
})

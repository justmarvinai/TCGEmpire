// pnpm sim [days] [active minutes per day]: prints the pace table and the income mix.
import { simulate } from './sim.ts'

const days = Number(process.argv[2] ?? 3)
const minutes = Number(process.argv[3] ?? 150)
const started = Date.now()
const r = await simulate({ days, activeMinPerDay: minutes })
console.log(`\nSimulation: ${days} days, ${minutes} active minutes per day (${((Date.now() - started) / 1000).toFixed(0)} s)\n`)
console.log('Level | active h | day')
for (const l of [5, 10, 15, 20, 25, 30, 35, 40, 45, 50]) {
  const x = r.levels[l]
  if (x) console.log(`${String(l).padStart(5)} | ${(x.activeMin / 60).toFixed(1).padStart(8)} | ${x.day}`)
}
console.log(`\nFinal level ${r.finalLevel}, net worth ${(r.netWorthCents / 100).toFixed(0)} €`)
const total = Object.values(r.income).reduce((s, v) => s + v, 0)
console.log('\nIncome by source')
for (const [k, v] of Object.entries(r.income).sort((a, b) => b[1] - a[1]))
  console.log(`${k.padEnd(14)} ${(v / 100).toFixed(0).padStart(10)} €  ${((v / total) * 100).toFixed(0).padStart(3)} %`)
const graded = r.slabs.reduce<Record<string, number>>((m, s) => ({ ...m, [s]: (m[s] ?? 0) + 1 }), {})
console.log(`\nSlabs at the end: ${r.slabs.length}${r.slabs.length ? ` (${Object.entries(graded).map(([k, n]) => `${n}× ${k}`).join(', ')})` : ''}`)

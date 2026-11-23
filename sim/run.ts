// pnpm sim [days] [active minutes per day] [exits]: prints the pace table and the income mix; with exits the bot
// leaves at level 100 (prestige) that many times and each run gets its own line.
import { simulate } from './sim.ts'

const days = Number(process.argv[2] ?? 3)
const minutes = Number(process.argv[3] ?? 150)
const prestiges = Number(process.argv[4] ?? 0)
const started = Date.now()
const r = await simulate({ days, activeMinPerDay: minutes, prestiges })
console.log(`\nSimulation: ${days} days, ${minutes} active minutes per day (${((Date.now() - started) / 1000).toFixed(0)} s)\n`)
console.log('Level | active h | day')
for (const l of [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100]) {
  const x = r.levels[l]
  if (x) console.log(`${String(l).padStart(5)} | ${(x.activeMin / 60).toFixed(1).padStart(8)} | ${x.day}`)
}
if (prestiges) {
  console.log('\nRun | first day | days to L25 / L50 / L75 / L100 | exit day | Sterne | peak net worth | days to the previous peak')
  r.runs.forEach((x, i) =>
    console.log(`${String(i + 1).padStart(3)} | ${String(x.startDay).padStart(9)} | ${[25, 50, 75, 100].map((l) => x.levels[l] ?? '–').join(' / ').padStart(30)} | ${String(x.exitDay ?? '–').padStart(8)} | ${String(x.stars ?? '–').padStart(6)} | ${(x.peakNetWorthCents / 100).toFixed(0).padStart(14)} € | ${x.prevPeakDay ?? '–'}`),
  )
}
console.log(`\nFinal level ${r.finalLevel}, net worth ${(r.netWorthCents / 100).toFixed(0)} €`)
const total = Object.values(r.income).reduce((s, v) => s + v, 0)
console.log('\nIncome by source')
for (const [k, v] of Object.entries(r.income).sort((a, b) => b[1] - a[1]))
  console.log(`${k.padEnd(14)} ${(v / 100).toFixed(0).padStart(10)} €  ${((v / total) * 100).toFixed(0).padStart(3)} %`)
const graded = r.slabs.reduce<Record<string, number>>((m, s) => ({ ...m, [s]: (m[s] ?? 0) + 1 }), {})
console.log(`\nSlabs at the end: ${r.slabs.length}${r.slabs.length ? ` (${Object.entries(graded).map(([k, n]) => `${n}× ${k}`).join(', ')})` : ''}`)
if (r.company) {
  const c = r.company
  console.log(`\nCompany: stage ${c.stage}, ${c.staff} staff, value ${(c.valueCents / 100).toFixed(0)} €, cash ${(c.cashCents / 100).toFixed(0)} €`)
  console.log(`  capacity ${c.capacity}/h, customers ${c.demand}/h, accuracy ${c.accuracy} %, Ruf ${c.ruf}, equipment ${JSON.stringify(c.equipment)}`)
  console.log('Day        | company profit | other income | company share')
  for (const d of c.days)
    console.log(`${d.day} | ${(d.profit / 100).toFixed(0).padStart(14)} | ${(d.other / 100).toFixed(0).padStart(12)} | ${((d.profit / Math.max(1, d.profit + d.other)) * 100).toFixed(0).padStart(4)} %`)
}
if (r.jobErrors.length) console.log(`\nFailed tick jobs:\n${r.jobErrors.join('\n')}`)
console.log(`\nEvents: ${Object.entries(r.events).map(([k, n]) => `${k} ${n}`).join(', ') || 'none'}`)
console.log(`\nNotifications: ${Object.entries(r.notes).filter(([k]) => k.startsWith('company') || k.startsWith('staff')).map(([k, n]) => `${k} ${n}`).join(', ')}`)
console.log(`\nDatabase at the end: ${r.db.mb} MB (${r.db.tables})`)
if (r.failures.length) console.log(`\nFailed bot actions: ${r.failures.join('; ')}`)

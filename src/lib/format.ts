// All number formatting for the UI. German conventions. Money arrives as integer cents.

const nf0 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 })
const nf2 = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const BIG: [number, string][] = [
  [1e15, 'Brd.'],
  [1e12, 'Bio.'],
  [1e9, 'Mrd.'],
  [1e6, 'Mio.'],
]

/** 12,50 € · 12.345 € · 1,23 Mio. € · 4,56 Mrd. € */
export function formatMoney(cents: number): string {
  const sign = cents < 0 ? '−' : ''
  const euros = Math.abs(cents) / 100
  for (const [size, unit] of BIG) {
    if (euros >= size) return `${sign}${nf2.format(Math.floor((euros / size) * 100) / 100)} ${unit} €`
  }
  if (euros >= 1000) return `${sign}${nf0.format(Math.floor(euros))} €`
  return `${sign}${nf2.format(euros)} €`
}

export function formatNumber(n: number): string {
  for (const [size, unit] of BIG) {
    if (Math.abs(n) >= size) return `${nf2.format(Math.floor((n / size) * 100) / 100)} ${unit}`
  }
  return nf0.format(n)
}

/** Preisniveau and other multipliers: ×1,00 */
export function formatFactor(x: number): string {
  return `×${nf2.format(x)}`
}

/** Ruf 0–1000 as stars 0,0–5,0 */
export function formatStars(ruf: number): string {
  return new Intl.NumberFormat('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(ruf / 200)
}

/** 45 s · 12 min · 2 h 05 min · 3 T 4 h */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  if (s < 60) return `${s} s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} h ${String(m % 60).padStart(2, '0')} min`
  return `${Math.floor(h / 24)} T ${h % 24} h`
}

/** Relative time for the feed: gerade eben · vor 5 min · vor 3 h · vor 2 T */
export function formatAgo(iso: string, nowMs: number): string {
  const s = Math.max(0, (nowMs - new Date(iso).getTime()) / 1000)
  if (s < 45) return 'gerade eben'
  if (s < 3600) return `vor ${Math.round(s / 60)} min`
  if (s < 86400) return `vor ${Math.round(s / 3600)} h`
  return `vor ${Math.round(s / 86400)} T`
}

/** Clock time for "läuft bis": 14:05 */
export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

/** Fills a content text with a count: {n} is the number, [Snack|Snacks] picks singular or plural. */
export function fillCount(text: string, n: number): string {
  return text.replace(/\[([^|\]]*)\|([^\]]*)\]/g, (_, one: string, many: string) => (n === 1 ? one : many)).replace('{n}', formatNumber(n))
}

/** Relative change as a signed percentage: 0.023 -> +2,3 % */
export function formatPercent(x: number): string {
  return `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1, minimumFractionDigits: 1, signDisplay: 'exceptZero' }).format(x * 100)} %`
}

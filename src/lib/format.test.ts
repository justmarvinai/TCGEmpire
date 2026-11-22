import { describe, expect, it } from 'vitest'
import { fillCount, formatAgo, formatPercent, formatDuration, formatFactor, formatMoney, formatStars } from './format.ts'

describe('format', () => {
  it('formats money on our price scale', () => {
    expect(formatMoney(1250)).toBe('12,50 €')
    expect(formatMoney(40000)).toBe('400,00 €')
    expect(formatMoney(1234599)).toBe('12.345 €')
    expect(formatMoney(123456789)).toBe('1,23 Mio. €')
    expect(formatMoney(4.567e11)).toBe('4,56 Mrd. €')
    expect(formatMoney(8.9e15)).toBe('89,00 Bio. €')
    expect(formatMoney(-1500)).toBe('−15,00 €')
  })
  it('formats factors, stars and durations', () => {
    expect(formatFactor(1)).toBe('×1,00')
    expect(formatFactor(4.17)).toBe('×4,17')
    expect(formatStars(500)).toBe('2,5')
    expect(formatDuration(45)).toBe('45 s')
    expect(formatDuration(7500)).toBe('2 h 05 min')
    expect(formatDuration(100000)).toBe('1 T 3 h')
  })
  it('formats relative time', () => {
    const now = Date.parse('2026-11-21T12:00:00Z')
    expect(formatAgo('2026-11-21T11:59:50Z', now)).toBe('gerade eben')
    expect(formatAgo('2026-11-21T11:30:00Z', now)).toBe('vor 30 min')
    expect(formatAgo('2026-11-19T12:00:00Z', now)).toBe('vor 2 T')
  })
})

describe('fillCount', () => {
  it('fills the number and picks singular or plural', () => {
    expect(fillCount('Gönn dir heute {n} [Snack|Snacks].', 1)).toBe('Gönn dir heute 1 Snack.')
    expect(fillCount('Gönn dir heute {n} [Snack|Snacks].', 2)).toBe('Gönn dir heute 2 Snacks.')
    expect(fillCount('Verkauf {n} Karten.', 1500)).toBe('Verkauf 1.500 Karten.')
  })
})

describe('formatPercent', () => {
  it('shows a signed change with one decimal', () => {
    expect(formatPercent(0.023)).toBe('+2,3 %')
    expect(formatPercent(-0.1)).toBe('-10,0 %')
    expect(formatPercent(0)).toBe('0,0 %')
  })
})

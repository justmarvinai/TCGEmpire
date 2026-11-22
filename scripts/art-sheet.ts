/**
 * Contact sheets for the art review, written to art/.sheets/ (not committed).
 * Every card is shown at ×4, ×2 and ×1 on the dark UI background, next to its foil mask. The label
 * gives id, name, tier and the number of colours in the artwork (limit: 32).
 * Usage: pnpm art:sheet [filter]   filter = part of a card id or name, or: tiers, fonts, products
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { CardDef } from '../art/cards/types.ts'
import { TIERS } from '../art/cards/types.ts'
import { CHARSET, FONTS, REGULAR, drawText } from '../art/fonts.ts'
import { encodePng } from '../art/png.ts'
import { PRODUCTS } from '../art/products/index.ts'
import type { CardSet } from '../art/sets.ts'
import { SETS } from '../art/sets.ts'
import { Painter, hex } from '../art/toolkit/index.ts'

const OUT = fileURLToPath(new URL('../art/.sheets/', import.meta.url))
const BACKGROUND = hex('0e1018')
const TEXT = hex('f3f5fa')
const MUTED = hex('7f88a3')
const WHITE = hex('ffffff')
const GAP = 12
const PER_PAGE = 4

const filter = (process.argv[2] ?? '').toLowerCase()
const wanted = (name: string) => filter === '' || name.toLowerCase().includes(filter)

function save(name: string, p: Painter): void {
  writeFileSync(`${OUT}${name}.png`, encodePng(p.w, p.h, p.data))
  console.log(`art/.sheets/${name}.png  ${p.w}×${p.h}`)
}

/** Text at double size, so labels stay readable next to ×4 cards. */
function label(sheet: Painter, text: string, x: number, y: number, color = TEXT): void {
  const line = new Painter(Math.ceil(sheet.w / 2), 12)
  drawText(line, text, 0, 1, REGULAR, color)
  sheet.blit(line.scaled(2), x, y)
}

/** One picture at ×4, ×2 and ×1, plus an optional extra picture at ×1 (the foil mask). */
function trio(sheet: Painter, picture: Painter, x: number, y: number, extra?: Painter): void {
  sheet.blit(picture.scaled(4), x, y)
  sheet.blit(picture.scaled(2), x + picture.w * 4 + GAP, y)
  sheet.blit(picture, x + picture.w * 4 + GAP, y + picture.h * 2 + GAP)
  if (extra) sheet.blit(extra, x + picture.w * 5 + GAP * 2, y + picture.h * 2 + GAP)
}

function cardSheets(set: CardSet): void {
  const cards = set.cards.filter((c) => wanted(c.id) || wanted(c.name))
  const cellW = 80 * 6 + GAP * 2
  const cellH = 26 + 112 * 4
  for (let page = 0; page * PER_PAGE < cards.length; page++) {
    const batch = cards.slice(page * PER_PAGE, (page + 1) * PER_PAGE)
    const columns = Math.min(2, batch.length)
    const sheet = new Painter(
      GAP + columns * (cellW + GAP),
      GAP + Math.ceil(batch.length / 2) * (cellH + GAP),
    ).clear(BACKGROUND)
    batch.forEach((def, i) => {
      const x = GAP + (i % 2) * (cellW + GAP)
      const y = GAP + Math.floor(i / 2) * (cellH + GAP)
      const r = set.render(def)
      const foil = new Painter(r.card.w, r.card.h)
      r.foil.each((fx, fy) => foil.set(fx, fy, WHITE))
      label(sheet, `${def.id}  ${def.name}  ${def.tier}  ${r.art.colors().size}c`, x, y)
      trio(sheet, r.card, x, y + 26, foil)
    })
    const suffix = filter === '' ? '' : `-${filter.replace(/[^a-z0-9]+/g, '-')}`
    save(`${set.id}${suffix}-${String(page + 1).padStart(2, '0')}`, sheet)
  }
}

/** The same artwork in every tier treatment, at ×2. */
function tierSheet(set: CardSet): void {
  // one character card of any game (Pokémon, monster, character, unit) shown through every tier
  const classic = set.cards.find(
    (c) => ['pokemon', 'monster', 'character', 'unit'].includes(c.kind) && c.tier !== 'ultra' && c.tier !== 'grail',
  )
  const full = set.cards.find((c) => c.tier === 'ultra' || c.tier === 'grail')
  const sheet = new Painter(GAP + TIERS.length * (160 + GAP), GAP * 2 + 26 + 224).clear(BACKGROUND)
  TIERS.forEach((tier, i) => {
    const base = tier === 'ultra' || tier === 'grail' ? full : classic
    if (!base) return
    const def: CardDef = {
      ...base,
      tier,
      foil:
        tier === 'common' || tier === 'uncommon' || tier === 'rare'
          ? 'none'
          : base.tier === tier
            ? base.foil
            : 'art',
    }
    const x = GAP + i * (160 + GAP)
    label(sheet, tier, x, GAP, MUTED)
    sheet.blit(set.render(def).card.scaled(2), x, GAP + 26)
  })
  save(`${set.id}-tiers`, sheet)
}

function fontSheet(): void {
  const samples = [
    'Glurak 120 KP · Feuerwirbel 100',
    'Blauäugiger w. Drache · Nidoran♂ ♀',
    'Größe: 1,7 m × 90,5 kg (Öl & Äther)?!',
  ]
  const chars = [...CHARSET]
  const lines = [
    chars.slice(0, 32).join(''),
    chars.slice(32, 64).join(''),
    chars.slice(64).join(''),
    ...samples,
  ]
  const sheet = new Painter(700, GAP + FONTS.length * (lines.length * 14 * 3 + GAP * 2)).clear(BACKGROUND)
  FONTS.forEach((f, i) => {
    const block = new Painter(232, lines.length * 14)
    lines.forEach((line, j) => drawText(block, line, 1, 2 + j * 14, f, TEXT))
    sheet.blit(block.scaled(3), GAP, GAP + i * (lines.length * 14 * 3 + GAP * 2))
  })
  save('fonts', sheet)
}

function productSheet(): void {
  const products = PRODUCTS.filter((p) => filter === 'products' || wanted(p.id))
  if (products.length === 0) return
  const cellW = Math.max(...products.map((p) => p.w * 6 + GAP * 2))
  const cellH = 26 + Math.max(...products.map((p) => p.h * 4))
  const sheet = new Painter(GAP + products.length * (cellW + GAP), GAP * 2 + cellH).clear(BACKGROUND)
  products.forEach((product, i) => {
    const art = new Painter(product.w, product.h)
    product.draw(art)
    const x = GAP + i * (cellW + GAP)
    label(sheet, `${product.id}  ${art.colors().size}c`, x, GAP)
    trio(sheet, art, x, GAP + 26)
  })
  save('products', sheet)
}

mkdirSync(OUT, { recursive: true })
for (const set of SETS) {
  cardSheets(set)
  if (filter === '' || filter === 'tiers') tierSheet(set)
}
if (filter === '' || filter === 'fonts') fontSheet()
productSheet()

/**
 * Builds the art atlases into public/atlas/ (not committed, rebuilt on every build):
 *   <set>.png + <set>.json      all cards of a set in a grid: { cell: {w,h}, items: { id: {x,y} } }
 *   <set>-foil.png              same grid, white where the card shines, transparent elsewhere
 *   products.png + .json        packed products: { items: { id: {x,y,w,h} } }
 * Usage: pnpm art:build
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { encodePng } from '../art/png.ts'
import { PRODUCTS } from '../art/products/index.ts'
import { SETS } from '../art/sets.ts'
import { Painter, hex } from '../art/toolkit/index.ts'

const OUT = fileURLToPath(new URL('../public/atlas/', import.meta.url))
const COLUMNS = 10
const PRODUCT_ROW_WIDTH = 512
const WHITE = hex('ffffff')

function save(name: string, p: Painter): void {
  writeFileSync(OUT + name, encodePng(p.w, p.h, p.data))
}

function saveJson(name: string, value: unknown): void {
  writeFileSync(OUT + name, JSON.stringify(value, null, 2) + '\n')
}

mkdirSync(OUT, { recursive: true })

for (const set of SETS) {
  const cards = [...set.cards].sort((a, b) => a.id.localeCompare(b.id))
  const rendered = cards.map((def) => set.render(def))
  const cell = { w: rendered[0]?.card.w ?? 0, h: rendered[0]?.card.h ?? 0 }
  const columns = Math.min(COLUMNS, cards.length)
  const rows = Math.ceil(cards.length / COLUMNS)
  const atlas = new Painter(columns * cell.w, rows * cell.h)
  const foil = new Painter(atlas.w, atlas.h)
  const items: Record<string, { x: number; y: number }> = {}
  rendered.forEach((r, i) => {
    const x = (i % COLUMNS) * cell.w
    const y = Math.floor(i / COLUMNS) * cell.h
    atlas.blit(r.card, x, y)
    r.foil.each((fx, fy) => foil.set(x + fx, y + fy, WHITE))
    items[cards[i]?.id ?? ''] = { x, y }
  })
  save(`${set.id}.png`, atlas)
  save(`${set.id}-foil.png`, foil)
  saveJson(`${set.id}.json`, { cell, items })
  console.log(`${set.id}: ${cards.length} cards, ${atlas.w}×${atlas.h}`)
}

{
  const products = [...PRODUCTS].sort((a, b) => a.id.localeCompare(b.id))
  const items: Record<string, { x: number; y: number; w: number; h: number }> = {}
  let x = 0
  let y = 0
  let rowHeight = 0
  let width = 0
  for (const product of products) {
    if (x > 0 && x + product.w > PRODUCT_ROW_WIDTH) {
      x = 0
      y += rowHeight
      rowHeight = 0
    }
    items[product.id] = { x, y, w: product.w, h: product.h }
    x += product.w
    width = Math.max(width, x)
    rowHeight = Math.max(rowHeight, product.h)
  }
  const atlas = new Painter(width, y + rowHeight)
  for (const product of products) {
    const art = new Painter(product.w, product.h)
    product.draw(art)
    const at = items[product.id]
    if (at) atlas.blit(art, at.x, at.y)
  }
  save('products.png', atlas)
  saveJson('products.json', { items })
  console.log(`products: ${products.length} items, ${atlas.w}×${atlas.h}`)
}

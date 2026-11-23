import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { TUTORIAL } from '../../../content/tutorial.ts'
import { NAV } from '@/app/nav.ts'
import { texts } from '@/texts/de.ts'
import { TOUR_TARGETS } from './tourTargets.ts'

// Every id the coach looks for must be marked somewhere in the UI, or the spotlight silently never appears.
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : f.endsWith('.tsx') ? [join(dir, f)] : []))
const source = files('src').map((f) => readFileSync(f, 'utf8')).join('\n')
const marked = (id: string) => source.includes(`"${id}"`) || source.includes(`'${id}'`)
const paths = new Set(NAV.flatMap((g) => g.items.map((i) => i.path)))

describe('coach targets', () => {
  it('every feature tour has one target per step, each marked in the UI', () => {
    for (const [key, targets] of Object.entries(TOUR_TARGETS)) {
      expect(targets.length, key).toBe((texts.tour.features as Record<string, { steps: readonly string[] }>)[key]!.steps.length)
      for (const id of targets) if (id) expect(marked(id), `${key}: ${id}`).toBe(true)
    }
  })

  it('every tutorial target is a menu entry or marked in the UI', () => {
    for (const step of TUTORIAL) {
      for (const { target } of step.guide ?? []) {
        if (target.startsWith('nav:')) expect(paths.has(target.slice(4)), target).toBe(true)
        else expect(marked(target), target).toBe(true)
      }
    }
  })
})

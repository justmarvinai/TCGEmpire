import { SETS } from '../sets.ts'
import type { ProductDef } from './index.ts'
import type { Grader } from './slab.ts'
import { SLAB, renderSlab } from './slab.ts'

/** A sample slab of a Basis-Set card; if the card has no art yet, `fallbackId` takes its place. */
function sample(
  id: string,
  cardId: string,
  fallbackId: string,
  grader: Grader,
  grade: number,
  cert: string,
): ProductDef {
  return {
    id,
    ...SLAB,
    draw(p) {
      const set = SETS.find((s) => s.id === 'pokemon-base')
      const def = set?.cards.find((c) => c.id === cardId) ?? set?.cards.find((c) => c.id === fallbackId)
      if (!set || !def) return
      const subtitle = `Basis-Set · ${String(def.number).padStart(3, '0')}`
      p.blit(renderSlab({ card: set.render(def).card, grader, grade, title: def.name, subtitle, cert }))
    },
  }
}

export const SLAB_SAMPLES: readonly ProductDef[] = [
  sample('slab-psa-glurak-10', 'pkm-base-090', 'pkm-base-090', 'psa', 10, '40117352'),
  sample('slab-bgs-pikachu-95', 'pkm-base-084', 'pkm-base-028', 'bgs', 9.5, '00902841'),
  sample('slab-cgc-garados-9', 'pkm-base-027', 'pkm-base-028', 'cgc', 9, '38650127'),
]

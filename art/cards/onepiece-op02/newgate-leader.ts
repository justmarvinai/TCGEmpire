import type { Mask, Painter, Pt } from '../../toolkit/index.ts'
import { colors, hex, noise, rng } from '../../toolkit/index.ts'
import type { CardDef } from '../types.ts'

/**
 * Edward.Newgate (Leader, Alt-Art, Ultra). Brief: the old captain seated on his ship's whale
 * figurehead, bisento across his knees, chin up, coat billowing; the sky cracked like glass by his
 * quake power, crew silhouettes behind. Full art, 80×112.
 *
 * Composition: Newgate sits enthroned on the white whale head of his ship, knees wide, his right fist
 * planted on his knee, his left hand holding the bisento whose shaft crosses his lap; its blade rises
 * beside his head on the right. His white coat hangs over his shoulders and its left side billows out
 * in the wind. Behind him the red war sky shatters like glass, the cracks radiating from behind his
 * head; crew silhouettes raise their weapons at the rail on both sides, white spray bursts up where
 * the bow breaks the wave. The frame covers the outer 4 pixels and its plates rows 1–13 and 90–108.
 */
const SKY = colors('2a0710', '561020', '8a1a24', 'bc3226', 'e05a2a', 'f6913a')
const CRACK = colors('9ee8f4', 'eefcff')
const BONE = colors('5c5464', '9a8f98', 'd0c6bc', 'f4eee2')
const SKIN = colors('4c1e1c', '8c4630', 'c27448', 'e8a272')
const INK = colors('0e0a12', '262030', '443c4c')
const NAVY = colors('1a2240', '2e3c66', '4a5a8a')
const STEEL = [hex('6a7488'), hex('b8c4d4'), CRACK[1]] as const
const GOLD = colors('8a5a16', 'e0a838')
const OUTLINE = hex('0c0408')

const HORIZON = 66
/** The epicentre of the quake, right behind his head. */
const QUAKE: Pt = [40, 24]

/**
 * Newgate's head, chin up: the black bandana, deep-set eyes under heavy brows, and the white crescent
 * moustache whose points sweep up beside his cheeks.
 */
const HEAD = [
  '.........kkkkkk.........',
  '......kkkBBBBBBkkk......',
  '.....kBBbbbBBBBBBBk.....',
  '....kBbbbBBBBBBBBBBk....',
  '....kBbbBBBBBBBBBBBk....',
  '...kBBBBBBBBBBBBBBBBk...',
  '...kkkkkkkkkkkkkkkkkk...',
  '...shhhffffffffffffss...',
  '...shfffffSffSffffffs...',
  '...sKKKKKffffffKKKKKs...',
  'WW.sfKeKffSffSffKeKfs.wW',
  'wWWsffffSfffffsSffffsWWg',
  '.gwWWfffffsffSfffffWWwg.',
  '..gwwWWfffSSSSfffWWwwg..',
  '...ggwwWWWWWWWWWWwwgg...',
  '...ssgggwwwwwwwwgggss...',
  '....sffSggggggggSffs....',
  '....sffSSmmmmmmSSffs....',
  '....sffffffffffffffs....',
  '.....sffffffffffffs.....',
  '......sfhhhfffffss......',
  '.......sffffffffs.......',
  '.........ssssss.........',
]
const HEAD_KEY = {
  k: OUTLINE,
  K: OUTLINE,
  B: INK[1],
  b: INK[2],
  S: SKIN[0],
  s: SKIN[1],
  f: SKIN[2],
  h: SKIN[3],
  W: BONE[3],
  w: BONE[2],
  g: BONE[1],
  e: SKIN[3],
  m: OUTLINE,
}
const HX = 28
const HY = 12

/** The red war sky, orange at the horizon, the dark sea below. */
function sky(p: Painter): void {
  p.register(SKY).register(BONE)
  p.dither(
    null,
    SKY,
    (x, y) => Math.pow(Math.min(1, y / HORIZON), 1.3) * 1.05 + noise(x, y, 3, 9) * 0.12 - 0.06,
    0.7,
  )
  const sea = p.m().rect(0, HORIZON, 80, 46)
  p.dither(sea, [SKY[3], SKY[2], SKY[1], SKY[0]], (_x, y) => (y - HORIZON) / 14, 0.6)
  p.fill(p.m().rect(0, HORIZON, 80, 1), SKY[5])
}

/** The point where a crack first gets `r` pixels away from the epicentre. */
function along(line: readonly Pt[], r: number): Pt {
  for (const q of line) if (Math.hypot(q[0] - QUAKE[0], q[1] - QUAKE[1]) >= r) return q
  return line[line.length - 1] ?? QUAKE
}

/**
 * The sky shattered like glass: straight, kinked cracks radiating from behind his head, short
 * cross-cracks between them, and a few loose shards that catch the light.
 */
function cracks(p: Painter): void {
  const rand = rng(29)
  const spokes: Pt[][] = []
  for (let i = 0; i < 13; i++) {
    let a = (i / 13) * Math.PI * 2 + (rand() - 0.5) * 0.35
    let [x, y] = QUAKE
    const line: Pt[] = [[x, y]]
    for (let k = 0; k < 12 && x > -4 && x < 84 && y > -4 && y < HORIZON; k++) {
      a += (rand() - 0.5) * 0.45
      const step = 5 + rand() * 6
      x += Math.cos(a) * step
      y += Math.sin(a) * step
      line.push([x, y])
    }
    spokes.push(line)
  }
  const web = p.m()
  for (const line of spokes) web.path(line)
  const shards = p.m()
  spokes.forEach((line, i) => {
    const next = spokes[(i + 1) % spokes.length] ?? line
    // one or two straight cross-cracks to the next spoke, at irregular distances
    const r0 = 12 + rand() * 10
    const r1 = r0 + 9 + rand() * 12
    const a0 = along(line, r0)
    const b0 = along(next, r0 + (rand() - 0.5) * 8)
    web.path([a0, b0])
    if (i % 2 === 0) {
      const a1 = along(line, r1)
      const b1 = along(next, r1 + (rand() - 0.5) * 8)
      web.path([a1, b1])
      if (i % 4 === 0) shards.poly([a0, b0, b1, a1])
    }
  })
  const above = p.m().rect(0, 0, 80, HORIZON - 1)
  p.shine(true)
  p.tone(shards.and(above), 1)
  p.fill(web.and(above), CRACK[0])
  p.fill(
    web
      .clone()
      .and(p.m().disc(QUAKE[0], QUAKE[1], 22))
      .and(above),
    CRACK[1],
  )
  p.shine(false)
}

/** Crew silhouettes at the rail behind him, swords and rifles raised against the bright horizon. */
function crew(p: Painter): void {
  const m = (): Mask => p.m()
  const crowd = m().rect(0, 61, 80, 5)
  for (const [x, top, arm] of [
    [5, 55, 1],
    [11, 56, -1],
    [68, 53, -1],
    [74, 55, 1],
  ] as const) {
    crowd
      .disc(x, top, 2.2)
      .poly([x - 3, top + 2, x + 3, top + 2, x + 3.5, 62, x - 3.5, 62])
      .limb([x + arm * 2.5, top + 3, x + arm * 4, top - 2], 1.1)
      .line(x + arm * 4, top - 2, x + arm * 6, top - 10)
  }
  p.fill(crowd, SKY[0])
  p.fill(m().rect(0, 60, 80, 1), SKY[1])
}

/** White spray bursting up where the bow breaks the wave. */
function spray(p: Painter): void {
  const foam = p.m()
  for (const [x, y, rx, ry, s] of [
    [5, 82, 7, 9, 3],
    [10, 74, 4, 5, 5],
    [75, 82, 7, 9, 9],
    [70, 74, 4, 5, 11],
  ] as const)
    foam.blob(x, y, rx, ry, s, 0.35)
  p.dither(foam, [BONE[1], BONE[2], BONE[3]], (x, y) => 1.3 - (y - 66) / 24 + noise(x, y, 5, 3) * 0.4, 0.6)
  p.shine(true)
  const rand = rng(23)
  for (let i = 0; i < 12; i++) {
    const x = i % 2 === 0 ? 3 + rand() * 14 : 63 + rand() * 14
    p.px(Math.floor(x), Math.floor(67 + rand() * 6), BONE[3])
  }
  p.shine(false)
}

/** The whale figurehead under him: a broad white head, small eyes, a long mouth line. */
function whale(d: Painter): void {
  const m = (): Mask => d.m()
  const head = m().ellipse(40, 100, 23, 27)
  d.part(head, BONE, { bevel: 12 })
  d.fill(m().path([21, 84, 28, 88, 40, 89, 52, 88, 59, 84]), BONE[0])
  d.fill(m().path([24, 86, 28, 89]).path([56, 86, 52, 89]), BONE[1])
  for (const x of [27, 51]) {
    d.fill(m().rect(x, 79, 3, 2), INK[0])
    d.px(x, 79, BONE[3])
  }
}

function newgate(d: Painter): void {
  const m = (): Mask => d.m()
  // the coat: its left side billows out in the wind, the right hangs behind his arm
  const coat = m().poly([
    24, 36, 16, 33, 9, 35, 4, 40, 2, 47, 6, 45, 6, 51, 10, 48, 12, 53, 15, 49, 19, 54, 23, 50, 56, 50, 58,
    66, 62, 82, 66, 76, 70, 84, 71, 62, 68, 44, 58, 36,
  ])
  d.part(coat, BONE, { bevel: 5 })
  // its dark lining shows under the billowing side
  d.part(m().poly([5, 42, 3, 46, 6, 44, 7, 49, 10, 46, 12, 51, 15, 47, 17, 41]), INK, { bevel: 2, line: 'none' })
  // lower legs hanging down beside the whale's head, black boots
  d.part(m().limb([18, 74, 16, 84, 16, 96], [5.5, 5, 5]), NAVY, { bevel: 3 })
  d.part(m().limb([62, 74, 64, 84, 64, 96], [5.5, 5, 5]), NAVY, { bevel: 3 })
  d.part(m().rect(10, 86, 12, 12), INK, { bevel: 2 })
  d.part(m().rect(58, 86, 12, 12), INK, { bevel: 2 })
  whale(d)
  // the lap: thighs reaching out to his knees
  d.part(m().limb([33, 64, 19, 71], 7), NAVY, { bevel: 5 })
  d.part(m().limb([47, 64, 61, 71], 7), NAVY, { bevel: 5 })
  // the torso: a giant's chest, scarred; the sash
  const torso = m().poly([23, 38, 57, 38, 55, 50, 53, 63, 27, 63, 25, 50])
  d.part(torso, SKIN, { bevel: 8 })
  d.part(m().ellipse(32.5, 45, 7.5, 5.5), SKIN, { bevel: 4, line: 'shadow' })
  d.part(m().ellipse(47.5, 45, 7.5, 5.5), SKIN, { bevel: 4, line: 'shadow' })
  d.fill(m().path([40, 43, 40, 58]), SKIN[1])
  d.fill(m().path([29, 41, 36, 48]).path([44, 51, 50, 46]).path([32, 54, 37, 57]), SKIN[0])
  d.part(m().poly([26, 59, 54, 59, 55, 66, 25, 66]), INK, { bevel: 2 })
  // right arm (his right, on the left): a massive arm, the fist planted on his knee
  d.part(m().limb([23, 41, 16, 51, 14, 60], [7, 6, 5.5]), SKIN)
  d.part(m().limb([14, 60, 18, 67], [5.5, 5]), SKIN)
  d.part(m().ellipse(19.5, 70, 6, 4.6), SKIN, { bevel: 3 })
  d.fill(m().path([15, 69, 24, 69]).path([17, 71, 17, 72]).path([20, 71, 20, 72]), SKIN[1])
  // left arm: elbow out, the hand gripping the bisento's shaft at his chest
  d.part(m().limb([57, 41, 64, 50, 67, 59], [7, 6, 5.5]), SKIN)
  d.part(m().limb([67, 59, 61, 55], [5.5, 5]), SKIN)
  // the coat lies over his shoulders like a mantle
  d.part(m().poly([16, 39, 22, 35, 31, 33, 49, 33, 58, 35, 64, 39, 66, 44, 58, 41, 49, 37, 31, 37, 22, 41, 14, 44]), BONE, {
    bevel: 3,
  })
  // neck and head
  d.part(m().rect(33, 31, 14, 7), SKIN, { bevel: 4 })
  d.tone(m().rect(33, 32, 14, 2), -1)
  d.stamp(HEAD, HX, HY, HEAD_KEY)
  // bandana knot tails flying out behind his head
  d.part(m().limb([30, 17, 25, 15, 21, 16], [1.6, 1.4, 1]), INK, { line: 'shadow' })
  d.part(m().limb([30, 19, 26, 21, 22, 23], [1.4, 1.2, 0.9]), INK, { line: 'shadow' })
}

/** The bisento: a long black shaft across his lap, the broad curved blade rising beside his head. */
function bisento(d: Painter): void {
  const m = (): Mask => d.m()
  d.part(m().limb([38, 100, 51, 72, 64, 46], 1.6), INK, { bevel: 1 })
  d.part(m().limb([63, 48, 65, 44], 2.6), GOLD, { bevel: 1 })
  const blade = m().poly([63, 44, 62, 37, 64, 28, 68, 20, 72, 16, 74, 22, 72, 31, 68, 40, 66, 45])
  d.part(blade, STEEL, { bevel: 3 })
  d.fill(m().path([64, 42, 66, 31, 70, 21]).and(blade), STEEL[2])
  // the hand closes round the shaft
  d.part(m().ellipse(60, 53, 4.6, 4), SKIN, { bevel: 2 })
  d.fill(m().path([57, 52, 61, 55]), SKIN[1])
}

export const newgateLeader: CardDef = {
  id: 'op02-084',
  number: 84,
  name: 'Edward.Newgate (Leader, Alt-Art)',
  tier: 'ultra',
  kind: 'leader',
  element: 'Rot',
  print: { life: 6, power: 6000, type: 'Kaiser/Whitebeard-Bande' },
  // the cracks in the sky, the shards between them and the spray shine; Newgate stays matt
  foil: 'painted',
  draw(p) {
    sky(p)
    cracks(p)
    crew(p)
    spray(p)
    const d = p.layer()
    newgate(d)
    bisento(d)
    p.subject(d, OUTLINE)
  },
}

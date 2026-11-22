// Contracts between the SQL RPCs and the client. Every RPC answer is parsed with one of these;
// the SQL tests parse real answers with the same schemas.
import { z } from 'zod'

export const zPlayer = z.object({
  id: z.string(),
  username: z.string(),
  cash_cents: z.number(),
  level: z.number(),
  ep: z.number(),
  ep_to_next: z.number().nullable(),
  skill_points: z.number(),
  ruf: z.number(),
  pfandbons: z.number(),
  energy: z.number(),
  energy_max: z.number(),
  prestige: z.number(),
  stars: z.number(),
  is_admin: z.boolean(),
  energy_at: z.string(),
  energy_regen_s: z.number(),
  tutorial_step: z.number(),
  sealed_total: z.number(),
  net_worth_cents: z.number(),
  quests_ready: z.number(),
  created_at: z.string(),
})
export type Player = z.infer<typeof zPlayer>

export const zServer = z.object({
  time: z.string(),
  version: z.string(),
  price_level: z.number(),
  has_invite_code: z.boolean(),
})

export const zMe = z.object({ player: zPlayer.nullable(), server: zServer })
export type Me = z.infer<typeof zMe>

const zEntry = z.object({ id: z.number(), kind: z.string(), data: z.record(z.string(), z.unknown()), at: z.string() })
export type FeedEntry = z.infer<typeof zEntry>

export const zSync = zMe.extend({ notifications: z.array(zEntry), feed: z.array(zEntry) })
export type Sync = z.infer<typeof zSync>

// One schema per RPC. A test fails if an RPC has no entry here.
// login reports wrong credentials as a value (so the failed attempt is stored), everything else throws.
export const zLogin = z.union([
  z.object({ error: z.string() }),
  zMe.extend({ error: z.null() }),
])

const withPlayer = { player: zPlayer }

export const zPulledCard = z.object({
  card_id: z.string(),
  tier: z.string(),
  kind: z.string(),
  value_cents: z.number(),
  new: z.boolean(),
  copy_id: z.string().nullable(),
})
export type PulledCard = z.infer<typeof zPulledCard>

export const zPackOpen = z.object({
  packs: z.array(z.object({ cards: z.array(zPulledCard), value_cents: z.number() })),
  total_value_cents: z.number(),
  price_cents: z.number(),
  ...withPlayer,
})
export type PackOpen = z.infer<typeof zPackOpen>

export const zShop = z.object({
  kiosk: z.array(
    z.object({ product_id: z.string(), price_cents: z.number(), bought_today: z.number(), daily_limit: z.number() }),
  ),
  sealed: z.array(z.object({ product_id: z.string(), qty: z.number() })),
})
export type Shop = z.infer<typeof zShop>

export const zBinder = z.object({
  set_id: z.string(),
  cards: z.array(
    z.object({
      card_id: z.string(),
      qty: z.number(),
      value_cents: z.number(),
      ankauf_cents: z.number(),
      discovered: z.boolean(),
      copies: z.array(z.string()),
    }),
  ),
})
export type Binder = z.infer<typeof zBinder>
export type BinderCard = Binder['cards'][number]

export const zQuests = z.object({
  mini: z.array(
    z.object({
      id: z.number(),
      template: z.string(),
      target: z.number(),
      progress: z.number(),
      reward_cents: z.number(),
      reward_ep: z.number(),
      reward_pfandbons: z.number(),
    }),
  ),
  claimed_total: z.number(),
  bonus_every: z.number(),
})
export type Quests = z.infer<typeof zQuests>

export const zLevelPath = z.object({
  levels: z.array(z.object({ level: z.number(), ep: z.number(), reward_cents: z.number(), booster: z.boolean() })),
})

export const RPC_SCHEMAS = {
  me_get: zMe,
  join: zMe,
  login: zLogin,
  logout: zMe,
  sync: zSync,
  shop_get: zShop,
  store_buy: z.object({ bought: z.number(), paid_cents: z.number(), ...withPlayer }),
  pack_open: zPackOpen,
  binder_get: zBinder,
  ankauf_sell: z.object({ sold: z.number(), payout_cents: z.number(), ...withPlayer }),
  quests_get: zQuests,
  quest_claim: zQuests.extend({ bonus_booster: z.boolean(), ...withPlayer }),
  tutorial_ack: z.object(withPlayer),
  tutorial_skip: z.object(withPlayer),
  minigame_start: z.object({ run_id: z.string(), duration_s: z.number(), ...withPlayer }),
  minigame_finish: z.object({
    score: z.number(),
    payout_cents: z.number(),
    ep_gained: z.number(),
    pfandbons: z.number(),
    ...withPlayer,
  }),
  level_path_get: zLevelPath,
} as const
export type RpcName = keyof typeof RPC_SCHEMAS

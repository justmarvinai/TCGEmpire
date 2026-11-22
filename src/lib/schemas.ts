// Contracts between the SQL RPCs and the client. Every RPC answer is parsed with one of these;
// the SQL tests parse real answers with the same schemas.
import { z } from 'zod'

export const zPlayer = z.object({
  id: z.string(),
  username: z.string(),
  title: z.string().nullable(),
  buffs: z.array(z.object({ key: z.string(), expires_at: z.string() })),
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

export const zMe = z.object({ player: zPlayer.nullable(), server: zServer, away_s: z.number() })
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
  snacks: z.array(z.object({ key: z.string(), price_cents: z.number().nullable(), pfandbons: z.number().nullable() })),
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

const zQuest = z.object({
  id: z.number(),
  template: z.string(),
  target: z.number(),
  progress: z.number(),
  reward_cents: z.number(),
  reward_ep: z.number(),
  reward_pfandbons: z.number(),
  claimed: z.boolean(),
})
export type Quest = z.infer<typeof zQuest>

export const zQuests = z.object({
  mini: z.array(zQuest),
  daily: z.array(zQuest),
  weekly: z.array(zQuest),
  claimed_total: z.number(),
  bonus_every: z.number(),
  reroll_free: z.boolean(),
  daily_bonus_cents: z.number(),
  daily_bonus_done: z.boolean(),
  weekly_chest_boosters: z.number(),
  weekly_bonus_done: z.boolean(),
  unlock_daily: z.number(),
  unlock_weekly: z.number(),
  stamps: z.object({
    unlocked: z.boolean(),
    unlock_level: z.number(),
    days: z.number(),
    today_done: z.boolean(),
    joker_available: z.boolean(),
    rewards: z.array(z.number()),
  }),
})
export type Quests = z.infer<typeof zQuests>

export const zBunker = z.object({
  unlocked: z.boolean(),
  unlock_level: z.number(),
  rate_cents: z.number().optional(),
  capacity_h: z.number().optional(),
  content_cents: z.number().optional(),
  accrual_at: z.string().optional(),
  interest_pct: z.number().optional(),
  interest_fill: z.number().optional(),
  security: z.number().optional(),
  stage: z.number().optional(),
})
export type Bunker = z.infer<typeof zBunker>

export const zUpgrades = z.object({
  unlock_level: z.number(),
  upgrades: z.array(
    z.object({
      key: z.string(),
      group: z.string(),
      level: z.number(),
      max: z.number(),
      cost_cents: z.number().nullable(),
      need_level: z.number(),
      now: z.number(),
      next: z.number().nullable(),
    }),
  ),
})
export type Upgrades = z.infer<typeof zUpgrades>

const zShift = z.object({
  job: z.string(),
  started_at: z.string(),
  ends_at: z.string(),
  checkins: z.number(),
  checkin_max: z.number(),
  next_checkin_at: z.string(),
  done: z.boolean(),
  wage_cents: z.number(),
})
export type Shift = z.infer<typeof zShift>

export const zJobs = z.object({
  unlock_shifts: z.number(),
  checkin_bonus_pct: z.number(),
  jobs: z.array(
    z.object({
      key: z.string(),
      min_level: z.number(),
      minigame: z.string().nullable(),
      energy: z.number().nullable(),
      shifts: z.boolean(),
      hours: z.number(),
      rank: z.number(),
      wage_cents: z.number().nullable(),
    }),
  ),
  shift: zShift.nullable(),
})
export type Jobs = z.infer<typeof zJobs>

export const zHome = z.object({
  last_hit: z.object({ card_id: z.string(), tier: z.string(), value_cents: z.number(), pulled_at: z.string() }).nullable(),
})
export type Home = z.infer<typeof zHome>

export const zStats = z.object({
  counters: z.record(z.string(), z.number()),
  achievements: z.array(z.object({ key: z.string(), tier: z.number(), at: z.string() })),
  titles: z.array(z.string()),
  title: z.string().nullable(),
})
export type Stats = z.infer<typeof zStats>

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
  quest_reroll: zQuests.extend({ bonus_booster: z.boolean(), ...withPlayer }),
  stamp_claim: zQuests.extend({ bonus_booster: z.boolean(), ...withPlayer }),
  bunker_get: zBunker,
  home_get: zHome,
  bunker_collect: z.object({ collected_cents: z.number(), interest_cents: z.number(), bunker: zBunker, ...withPlayer }),
  upgrades_get: zUpgrades,
  upgrade_buy: zUpgrades.extend({ bunker: zBunker, ...withPlayer }),
  jobs_get: zJobs,
  shift_start: zJobs.extend(withPlayer),
  shift_checkin: zJobs.extend(withPlayer),
  shift_claim: zJobs.extend({
    result: z.object({ job: z.string(), hours: z.number(), wage_cents: z.number(), done: z.boolean() }),
    ...withPlayer,
  }),
  consumable_use: z.object(withPlayer),
  stats_get: zStats,
  title_set: z.object(withPlayer),
  recap_get: z.object({ bunker: zBunker, shift: zShift.nullable() }),
  recap_collect: z.object({ bunker_cents: z.number(), shift_cents: z.number(), ...withPlayer }),
  account_reset: zMe,
  account_delete: zMe,
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

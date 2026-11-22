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
  stores: z.array(
    z.object({
      key: z.string(),
      min_level: z.number(),
      open: z.boolean(),
      shared: z.boolean(),
      next_restock_at: z.string().nullable(),
      offers: z.array(
        z.object({
          product_id: z.string(),
          min_level: z.number(),
          price_cents: z.number(),
          left: z.number().nullable(),
          total: z.number().nullable(),
          restocked_at: z.string().nullable(),
          limit: z.number(),
          bought: z.number(),
        }),
      ),
    }),
  ),
  lager: z.object({ used: z.number(), cap: z.number(), unlock_level: z.number() }),
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

export const zMarketItem = z.object({
  item_id: z.string(),
  kind: z.enum(['card', 'sealed']),
  set_id: z.string(),
  value_cents: z.number(),
  change_pct: z.number(),
  phase: z.string(),
  game_hype: z.number(),
  hype: z.number(),
  /** [unix seconds, cents] */
  history: z.array(z.tuple([z.number(), z.number()])),
})
export type MarketItem = z.infer<typeof zMarketItem>

export const zMarketOverview = z.object({
  games: z.array(z.object({ game: z.string(), hype: z.number() })),
  sets: z.array(z.object({ set_id: z.string(), phase: z.string(), packs_opened: z.number() })),
  movers: z.array(z.object({ item_id: z.string(), kind: z.string(), value_cents: z.number(), change_pct: z.number() })),
})
export type MarketOverview = z.infer<typeof zMarketOverview>

const zTrader = z.object({ id: z.string(), kind: z.enum(['player', 'npc']), name: z.string(), ruf: z.number() })
const zMyMarket = z.object({
  listings: z.array(z.object({ id: z.number(), item_kind: z.string(), item_id: z.string(), qty: z.number(), price_cents: z.number(), value_cents: z.number() })),
  orders: z.array(z.object({ id: z.number(), item_kind: z.string(), item_id: z.string(), qty: z.number(), price_cents: z.number(), value_cents: z.number() })),
  parcels: z.array(
    z.object({ id: z.number(), item_id: z.string(), qty: z.number(), total_cents: z.number(), payout_cents: z.number(), arrives_at: z.string(), incoming: z.boolean() }),
  ),
  slots: z.number(),
  used: z.number(),
})
export const zCardmarket = z.object({
  unlocked: z.boolean(),
  unlock_level: z.number(),
  items: z.array(
    z.object({
      item_id: z.string(),
      kind: z.enum(['card', 'sealed']),
      value_cents: z.number(),
      change_pct: z.number(),
      offers: z.number(),
      from_cents: z.number().nullable(),
      best_order_cents: z.number().nullable(),
    }),
  ),
  mine: zMyMarket,
})
export type Cardmarket = z.infer<typeof zCardmarket>
export const zCardmarketItem = z.object({
  item_id: z.string(),
  kind: z.enum(['card', 'sealed']),
  value_cents: z.number(),
  listings: z.array(z.object({ id: z.number(), item_kind: z.string(), qty: z.number(), price_cents: z.number(), seller: zTrader, mine: z.boolean() })),
  orders: z.array(z.object({ id: z.number(), qty: z.number(), price_cents: z.number(), buyer: zTrader, mine: z.boolean() })),
  sales: z.array(z.object({ qty: z.number(), price_cents: z.number(), at: z.string() })),
  owned: z.object({ qty: z.number(), copies: z.array(z.string()) }),
})
export type CardmarketItem = z.infer<typeof zCardmarketItem>
const zMarketWrite = z.object({ item: zCardmarketItem, mine: zMyMarket, player: zPlayer })
export const zSeller = z.object({
  seller: zTrader,
  listings: z.array(z.object({ id: z.number(), item_kind: z.string(), item_id: z.string(), qty: z.number(), price_cents: z.number(), value_cents: z.number() })),
})

export const zAds = z.object({
  unlocked: z.boolean(),
  unlock_level: z.number(),
  slots: z.number(),
  board: z.array(
    z.object({
      id: z.number(),
      seller: z.string().nullable(),
      seller_idx: z.number(),
      npc: z.boolean(),
      style: z.enum(['attic', 'normal', 'dreamer']),
      title_idx: z.number(),
      item_kind: z.enum(['card', 'copy', 'sealed']),
      item_id: z.string(),
      qty: z.number(),
      ask_cents: z.number(),
      value_cents: z.number(),
      created_at: z.string(),
      expires_at: z.string(),
      mine: z
        .object({
          price_cents: z.number(),
          state: z.string(),
          counter_cents: z.number().nullable(),
          reply_kind: z.string().nullable(),
          reply_idx: z.number().nullable(),
        })
        .nullable(),
    }),
  ),
  mine: z.array(
    z.object({
      id: z.number(),
      item_kind: z.string(),
      item_id: z.string(),
      qty: z.number(),
      ask_cents: z.number(),
      value_cents: z.number(),
      expires_at: z.string(),
      offers: z.array(
        z.object({ id: z.number(), name: z.string(), archetype: z.string(), price_cents: z.number(), reply_kind: z.string().nullable(), reply_idx: z.number().nullable() }),
      ),
    }),
  ),
  owned: z.object({
    stacks: z.array(z.object({ item_id: z.string(), qty: z.number() })),
    copies: z.array(z.object({ copy_id: z.string(), item_id: z.string() })),
    sealed: z.array(z.object({ item_id: z.string(), qty: z.number() })),
  }),
})
export type Ads = z.infer<typeof zAds>
const zAdsWrite = z.object({ ads: zAds, player: zPlayer })

export const zHome = z.object({
  last_hit: z.object({ card_id: z.string(), tier: z.string(), value_cents: z.number(), pulled_at: z.string() }).nullable(),
  worth: z.object({
    now_cents: z.number(),
    /** [unix seconds, cents], hourly for a week, ending now */
    history: z.array(z.tuple([z.number(), z.number()])),
    day_open_cents: z.number().nullable(),
  }),
})
export type Home = z.infer<typeof zHome>

// Direkthandel and gifts
const zGoodsItem = z.object({
  kind: z.enum(['card', 'copy', 'sealed']),
  item_id: z.string(),
  copy_id: z.string().nullable().optional(),
  qty: z.number(),
})
export type GoodsItem = z.infer<typeof zGoodsItem>
export interface Goods {
  money_cents: number
  items: GoodsItem[]
}
const zGoodsDoc = z.object({
  money_cents: z.number(),
  items: z.array(zGoodsItem.extend({ value_cents: z.number() })),
  value_cents: z.number(),
})
export const zTrades = z.object({
  allowance_left_cents: z.number(),
  allowance_cents: z.number(),
  tax_bps: z.number(),
  locked_until: z.string(),
  unlock_level: z.number(),
  open: z.array(
    z.object({
      id: z.number(),
      mine: z.boolean(),
      from: z.object({ id: z.string(), name: z.string() }),
      to: z.object({ id: z.string(), name: z.string() }),
      give: zGoodsDoc,
      take: zGoodsDoc,
      my_tax_cents: z.number(),
      created_at: z.string(),
      expires_at: z.string(),
    }),
  ),
})
export type Trades = z.infer<typeof zTrades>
export type TradeDoc = Trades['open'][number]
export const zPlayers = z.object({
  players: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      title: z.string().nullable(),
      level: z.number(),
      online: z.boolean(),
      last_seen_at: z.string(),
      me: z.boolean(),
      locked_until: z.string(),
      is_admin: z.boolean(),
    }),
  ),
  trades: zTrades,
})
export type Players = z.infer<typeof zPlayers>
export const zTradeInventory = z.object({
  items: z.array(zGoodsItem.extend({ value_cents: z.number() })),
  cash_cents: z.number().nullable(),
})
export type TradeInventory = z.infer<typeof zTradeInventory>
export const zTradeQuote = z.object({
  give_cents: z.number(),
  take_cents: z.number(),
  my_tax_cents: z.number(),
  their_tax_cents: z.number(),
  allowance_left_cents: z.number(),
})
const zTradeWrite = z.object({ trades: zTrades, player: zPlayer })

export const TOPLISTS = ['worth', 'level', 'cash', 'collection'] as const
export type ToplistId = (typeof TOPLISTS)[number]
export const zToplist = z.object({
  list: z.enum(TOPLISTS),
  npcs: z.boolean(),
  cards_total: z.number(),
  rows: z.array(
    z.object({
      rank: z.number(),
      kind: z.enum(['player', 'npc']),
      id: z.string(),
      name: z.string(),
      title: z.string().nullable(),
      level: z.number(),
      value: z.number(),
      me: z.boolean(),
    }),
  ),
})
export type Toplist = z.infer<typeof zToplist>

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
  toplist_get: zToplist,
  players_get: zPlayers,
  trade_inventory: zTradeInventory,
  trade_quote: zTradeQuote,
  gift_send: zTradeWrite.extend({ value_cents: z.number(), tax_cents: z.number() }),
  trade_offer: zTradeWrite,
  trade_answer: zTradeWrite.extend({ tax_cents: z.number() }),
  market_item: zMarketItem,
  market_overview: zMarketOverview,
  retail_buy: z.object({ bought: z.number(), paid_cents: z.number(), player: zPlayer }),
  display_unbox: z.object({ boosters: z.number(), player: zPlayer }),
  ads_get: zAds,
  ad_offer: z.object({
    result: z.object({ state: z.enum(['accepted', 'countered', 'blocked']), outcome: z.enum(['ok', 'ghost', 'fake', 'knick']), counter_cents: z.number().nullable(), price_cents: z.number() }),
    ads: zAds,
    player: zPlayer,
  }),
  ad_post: zAdsWrite,
  ad_remove: zAdsWrite,
  ad_answer: zAdsWrite,
  cardmarket_get: zCardmarket,
  cardmarket_item: zCardmarketItem,
  seller_get: zSeller,
  listing_create: zMarketWrite,
  listing_cancel: zMarketWrite,
  listing_buy: zMarketWrite,
  order_create: zMarketWrite,
  order_cancel: zMarketWrite,
  order_fill: zMarketWrite,
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

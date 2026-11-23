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

export const zSync = zMe.extend({
  notifications: z.array(zEntry),
  feed: z.array(zEntry),
  chat_unread: z.number(),
  chat_last_id: z.number(),
})
export type Sync = z.infer<typeof zSync>

// One schema per RPC. A test fails if an RPC has no entry here.
// login reports wrong credentials as a value (so the failed attempt is stored), everything else throws.
export const zLogin = z.union([
  z.object({ error: z.string() }),
  zMe.extend({ error: z.null() }),
])

const withPlayer = { player: zPlayer }

/** Stil (alpha_07): what friends see of a player. */
export const zLook = z.object({ name_color: z.string().nullable(), frame: z.string().nullable(), avatar_card: z.string().nullable() })
export type Look = z.infer<typeof zLook>
// Ehre: kept and broken deals (alpha_08)
export const zHonor = z.object({
  kept: z.number(),
  broken: z.number(),
  title: z.enum(['solide', 'ehrenmann', 'schlitzohr', 'judas']).nullable(),
  schufa_until: z.string().nullable(),
})
export type Honor = z.infer<typeof zHonor>

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

// Grading: the label of a slab (null for a raw copy)
/** psa, bgs, cgc or a player company as 'co:<id>' */
export const zGrader = z.union([z.enum(['psa', 'bgs', 'cgc']), z.templateLiteral(['co:', z.number()])])
export type GraderKey = z.infer<typeof zGrader>
export const zSlab = z.object({
  grader: zGrader,
  grade: z.number(),
  subgrades: z.array(z.number()).nullable(),
  black_label: z.boolean(),
  cert_no: z.string(),
  pop: z.number(),
  pop_higher: z.number(),
  company: z.object({ id: z.number(), name: z.string(), label: z.object({ bg: z.string(), fg: z.string(), emblem: z.string() }) }).nullable().optional(),
})
export type SlabLabel = z.infer<typeof zSlab>
const zSlabCopy = z.object({ copy_id: z.string(), slab: zSlab, value_cents: z.number() })

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
      slabs: z.array(zSlabCopy.extend({ location: z.string() })),
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
  listings: z.array(
    z.object({ id: z.number(), item_kind: z.string(), item_id: z.string(), qty: z.number(), price_cents: z.number(), value_cents: z.number(), slab: zSlab.nullable() }),
  ),
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
  listings: z.array(
    z.object({
      id: z.number(),
      item_kind: z.string(),
      qty: z.number(),
      price_cents: z.number(),
      seller: zTrader,
      mine: z.boolean(),
      slab: zSlab.nullable(),
      value_cents: z.number(),
    }),
  ),
  orders: z.array(z.object({ id: z.number(), qty: z.number(), price_cents: z.number(), buyer: zTrader, mine: z.boolean() })),
  sales: z.array(z.object({ qty: z.number(), price_cents: z.number(), at: z.string(), slab: z.string().nullable() })),
  owned: z.object({ qty: z.number(), copies: z.array(z.string()), slabs: z.array(zSlabCopy) }),
})
export type CardmarketItem = z.infer<typeof zCardmarketItem>
const zMarketWrite = z.object({ item: zCardmarketItem, mine: zMyMarket, player: zPlayer })
export const zSeller = z.object({
  seller: zTrader,
  listings: z.array(
    z.object({ id: z.number(), item_kind: z.string(), item_id: z.string(), qty: z.number(), price_cents: z.number(), value_cents: z.number(), slab: zSlab.nullable() }),
  ),
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
      suspicious: z.boolean(),
      /** the seller's pain threshold, only with the keystone Der Pate */
      min_cents: z.number().nullable(),
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
      slab: zSlab.nullable(),
      expires_at: z.string(),
      offers: z.array(
        z.object({ id: z.number(), name: z.string(), archetype: z.string(), price_cents: z.number(), reply_kind: z.string().nullable(), reply_idx: z.number().nullable() }),
      ),
    }),
  ),
  owned: z.object({
    stacks: z.array(z.object({ item_id: z.string(), qty: z.number() })),
    copies: z.array(z.object({ copy_id: z.string(), item_id: z.string(), slab: zSlab.nullable(), value_cents: z.number() })),
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
  items: z.array(zGoodsItem.extend({ value_cents: z.number(), slab: zSlab.nullable() })),
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
      look: zLook,
      honor: zHonor,
    }),
  ),
  trades: zTrades,
  friends: z.object({
    unlock_level: z.number(),
    done: z.record(z.string(), z.array(z.enum(['aushelfen', 'kaffee']))),
    help_minutes: z.number(),
    kaffee_pct: z.number(),
    kaffee_minutes: z.number(),
  }),
})
export type Players = z.infer<typeof zPlayers>
export const zTradeInventory = z.object({
  items: z.array(zGoodsItem.extend({ value_cents: z.number(), slab: zSlab.nullable().optional() })),
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

export const zChat = z.object({
  messages: z.array(
    z.object({
      id: z.number(),
      name: z.string().nullable(),
      level: z.number().nullable(),
      title: z.string().nullable(),
      me: z.boolean(),
      body: z.string(),
      item_id: z.string().nullable(),
      at: z.string(),
      look: zLook.nullable(),
    }),
  ),
  online: z.array(z.object({ id: z.string(), name: z.string(), level: z.number() })),
})
export type Chat = z.infer<typeof zChat>

export const SET_PHASES = ['announced', 'preorder', 'print', 'last_wave', 'oop', 'vintage'] as const
export const zAdmin = z.object({
  sets: z.array(
    z.object({
      id: z.string(),
      phase: z.enum(SET_PHASES),
      phase_at: z.string().nullable(),
      oop_at: z.string().nullable(),
      packs_opened: z.number(),
      sealed_left: z.number(),
      sealed_at_oop: z.number().nullable(),
    }),
  ),
  stores: z.array(
    z.object({
      key: z.string(),
      due_at: z.string().nullable(),
      waves: z.array(z.object({ product_id: z.string(), wave_at: z.string(), qty_total: z.number(), qty_left: z.number() })),
    }),
  ),
  price_level: z.number(),
  config: z.array(z.object({ key: z.string(), value: z.unknown(), override: z.unknown().nullable() })),
  systems: z.array(
    z.object({ name: z.string(), every_seconds: z.number(), last_run_at: z.string().nullable(), enabled: z.boolean(), failed_24h: z.number() }),
  ),
  job_runs: z.array(z.object({ name: z.string(), started_at: z.string(), ms: z.number(), ok: z.boolean(), error: z.string().nullable() })),
  economy: z.array(z.object({ day: z.string(), reason: z.string(), cents: z.number(), n: z.number() })),
  players: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      level: z.number(),
      cash_cents: z.number(),
      net_worth_cents: z.number(),
      created_at: z.string(),
      last_seen_at: z.string(),
      is_admin: z.boolean(),
    }),
  ),
})
export type Admin = z.infer<typeof zAdmin>

export const zLicenses = z.object({
  fav_game: z.enum(['pokemon', 'yugioh', 'onepiece', 'riftbound']).nullable(),
  owned: z.array(z.enum(['pokemon', 'yugioh', 'onepiece', 'riftbound'])),
  allowed: z.number(),
  levels: z.array(z.number()),
  next_fee_cents: z.number().nullable(),
})
export type Licenses = z.infer<typeof zLicenses>
const zLicensesWrite = z.object({ licenses: zLicenses, player: zPlayer })

export const zGoals = z.object({
  goals: z.array(
    z.object({
      key: z.string(),
      set_id: z.string(),
      total: z.number(),
      have: z.number(),
      done_at: z.string().nullable(),
      stat: z.string(),
      op: z.enum(['flat', 'pct']),
      value: z.number(),
    }),
  ),
})
export type Goals = z.infer<typeof zGoals>

export const TOPLISTS = ['worth', 'level', 'cash', 'collection', 'ruf', 'best_pull', 'league', 'pechvogel', 'luxus'] as const
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
      look: zLook.nullable(),
      /** best_pull: the card */
      card_id: z.string().nullable(),
    }),
  ),
  week_ends_at: z.string(),
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

// Grading (alpha_06)
const zRange = z.tuple([z.number(), z.number()])
export const zGrading = z.object({
  unlock_level: z.number(),
  slots: z.number(),
  used: z.number(),
  width: z.number(),
  upcharge_from_cents: z.number(),
  graders: z.record(
    z.enum(['psa', 'bgs', 'cgc']),
    z.object({
      brand_bps: z.number(),
      upcharge_bps: z.number(),
      fees_cents: z.record(z.enum(['economy', 'standard', 'express']), z.number()),
      minutes: z.record(z.enum(['economy', 'standard', 'express']), z.number()),
    }),
  ),
  copies: z.array(
    z.object({
      copy_id: z.string(),
      card_id: z.string(),
      value_cents: z.number(),
      ranges: z.object({ width: z.number(), centering: zRange, corners: zRange, edges: zRange, surface: zRange }).nullable(),
      upcharge_cents: z.record(z.enum(['psa', 'bgs', 'cgc']), z.number()),
    }),
  ),
  orders: z.array(
    z.object({
      id: z.number(),
      copy_id: z.string(),
      card_id: z.string(),
      grader: zGrader,
      service: z.enum(['economy', 'standard', 'express']),
      fee_cents: z.number(),
      submitted_at: z.string(),
      due_at: z.string(),
    }),
  ),
  slabs: z.array(zSlabCopy.extend({ card_id: z.string(), location: z.string(), raw_cents: z.number() })),
})
export type Grading = z.infer<typeof zGrading>
export type GraderId = keyof Grading['graders']
export type ServiceId = 'economy' | 'standard' | 'express'
export const zGradeResult = z.object({
  order_id: z.number(),
  copy_id: z.string(),
  card_id: z.string(),
  slab: zSlab,
  fee_cents: z.number(),
  raw_cents: z.number(),
  value_cents: z.number(),
})
export type GradeResult = z.infer<typeof zGradeResult>
const zVitrine = z.array(z.object({ copy_id: z.string(), card_id: z.string(), slab: zSlab.nullable(), value_cents: z.number() }))
export const zProfile = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string().nullable(),
  level: z.number(),
  net_worth_cents: z.number(),
  created_at: z.string(),
  me: z.boolean(),
  look: zLook,
  trophies: z.object({ gold: z.number(), silver: z.number(), bronze: z.number(), best_pull_card: z.string().nullable(), best_pull_cents: z.number() }),
  vitrine: zVitrine,
  slots: z.number(),
  unlocked: z.boolean(),
  stats: z.object({ pack_opened: z.number(), graded: z.number(), graded_10: z.number(), collection: z.number() }),
  home: z.object({ tier: z.number(), wohnwert: z.number(), furnishings: z.record(z.string(), z.string()) }),
  guestbook: z.lazy(() => zGuestbook),
  signed_today: z.boolean(),
  honor: zHonor,
})
export type Profile = z.infer<typeof zProfile>
export const zPopReport = z.object({
  card_id: z.string(),
  value_cents: z.number(),
  rows: z.array(z.object({ grader: zGrader, grade: z.number(), black_label: z.boolean(), n: z.number(), value_cents: z.number() })),
  mine: z.number(),
})
export type PopReport = z.infer<typeof zPopReport>

export const zCosmetics = z.object({
  unlock_level: z.number(),
  owned: z.array(z.string()),
  style: z.record(z.string(), z.string()),
  avatar_card: z.string().nullable(),
  title: z.string().nullable(),
  /** cards the player owns right now (for the profile picture) */
  cards: z.array(z.string()),
  items: z.array(z.object({ key: z.string(), price_cents: z.number() })),
})
export type Cosmetics = z.infer<typeof zCosmetics>

// Wohnen (alpha_07)
const zGuestbook = z.array(z.object({ id: z.number(), author_id: z.string().nullable(), name: z.string().nullable(), body: z.string(), at: z.string() }))
export type GuestbookEntry = z.infer<typeof zGuestbook>[number]
export const zHousing = z.object({
  unlock_level: z.number(),
  tier: z.number(),
  wohnwert: z.number(),
  paid_cents: z.number(),
  refund_cents: z.number(),
  nebenkosten_cents: z.number(),
  homes: z.array(z.object({ tier: z.number(), price_cents: z.number(), nebenkosten_cents: z.number() })),
  furnishings: z.record(z.string(), z.string()),
  furniture: z.array(z.object({ key: z.string(), price_cents: z.number() })),
})
export type Housing = z.infer<typeof zHousing>

// Versicherungen (alpha_07)
export const zInsurance = z.object({
  unlock_level: z.number(),
  has_home: z.boolean(),
  lost_parcel_bps: z.number(),
  water_damage_pct: z.number(),
  bulk_cents: z.number(),
  policies: z.array(z.object({ kind: z.enum(['versand', 'hausrat']), active: z.boolean(), since: z.string().nullable(), premium_cents: z.number() })),
})
export type Insurance = z.infer<typeof zInsurance>

// Skillbaum (alpha_07)
export const zSkills = z.object({
  unlock_level: z.number(),
  points: z.number(),
  spent: z.number(),
  owned: z.array(z.string()),
  respec_cents: z.number(),
  bailout: z.object({ owned: z.boolean(), used: z.boolean(), ready: z.boolean(), cents: z.number() }),
})
export type Skills = z.infer<typeof zSkills>

// Pack Battles (alpha_08)
export const BATTLE_MODES = ['klassisch', 'krepel', 'top', 'jackpot', 'team', 'freundschaft'] as const
export type BattleMode = (typeof BATTLE_MODES)[number]
const zBattleSummary = z.object({
  id: z.number(),
  mode: z.enum(BATTLE_MODES),
  product_id: z.string(),
  packs: z.number(),
  seats: z.number(),
  stake_cents: z.number(),
  state: z.enum(['open', 'running', 'done', 'cancelled']),
  host_id: z.string().nullable(),
  started_at: z.string().nullable(),
  ends_at: z.string().nullable(),
  round_seconds: z.number().nullable(),
  mine: z.boolean(),
  players: z.array(
    z.object({
      seat: z.number(),
      player_id: z.string().nullable(),
      name: z.string(),
      bot: z.boolean(),
      look: zLook.nullable(),
      shown_cents: z.number(),
    }),
  ),
})
export type BattleSummary = z.infer<typeof zBattleSummary>
export const zBattle = zBattleSummary.extend({
  round: z.number(),
  server_now: z.string(),
  pulls: z.array(z.object({ seat: z.number(), round: z.number(), card_id: z.string(), value_cents: z.number() })),
  result: z.object({ winners: z.array(z.number()), totals: z.record(z.string(), z.number()) }).nullable(),
  emotes: z.array(z.object({ id: z.number(), name: z.string(), emote: z.string(), at: z.string() })),
})
export type Battle = z.infer<typeof zBattle>
export const zBattles = z.object({
  unlock_level: z.number(),
  round_seconds: z.number(),
  boosters: z.array(z.object({ product_id: z.string(), price_cents: z.number() })),
  open: z.array(zBattleSummary),
  running: z.array(zBattleSummary),
  done: z.array(zBattleSummary),
})
export type Battles = z.infer<typeof zBattles>

// Events (alpha_10)
export const zGameEvent = z.object({
  id: z.number(),
  key: z.string(),
  slot: z.enum(['daily', 'random', 'highlight', 'personal', 'admin', 'calendar']),
  starts_at: z.string(),
  ends_at: z.string(),
  data: z.record(z.string(), z.unknown()),
})
export type GameEvent = z.infer<typeof zGameEvent>
export const zEvents = z.object({
  today: zGameEvent.nullable(),
  active: z.array(zGameEvent),
  upcoming: z.array(zGameEvent),
  mine: z.array(zGameEvent),
  /** while the Adventskalender runs: today's door and the doors opened */
  advent: z.object({ day: z.number(), opened: z.array(z.number()) }).nullable(),
})
export type Events = z.infer<typeof zEvents>

// Prestige (alpha_11)
const zAtticCopy = z.object({
  copy_id: z.string(),
  card_id: z.string(),
  grader: z.string().nullable(),
  grade: z.number().nullable(),
  black_label: z.boolean().nullable(),
  value_cents: z.number(),
})
export const zPrestige = z.object({
  unlock_level: z.number(),
  prestige: z.number(),
  stars: z.number(),
  preview: z.object({
    stars: z.number(),
    base: z.number(),
    value_cents: z.number(),
    unit_cents: z.number(),
    start_cents: z.number(),
    ruf_after: z.number(),
  }),
  blockers: z.record(z.string(), z.number()),
  perks: z.record(z.string(), z.object({ level: z.number(), cost: z.number().nullable() })),
  attic: z.object({
    limit_cents: z.number(),
    used_cents: z.number(),
    items: z.array(z.object({ kind: z.enum(['card', 'sealed']), item_id: z.string(), qty: z.number(), value_cents: z.number() })),
    copies: z.array(zAtticCopy),
  }),
  history: z.array(z.object({ n: z.number(), stars: z.number(), value_cents: z.number(), started_at: z.string(), at: z.string() })),
})
export type Prestige = z.infer<typeof zPrestige>
export type AtticCopy = z.infer<typeof zAtticCopy>

// Luxus, Megaprojekte, Museum (alpha_11)
export const zLuxury = z.object({
  unlock_level: z.number(),
  owned: z.array(z.object({ key: z.string(), at: z.string() })),
  paid_cents: z.number(),
  prices: z.record(z.string(), z.number()).nullable(),
})
export type Luxury = z.infer<typeof zLuxury>
export const zMega = z.object({
  unlock_level: z.number(),
  min_cents: z.number(),
  active: z.string().nullable(),
  projects: z.array(
    z.object({
      key: z.string(),
      goal_cents: z.number(),
      donated_cents: z.number(),
      done_at: z.string().nullable(),
      mine_cents: z.number(),
      donors: z.array(z.object({ name: z.string(), cents: z.number() })),
    }),
  ),
  auctions: z.array(
    z.object({
      id: z.number(),
      key: z.string(),
      start_cents: z.number(),
      bid_cents: z.number().nullable(),
      bidder: z.string().nullable(),
      mine: z.boolean().nullable(),
      min_cents: z.number(),
      ends_at: z.string(),
    }),
  ),
  hall: z.array(z.object({ key: z.string(), owner: z.string().nullable(), paid_cents: z.number(), at: z.string() })),
  trophies_left: z.array(z.string()),
})
export type Mega = z.infer<typeof zMega>

// Streaming (alpha_11)
export const zStream = z.object({
  unlock_level: z.number(),
  live: z.boolean(),
  viewers: z.number(),
  followers: z.number(),
  today_cents: z.number(),
  cap_cents: z.number(),
  total_cents: z.number(),
  sponsor: z.object({ key: z.string(), done: z.number(), need: z.number(), reward_cents: z.number(), until: z.string() }).nullable(),
})
export type Stream = z.infer<typeof zStream>

// Admin: server health (alpha_12)
// The signed-in player's own account (the e-mail is never part of any other document)
export const zAccount = z.object({ email: z.string().nullable() })
export type Account = z.infer<typeof zAccount>

export const zAdminHealth = z.object({
  db_bytes: z.number(),
  limit_bytes: z.number(),
  warn_pct: z.number(),
  tables: z.array(z.object({ name: z.string(), bytes: z.number(), rows: z.number() })),
  cash_cents: z.number(),
  players: z.number(),
  active_24h: z.number(),
  active_7d: z.number(),
  median_level: z.number(),
  /** each player's current run: since joining, the last reset or the last exit */
  pace: z.array(z.object({ username: z.string(), level: z.number(), prestige: z.number(), days: z.number(), net_worth_cents: z.number() })),
})
export type AdminHealth = z.infer<typeof zAdminHealth>

// Höhle der Löwen (alpha_11)
export const zLoewen = z.object({
  unlock_level: z.number(),
  investor_pct: z.number(),
  max_pct: z.number(),
  pitch: z
    .object({ offers: z.array(z.object({ lion: z.number(), share_pct: z.number(), cents: z.number() })), chosen: z.number().nullable() })
    .nullable(),
  value_cents: z.number(),
})
export type Loewen = z.infer<typeof zLoewen>

// Bares für Rares (alpha_10)
const zBaresCopy = z.object({
  card_id: z.string(),
  grader: z.string().nullable(),
  grade: z.number().nullable(),
  black_label: z.boolean().nullable(),
  value_cents: z.number(),
})
export const zBares = z.object({
  unlock_level: z.number(),
  today: zBaresCopy
    .extend({
      estimate_cents: z.number(),
      offers: z.array(z.object({ dealer: z.number().nullable(), cents: z.number() })),
      sold: z.number().nullable(),
    })
    .nullable(),
  copies: z.array(zBaresCopy.extend({ copy_id: z.string() })),
})
export type Bares = z.infer<typeof zBares>

// Schattenwirtschaft (alpha_10)
export const ATTACK_KINDS = ['bunker', 'finanzamt', 'bewertung', 'abwerben', 'geruecht', 'resealed', 'kredit'] as const
export type AttackKind = (typeof ATTACK_KINDS)[number]
const zAttackPreview = z.object({
  ok: z.boolean(),
  reason: z.string().nullable(),
  chance: z.number(),
  cost_cents: z.number(),
  /** Bunker knacken: what a success would take right now */
  loot_cents: z.number().nullable(),
  ready_at: z.string().nullable(),
})
export type AttackPreview = z.infer<typeof zAttackPreview>
export const zDarkside = z.object({
  unlock_level: z.number(),
  angriff: z.number(),
  abwehr: z.record(z.string(), z.number()),
  cap_left_cents: z.number(),
  rules: z.object({
    cooldown_minutes: z.number(),
    daily_successes: z.number(),
    loss_cap_pct: z.number(),
    revenge_hours: z.number(),
    revenge_cost_pct: z.number(),
    revenge_bonus: z.number(),
    fine_pct: z.number(),
    schadenfreude_pct: z.number(),
    angriff_per_skill: z.number(),
    bunker_loot_pct: z.number(),
    tip_pct: z.number(),
    review_ruf: z.number(),
    rumour_pct: z.number(),
    rumour_card_hours: z.number(),
  }),
  targets: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      level: z.number(),
      look: zLook,
      honor: zHonor,
      company: z.string().nullable(),
      revenge_until: z.string().nullable(),
      attacks: z.object({ bunker: zAttackPreview, finanzamt: zAttackPreview, bewertung: zAttackPreview, abwerben: zAttackPreview }),
    }),
  ),
  rumour: zAttackPreview.extend({
    defender: z.string().nullable(),
    cards: z.array(z.object({ card_id: z.string(), value_cents: z.number(), busy: z.boolean() })),
  }),
  resealed: z.object({
    fee_pct: z.number(),
    max: z.number(),
    stock: z.array(z.object({ product_id: z.string(), qty: z.number(), prepared: z.number(), fee_cents: z.number() })),
  }),
  log: z.array(
    z.object({
      id: z.number(),
      kind: z.enum(ATTACK_KINDS),
      at: z.string(),
      success: z.boolean(),
      role: z.enum(['attacker', 'victim']),
      other: z.string().nullable(),
      loss_cents: z.number(),
      data: z.record(z.string(), z.unknown()),
    }),
  ),
})
export type Darkside = z.infer<typeof zDarkside>
const zAttackResult = z.object({
  kind: z.enum(ATTACK_KINDS),
  success: z.boolean(),
  chance: z.number(),
  cost_cents: z.number(),
  other: z.string().nullable(),
  cents: z.number().optional(),
  fine_cents: z.number().optional(),
  joy_cents: z.number().optional(),
  fee_cents: z.number().optional(),
  ruf: z.number().optional(),
  clean: z.boolean().optional(),
  company: z.string().optional(),
  card_id: z.string().optional(),
  up: z.boolean().optional(),
})
export type AttackResult = z.infer<typeof zAttackResult>

// Firma (alpha_09)
export const COMPANY_STATIONS = ['annahme', 'pruefung', 'slabbing', 'versand'] as const
export type CompanyStation = (typeof COMPANY_STATIONS)[number]
export const COMPANY_SERVICES = ['economy', 'standard', 'express'] as const
export type CompanyServiceKey = (typeof COMPANY_SERVICES)[number]
const zRangePair = z.tuple([z.number(), z.number()])
const zStationNumbers = z.object({ annahme: z.number(), pruefung: z.number(), slabbing: z.number(), versand: z.number() })
export const zCompanyLabel = z.object({ bg: z.string(), fg: z.string(), emblem: z.string() })
export type CompanyLabel = z.infer<typeof zCompanyLabel>
const zCompanyPerson = z.object({
  id: z.number(),
  archetype: z.string(),
  first: z.number(),
  last: z.number(),
  tempo: z.number(),
  accuracy: z.number(),
  loyalty: z.number(),
  wage_cents: z.number(),
})
export type CompanyPerson = z.infer<typeof zCompanyPerson>
const zHakt = z.object({
  key: z.enum(['kasse', 'tempo', 'bekanntheit', 'genauigkeit', 'preis', 'team']),
  cents_h: z.number(),
  action: z.string(),
  station: z.enum(COMPANY_STATIONS).optional(),
  service: z.enum(COMPANY_SERVICES).optional(),
  staff: z.number().optional(),
  level: z.number().optional(),
  cost_cents: z.number().nullable().optional(),
  gain_cents_h: z.number().nullable().optional(),
  fair_cents: z.number().optional(),
  need_cents: z.number().optional(),
  ruf_h: z.number().optional(),
})
export type Hakt = z.infer<typeof zHakt>
export const zCompany = z.object({
  unlock_level: z.number(),
  found_fee_cents: z.number(),
  found_cost_cents: z.number(),
  founding: z.object({ step: z.number(), ready_at: z.string() }).nullable(),
  company: z
    .object({
      id: z.number(),
      name: z.string(),
      slogan: z.string(),
      label: zCompanyLabel,
      stage: z.number(),
      stage_pending: z.number().nullable(),
      stage_ready_at: z.string().nullable(),
      cash_cents: z.number(),
      prices: z.record(z.string(), z.number()),
      equipment: zStationNumbers,
      backlog: z.number(),
      orders_total: z.number(),
      founded_at: z.string(),
      staff_cap: z.number(),
      services: z.array(z.enum(COMPANY_SERVICES)),
      equipment_max: z.number(),
      caps: zStationNumbers,
      capacity: z.number(),
      demand: z.object({
        total: z.number(),
        avg_price_cents: z.number(),
        services: z.record(z.string(), z.object({ demand: z.number(), price_factor: z.number(), fair_cents: z.number(), price_cents: z.number() })),
        ruf_factor: z.number(),
        hype: z.number(),
        speed: z.number(),
        marketing: z.number(),
        backlog_hours: z.number(),
      }),
      accuracy: z.number(),
      paid: z.boolean(),
      ruf: z.number(),
      brand_bps: z.number(),
      costs: z.object({ wages: z.number(), rent: z.number(), power: z.number(), material: z.number() }),
      profit_h: z.number(),
      equipment_next: z.record(z.string(), z.object({ level: z.number(), cost_cents: z.number() }).nullable()),
      next_stage: z.object({ stage: z.number(), cost_cents: z.number(), wait_minutes: z.number() }).nullable(),
      staff: z.array(zCompanyPerson.extend({ station: z.enum(COMPANY_STATIONS), trainings: z.number() })),
      applicants: z.array(zCompanyPerson),
      train_cost_hours: z.number(),
      train_max: z.number(),
      fire_cost_hours: z.number(),
      days: z.array(z.object({ day: z.string(), orders: z.number(), revenue_cents: z.number(), costs_cents: z.number() })),
      reviews: z.array(z.object({ id: z.number(), stars: z.number(), text: z.number(), at: z.string() })),
      stars_avg: z.number().nullable(),
      hakt: z.array(zHakt),
      payout_tax_pct: z.number(),
      value_cents: z.number(),
      player_orders: z.array(
        z.object({ id: z.number(), card_id: z.string(), customer: z.string(), service: z.enum(COMPANY_SERVICES), fee_cents: z.number(), due_at: z.string(), bumped: z.boolean() }),
      ),
      vip: z
        .object({
          id: z.string(),
          card_id: z.string(),
          fee_cents: z.number(),
          expires_at: z.string(),
          width: z.number(),
          ranges: z.object({ centering: zRangePair, corners: zRangePair, edges: zRangePair, surface: zRangePair }),
        })
        .nullable(),
      decision: z.object({ id: z.number(), key: z.string(), expires_at: z.string() }).nullable(),
      marketing: z.object({ key: z.string().nullable(), boost: z.number(), until: z.string() }).nullable(),
      campaigns: z.record(z.string(), z.object({ cost_cents: z.number(), open: z.boolean() })),
      tax: z.object({
        due_at: z.string(),
        advisor: z.boolean(),
        advisor_cost_cents: z.number(),
        late_pct: z.number(),
        advisor_pct: z.number(),
        options: z.array(z.number()),
      }),
      shady: z.object({
        schwarzarbeit: z.boolean(),
        evaded_cents: z.number(),
        bumped: z.number(),
        scandal_until: z.string().nullable(),
        mystery_sour: z.number(),
        schwarz_wage_pct: z.number(),
        mystery_markup: z.number(),
        mystery_max: z.number(),
      }),
      awards: z.array(z.object({ key: z.string(), at: z.string() })),
      research: z.object({ owned: z.array(z.string()), stage: z.number(), costs: z.record(z.string(), z.number()) }),
      wholesale: z.object({
        unlock_level: z.number(),
        left: z.number(),
        delivery_minutes: z.number(),
        displays: z.array(z.object({ product_id: z.string(), price_cents: z.number(), list_cents: z.number() })),
      }),
    })
    .nullable(),
})
export type CompanyDoc = z.infer<typeof zCompany>
export const zCompanies = z.array(
  z.object({
    id: z.number(),
    name: z.string(),
    slogan: z.string(),
    label: zCompanyLabel,
    owner: z.string(),
    stage: z.number(),
    ruf: z.number(),
    brand_bps: z.number(),
    stars_avg: z.number().nullable(),
    services: z.array(z.object({ service: z.enum(COMPANY_SERVICES), fee_cents: z.number(), minutes: z.number() })),
  }),
)
export type Companies = z.infer<typeof zCompanies>
export type Company = NonNullable<CompanyDoc['company']>

// Privatkredit and Ehre (alpha_08)
const zLoan = z.object({
  id: z.number(),
  state: z.enum(['offered', 'active', 'repaid', 'defaulted', 'cancelled']),
  principal_cents: z.number(),
  interest_pct: z.number(),
  due_cents: z.number(),
  days: z.number(),
  created_at: z.string(),
  due_at: z.string().nullable(),
  closed_at: z.string().nullable(),
  role: z.enum(['lender', 'borrower']),
  other: z.object({ id: z.string(), name: z.string(), look: zLook, honor: zHonor }),
})
export type Loan = z.infer<typeof zLoan>
export const zLoans = z.object({
  unlock_level: z.number(),
  max_interest_pct: z.number(),
  max_days: z.number(),
  min_cents: z.number(),
  honor: zHonor,
  loans: z.array(zLoan),
})
export type Loans = z.infer<typeof zLoans>

// Box Breaks (alpha_08)
const zBreakSummary = z.object({
  id: z.number(),
  product_id: z.string(),
  packs: z.number(),
  spot_cents: z.number(),
  state: z.enum(['open', 'running', 'done', 'cancelled']),
  host_id: z.string().nullable(),
  host_name: z.string().nullable(),
  started_at: z.string().nullable(),
  ends_at: z.string().nullable(),
  round_seconds: z.number().nullable(),
  sold: z.number(),
  mine: z.number(),
})
export type BreakSummary = z.infer<typeof zBreakSummary>
export const zBreak = zBreakSummary.extend({
  round: z.number(),
  server_now: z.string(),
  spots: z.array(z.object({ spot: z.number(), player_id: z.string(), name: z.string(), look: zLook })),
  pulls: z.array(z.object({ spot: z.number(), card_id: z.string(), value_cents: z.number() })),
  emotes: z.array(z.object({ id: z.number(), name: z.string(), emote: z.string(), at: z.string() })),
})
export type Break = z.infer<typeof zBreak>
export const zBreaks = z.object({
  unlock_level: z.number(),
  displays: z.array(z.object({ product_id: z.string(), qty: z.number(), min_cents: z.number(), max_cents: z.number(), booster_cents: z.number() })),
  open: z.array(zBreakSummary),
  running: z.array(zBreakSummary),
  done: z.array(zBreakSummary),
})
export type Breaks = z.infer<typeof zBreaks>

// Sammelbestellung (alpha_08)
const zGroupOrder = z.object({
  id: z.number(),
  product_id: z.string(),
  unit_cents: z.number(),
  state: z.enum(['open', 'done', 'cancelled']),
  host_id: z.string().nullable(),
  created_at: z.string(),
  expires_at: z.string(),
  taken: z.number(),
  mine: z.number(),
  shares: z.array(z.object({ player_id: z.string(), name: z.string(), look: zLook, shares: z.number() })),
})
export type GroupOrder = z.infer<typeof zGroupOrder>
export const zGroupOrders = z.object({
  unlock_level: z.number(),
  case_displays: z.number(),
  max_shares_week: z.number(),
  shares_left: z.number(),
  delivery_minutes: z.number(),
  displays: z.array(z.object({ product_id: z.string(), unit_cents: z.number(), list_cents: z.number() })),
  open: z.array(zGroupOrder),
  recent: z.array(zGroupOrder),
})
export type GroupOrders = z.infer<typeof zGroupOrders>

export const RPC_SCHEMAS = {
  me_get: zMe,
  join: zMe,
  login: zLogin,
  logout: zMe,
  account_get: zAccount,
  account_email_set: zAccount,
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
  chat_get: zChat,
  licenses_get: zLicenses,
  goals_get: zGoals,
  starter_pick: zLicensesWrite,
  license_buy: zLicensesWrite,
  admin_get: zAdmin,
  admin_set_phase: zAdmin,
  admin_restock: zAdmin,
  admin_invite_set: zAdmin,
  admin_config_set: zAdmin,
  admin_grant: zAdmin,
  admin_announce: zAdmin,
  chat_send: zChat.extend({ player: zPlayer }),
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
    buff: z.boolean(),
    ...withPlayer,
  }),
  level_path_get: zLevelPath,
  grading_get: zGrading,
  skills_get: zSkills,
  realtime_get: z.object({ world: z.string(), player: z.string() }),
  insurance_get: zInsurance,
  insurance_set: zInsurance.extend(withPlayer),
  cosmetics_get: zCosmetics,
  cosmetic_buy: zCosmetics.extend(withPlayer),
  cosmetic_equip: zCosmetics,
  avatar_set: zCosmetics,
  housing_get: zHousing,
  home_buy: zHousing.extend(withPlayer),
  furniture_buy: zHousing.extend(withPlayer),
  guestbook_sign: z.object({ guestbook: zGuestbook }),
  guestbook_delete: z.object({ guestbook: zGuestbook }),
  skill_learn: zSkills.extend(withPlayer),
  skills_respec: zSkills.extend(withPlayer),
  bailout_claim: zSkills.extend({ paid_cents: z.number(), ...withPlayer }),
  grading_inspect: z.object({ copy_id: z.string(), card_id: z.string(), ranges: zGrading.shape.copies.element.shape.ranges, grading: zGrading, ...withPlayer }),
  grading_submit: z.object({ fee_cents: z.number(), grading: zGrading, ...withPlayer }),
  grading_reveal: z.object({ results: z.array(zGradeResult), grading: zGrading, ...withPlayer }),
  slab_crack: z.object({ copy_id: z.string(), card_id: z.string(), damaged: z.boolean(), grading: zGrading, ...withPlayer }),
  pop_report_get: zPopReport,
  vitrine_set: z.object({ vitrine: zVitrine, slots: z.number(), ...withPlayer }),
  profile_get: zProfile,
  battles_get: zBattles,
  battle_get: zBattle,
  battle_create: z.object({ battle: zBattle, ...withPlayer }),
  battle_join: z.object({ battle: zBattle, ...withPlayer }),
  battle_start: z.object({ battle: zBattle, ...withPlayer }),
  battle_leave: z.object(withPlayer),
  emote_send: z.object({ ok: z.boolean() }),
  friend_act: z.object({ kind: z.enum(['aushelfen', 'kaffee']), minutes: z.number(), reward_cents: z.number(), ...withPlayer }),
  group_orders_get: zGroupOrders,
  breaks_get: zBreaks,
  break_get: zBreak,
  break_create: z.object({ break: zBreak, ...withPlayer }),
  break_buy: z.object({ break: zBreak, ...withPlayer }),
  break_start: z.object({ break: zBreak, ...withPlayer }),
  break_cancel: z.object(withPlayer),
  break_emote_send: z.object({ ok: z.boolean() }),
  loans_get: zLoans,
  company_get: zCompany,
  company_found_step: zCompany.extend(withPlayer),
  company_found: zCompany.extend(withPlayer),
  company_label_set: zCompany,
  company_money: zCompany.extend(withPlayer),
  company_prices_set: zCompany,
  company_hire: zCompany,
  company_staff_act: zCompany,
  company_equipment_buy: zCompany,
  company_stage_up: zCompany,
  companies_list: zCompanies,
  company_decide: zCompany.extend({ decided: z.object({ key: z.string(), choice: z.number() }) }),
  company_marketing: zCompany,
  company_tax_file: zCompany.extend({ filed: z.boolean() }),
  company_tax_advisor: zCompany,
  company_shady: zCompany.extend(withPlayer),
  company_research: zCompany,
  events_get: zEvents,
  darkside_get: zDarkside,
  prestige_get: zPrestige,
  luxury_get: zLuxury,
  stream_get: zStream,
  admin_health: zAdminHealth,
  loewen_get: zLoewen,
  loewen_pitch: zLoewen,
  loewen_deal: zLoewen,
  stream_set: zStream,
  luxury_buy: zLuxury.extend(withPlayer),
  megaprojects_get: zMega,
  megaproject_donate: zMega.extend(withPlayer),
  museum_bid: zMega.extend(withPlayer),
  admin_museum_start: z.object({ ok: z.boolean() }),
  prestige_exit: zPrestige.extend(withPlayer),
  perk_buy: zPrestige.extend(withPlayer),
  attic_retrieve: zPrestige,
  advent_open: zEvents.extend(withPlayer),
  bares_get: zBares,
  bares_appraise: zBares,
  bares_deal: zBares.extend(withPlayer),
  attack: zDarkside.extend({ result: zAttackResult, ...withPlayer }),
  reseal: zDarkside.extend({
    prepared: z.object({ product_id: z.string(), qty: z.number(), fee_cents: z.number(), value_cents: z.number(), hits: z.number() }),
    ...withPlayer,
  }),
  loan_burst: z.object({ loans: zLoans, ...withPlayer }),
  admin_event_start: zAdmin,
  wholesale_buy: zCompany.extend(withPlayer),
  company_order_submit: z.object({ fee_cents: z.number(), grading: zGrading, ...withPlayer }),
  company_vip_grade: zCompany.extend({
    result: z.object({ truth: z.array(z.number()), guess: z.array(z.number()), error: z.number(), paid_cents: z.number(), ruf: z.number() }),
  }),
  loan_offer: z.object({ loans: zLoans }),
  loan_respond: z.object({ loans: zLoans, ...withPlayer }),
  loan_cancel: z.object({ loans: zLoans }),
  loan_repay: z.object({ loans: zLoans, ...withPlayer }),
  group_order_create: z.object({ orders: zGroupOrders, ...withPlayer }),
  group_order_join: z.object({ orders: zGroupOrders, ...withPlayer }),
  group_order_leave: z.object({ orders: zGroupOrders, ...withPlayer }),
} as const
export type RpcName = keyof typeof RPC_SCHEMAS

// Client state fed by the server: own player, feed, notifications, level-ups, server clock.
import { create } from 'zustand'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo } from 'react'
import { SETS } from './catalog.ts'
import { rpc } from './rpc.ts'
import { useSettings } from './settings.ts'
import { sfx, type SfxName } from './sfx.ts'
import type { FeedEntry, Me, Player } from './schemas.ts'

export interface LevelUp {
  level: number
  reward_cents: number
  booster: boolean
}

interface World {
  feed: FeedEntry[]
  notifications: FeedEntry[]
  unread: number
  /** Stammtisch messages by others since this device last read the chat */
  chatUnread: number
  /** players online right now, you included */
  online: number
  /** server time minus device time, in ms: countdowns never trust the device clock */
  clockOffsetMs: number
  /** level-ups waiting for their celebration */
  levelUps: LevelUp[]
  /** fresh big pulls of anyone on the server */
  bigPulls: FeedEntry[]
  /** a pack opening is on screen: celebrations wait until it closes */
  stageOpen: boolean
  /** the page search (Strg+K) and, on small screens, the navigation drawer */
  paletteOpen: boolean
  navOpen: boolean
  apply: (patch: Partial<World>) => void
  reset: () => void
}

const EMPTY = { feed: [], notifications: [], unread: 0, chatUnread: 0, online: 0, clockOffsetMs: 0, levelUps: [], bigPulls: [], stageOpen: false, paletteOpen: false, navOpen: false }

export const useWorld = create<World>((set) => ({
  ...EMPTY,
  apply: (patch) => set(patch),
  reset: () => set(EMPTY),
}))

export const serverNow = () => Date.now() + useWorld.getState().clockOffsetMs

const ME_KEY = ['me'] as const

/** The signed-in player and server info. `player` is null when signed out. */
export function useMe() {
  return useQuery({ queryKey: ME_KEY, queryFn: () => rpc('me_get'), staleTime: Infinity, retry: 1 })
}

/** The sets players can have: all but those the admin has not released yet, which the server names. */
export function useReleasedSets() {
  const key = useMe().data?.server.unreleased.join(',') ?? ''
  return useMemo(() => SETS.filter((s) => !key.split(',').includes(s.id)), [key])
}

export function useSetMe() {
  const client = useQueryClient()
  return useCallback((me: Me) => client.setQueryData(ME_KEY, me), [client])
}

/** Writes return the fresh player: put it into the HUD at once. */
export function useApplyPlayer() {
  const client = useQueryClient()
  return useCallback(
    (player: Player) => client.setQueryData<Me>(ME_KEY, (old) => (old ? { ...old, player } : old)),
    [client],
  )
}

const SYNC_MS = 15_000
let runSync: (() => void) | undefined

/** Ask for a sync right now (after every write: level-ups and feed arrive immediately). */
export function syncNow() {
  runSync?.()
}

/** The one polling loop: every 15 s while the tab is visible, at once when it becomes visible or on demand. */
export function useSync(enabled: boolean) {
  const setMe = useSetMe()
  const client = useQueryClient()

  useEffect(() => {
    if (!enabled) return
    let stopped = false
    let running = false
    let again = false

    const run = async () => {
      if (stopped || document.visibilityState !== 'visible') return
      if (running) {
        again = true
        return
      }
      running = true
      try {
        const w = useWorld.getState()
        const res = await rpc('sync', {
          p_after_notification: w.notifications.at(-1)?.id ?? 0,
          p_after_feed: w.feed.at(-1)?.id ?? 0,
          p_after_chat: useSettings.getState().chatSeen,
        })
        if (stopped) return
        setMe({ player: res.player, server: res.server, away_s: res.away_s })
        // build on the state as it is now: overlays may have closed level-ups, big pulls or the bell meanwhile
        const cur = useWorld.getState()
        const feedNew = res.feed.filter((f) => f.id > (cur.feed.at(-1)?.id ?? 0))
        const notesNew = res.notifications.filter((n) => n.id > (cur.notifications.at(-1)?.id ?? 0))
        const firstLoad = w.feed.length === 0 && w.notifications.length === 0
        const fresh = firstLoad ? [] : notesNew
        const levelUps = fresh
          .filter((n) => n.kind === 'level_up')
          .map((n) => ({
            level: Number(n.data.level),
            reward_cents: Number(n.data.reward_cents ?? 0),
            booster: Boolean(n.data.booster),
          }))
        const bigPulls = firstLoad ? [] : feedNew.filter((f) => f.kind === 'pull_grail' || f.kind === 'pull_ultra')
        if (fresh.some((n) => n.kind !== 'level_up')) sfx(noteSound(fresh.map((n) => n.kind)))
        useWorld.getState().apply({
          clockOffsetMs: new Date(res.server.time).getTime() - Date.now(),
          feed: [...cur.feed, ...feedNew].slice(-60),
          notifications: [...cur.notifications, ...notesNew].slice(-60),
          unread: firstLoad ? 0 : cur.unread + fresh.length,
          chatUnread: res.chat_unread,
          online: res.online,
          levelUps: [...cur.levelUps, ...levelUps],
          bigPulls: [...cur.bigPulls, ...bigPulls],
        })
        // a store restocked: the shop shows the new wave without a reload
        if (!firstLoad && feedNew.some((f) => f.kind === 'restock')) void client.invalidateQueries({ queryKey: ['shop'] })
      } catch {
        // Stay quiet: the next round tries again; the HUD keeps the last known state.
      } finally {
        running = false
        if (again) {
          again = false
          void run()
        }
      }
    }

    runSync = () => void run()
    void run()
    const timer = setInterval(run, SYNC_MS)
    document.addEventListener('visibilitychange', run)
    return () => {
      stopped = true
      runSync = undefined
      clearInterval(timer)
      document.removeEventListener('visibilitychange', run)
    }
  }, [enabled, setMe, client])
}

// The loudest news decides the sound of a sync round: trouble first, then money, then progress.
const NOTE_SOUNDS: [SfxName, string[]][] = [
  ['alarm', ['attacked', 'resealed_caught', 'chargeback', 'company_scandal', 'company_audit', 'company_zoll', 'company_broke', 'loan_defaulted']],
  ['outbid', ['museum_outbid']],
  ['sold', ['sale_paid', 'stream_sponsor', 'loan_repaid', 'gift_received']],
  ['quest', ['achievement', 'goal_done', 'league_done', 'museum_won', 'weekly_chest', 'company_award']],
]
function noteSound(kinds: string[]): SfxName {
  return NOTE_SOUNDS.find(([, ks]) => ks.some((k) => kinds.includes(k)))?.[0] ?? 'notify'
}

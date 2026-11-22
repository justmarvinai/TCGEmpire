// Client state fed by the server: own player, feed, notifications, level-ups, server clock.
import { create } from 'zustand'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect } from 'react'
import { rpc } from './rpc.ts'
import { sfx } from './sfx.ts'
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

const EMPTY = { feed: [], notifications: [], unread: 0, clockOffsetMs: 0, levelUps: [], bigPulls: [], stageOpen: false, paletteOpen: false, navOpen: false }

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
        })
        if (stopped) return
        setMe({ player: res.player, server: res.server, away_s: res.away_s })
        const firstLoad = w.feed.length === 0 && w.notifications.length === 0
        const fresh = firstLoad ? [] : res.notifications
        const levelUps = fresh
          .filter((n) => n.kind === 'level_up')
          .map((n) => ({
            level: Number(n.data.level),
            reward_cents: Number(n.data.reward_cents ?? 0),
            booster: Boolean(n.data.booster),
          }))
        const bigPulls = firstLoad ? [] : res.feed.filter((f) => f.kind === 'pull_grail' || f.kind === 'pull_ultra')
        if (fresh.some((n) => n.kind !== 'level_up')) sfx('notify')
        useWorld.getState().apply({
          clockOffsetMs: new Date(res.server.time).getTime() - Date.now(),
          feed: [...w.feed, ...res.feed].slice(-60),
          notifications: [...w.notifications, ...res.notifications].slice(-60),
          unread: firstLoad ? 0 : w.unread + fresh.length,
          levelUps: [...w.levelUps, ...levelUps],
          bigPulls: [...w.bigPulls, ...bigPulls],
        })
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
  }, [enabled, setMe])
}

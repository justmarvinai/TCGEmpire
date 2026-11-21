// Client state fed by the server: own player, feed, notifications, server clock.
import { create } from 'zustand'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { rpc } from './rpc.ts'
import { sfx } from './sfx.ts'
import type { FeedEntry, Me } from './schemas.ts'

interface World {
  feed: FeedEntry[]
  notifications: FeedEntry[]
  unread: number
  /** server time minus device time, in ms: countdowns never trust the device clock */
  clockOffsetMs: number
  apply: (patch: Partial<World>) => void
  reset: () => void
}

const EMPTY = { feed: [], notifications: [], unread: 0, clockOffsetMs: 0 }

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
  return (me: Me) => client.setQueryData(ME_KEY, me)
}

const SYNC_MS = 15_000

/** The one polling loop: every 15 s while the tab is visible, and immediately when it becomes visible. */
export function useSync(enabled: boolean) {
  const setMe = useSetMe()

  useEffect(() => {
    if (!enabled) return
    let stopped = false
    let running = false

    const run = async () => {
      if (stopped || running || document.visibilityState !== 'visible') return
      running = true
      try {
        const w = useWorld.getState()
        const res = await rpc('sync', {
          p_after_notification: w.notifications.at(-1)?.id ?? 0,
          p_after_feed: w.feed.at(-1)?.id ?? 0,
        })
        if (stopped) return
        setMe({ player: res.player, server: res.server })
        const firstLoad = w.feed.length === 0 && w.notifications.length === 0
        if (res.notifications.length && !firstLoad) sfx('notify')
        useWorld.getState().apply({
          clockOffsetMs: new Date(res.server.time).getTime() - Date.now(),
          feed: [...w.feed, ...res.feed].slice(-60),
          notifications: [...w.notifications, ...res.notifications].slice(-60),
          unread: firstLoad ? 0 : w.unread + res.notifications.length,
        })
      } catch {
        // Stay quiet: the next round tries again; the HUD keeps the last known state.
      } finally {
        running = false
      }
    }

    void run()
    const timer = setInterval(run, SYNC_MS)
    document.addEventListener('visibilitychange', run)
    return () => {
      stopped = true
      clearInterval(timer)
      document.removeEventListener('visibilitychange', run)
    }
  }, [enabled]) // eslint-disable-line react-hooks/exhaustive-deps -- setMe is stable enough: it only wraps the query client
}

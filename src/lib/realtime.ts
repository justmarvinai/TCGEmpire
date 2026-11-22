// Realtime pokes (docs/ARCHITECTURE.md §7): the database broadcasts that something changed, the client fetches it
// through the normal RPCs. Polling keeps running underneath, so a dropped connection only makes things slower.
import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getBackend } from './backend/index.ts'
import { rpc } from './rpc.ts'
import { syncNow } from './world.ts'

type Handler = (event: string, payload: Record<string, unknown>) => void

/** Listens on a topic while mounted (null: not yet known). The latest handler is always used. */
export function useTopic(topic: string | null | undefined, onMessage: Handler) {
  const handler = useRef(onMessage)
  useEffect(() => {
    handler.current = onMessage
  })
  useEffect(() => {
    if (!topic) return
    let off: (() => void) | undefined
    let live = true
    void getBackend().then((b) => {
      if (live) off = b.subscribe(topic, (e, p) => handler.current(e, p))
    })
    return () => {
      live = false
      off?.()
    }
  }, [topic])
}

/** World and personal channel of the signed-in player: a poke syncs at once (bursts are merged). */
export function useRealtimeSync() {
  const client = useQueryClient()
  const topics = useQuery({ queryKey: ['realtime'], queryFn: () => rpc('realtime_get'), staleTime: Infinity })
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const poke = () => {
    clearTimeout(timer.current)
    timer.current = setTimeout(syncNow, 250)
  }
  useTopic(topics.data?.world, (_event, payload) => {
    // A lobby change only concerns the battle pages.
    if (payload.area === 'battles') return void client.invalidateQueries({ queryKey: ['battles'] })
    if (payload.area === 'chat') void client.invalidateQueries({ queryKey: ['chat'] })
    poke()
  })
  useTopic(topics.data?.player, poke)
}

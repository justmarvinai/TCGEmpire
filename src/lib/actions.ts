// Write actions and read queries. Every write carries a fresh request id, puts the returned player into
// the HUD, refreshes the affected queries and asks for an immediate sync (level-ups, feed).
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import type { z } from 'zod'
import { toast } from '@/components/ui/toast.tsx'
import { errorText, newRequestId, rpc } from './rpc.ts'
import type { Player, RPC_SCHEMAS, RpcName } from './schemas.ts'
import { syncNow, useApplyPlayer } from './world.ts'

type Result<N extends RpcName> = z.infer<(typeof RPC_SCHEMAS)[N]>

export function useAct() {
  const client = useQueryClient()
  const applyPlayer = useApplyPlayer()
  return useCallback(
    async <N extends RpcName>(fn: N, args: Record<string, unknown> = {}, refresh: string[] = []): Promise<Result<N> | undefined> => {
      try {
        const res = await rpc(fn, { p_request_id: newRequestId(), ...args })
        const player = (res as { player?: Player }).player
        if (player) applyPlayer(player)
        for (const key of refresh) void client.invalidateQueries({ queryKey: [key] })
        syncNow()
        return res
      } catch (e) {
        toast('error', errorText(e))
        return undefined
      }
    },
    [client, applyPlayer],
  )
}

export const useShop = () => useQuery({ queryKey: ['shop'], queryFn: () => rpc('shop_get') })
export const useBinder = (set: string) =>
  useQuery({ queryKey: ['binder', set], queryFn: () => rpc('binder_get', { p_set: set }) })
export const useQuests = () => useQuery({ queryKey: ['quests'], queryFn: () => rpc('quests_get') })
export const useBunker = () => useQuery({ queryKey: ['bunker'], queryFn: () => rpc('bunker_get') })
export const useUpgrades = () => useQuery({ queryKey: ['upgrades'], queryFn: () => rpc('upgrades_get') })
export const useJobs = () => useQuery({ queryKey: ['jobs'], queryFn: () => rpc('jobs_get') })
export const useStats = () => useQuery({ queryKey: ['stats'], queryFn: () => rpc('stats_get') })
export const useHome = () => useQuery({ queryKey: ['home'], queryFn: () => rpc('home_get') })
export const usePlayers = () => useQuery({ queryKey: ['players'], queryFn: () => rpc('players_get') })
export const useLicenses = () => useQuery({ queryKey: ['licenses'], queryFn: () => rpc('licenses_get') })
export const useGrading = () => useQuery({ queryKey: ['grading'], queryFn: () => rpc('grading_get') })
export const useLevelPath = () =>
  useQuery({ queryKey: ['levelpath'], queryFn: () => rpc('level_path_get'), staleTime: 5 * 60_000 })

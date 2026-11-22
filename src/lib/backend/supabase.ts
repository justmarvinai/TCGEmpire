import { createClient, type RealtimeChannel } from '@supabase/supabase-js'
import type { Backend } from './types.ts'
import { RpcError } from './localRpc.ts'

// Supabase only gives every browser an anonymous auth user; which player that is gets decided by
// our own join/login RPCs. The client talks to the database through RPCs only.
export async function createSupabaseBackend(url: string, anonKey: string): Promise<Backend> {
  const supabase = createClient(url, anonKey)

  const ensureSession = async () => {
    const { data } = await supabase.auth.getSession()
    if (data.session) return
    const { error } = await supabase.auth.signInAnonymously()
    if (error) throw new RpcError('auth_unavailable')
  }
  await ensureSession()

  return {
    mode: 'supabase',
    async rpc(fn, args = {}) {
      await ensureSession()
      const { data, error } = await supabase.rpc(fn, args)
      if (error) throw new RpcError(/^[a-z_]+$/.test(error.message) ? error.message : 'server_error')
      return data
    },
    // Private channels: the database sends with realtime.send(..., private = true); a policy on realtime.messages
    // lets signed-in sessions receive. setAuth() hands the session token to Realtime before subscribing.
    subscribe(topic, onMessage) {
      let channel: RealtimeChannel | null = null
      let closed = false
      void (async () => {
        try {
          await ensureSession()
          await supabase.realtime.setAuth()
          if (closed) return
          channel = supabase
            .channel(topic, { config: { private: true } })
            .on('broadcast', { event: '*' }, (msg) => onMessage(String(msg.event), (msg.payload ?? {}) as Record<string, unknown>))
            .subscribe()
        } catch {
          // Realtime is an enhancement; polling keeps the game going.
        }
      })()
      return () => {
        closed = true
        if (channel) void supabase.removeChannel(channel)
      }
    },
  }
}

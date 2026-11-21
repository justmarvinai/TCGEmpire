import { createClient } from '@supabase/supabase-js'
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
  }
}

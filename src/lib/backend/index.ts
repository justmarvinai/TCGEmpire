import type { Backend } from './types.ts'

let backend: Promise<Backend> | undefined

export function getBackend(): Promise<Backend> {
  backend ??= create()
  return backend
}

async function create(): Promise<Backend> {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (url && key) {
    const { createSupabaseBackend } = await import('./supabase.ts')
    return createSupabaseBackend(url, key)
  }
  const { createLocalBackend } = await import('./local.ts')
  return createLocalBackend()
}

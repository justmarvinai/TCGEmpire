export interface Backend {
  /** `supabase` in production, `local` when the whole game runs in the browser (dev, tests). */
  readonly mode: 'supabase' | 'local'
  rpc(fn: string, args?: Record<string, unknown>): Promise<unknown>
  /** Local mode only: direct SQL for dev tools and tests. */
  readonly devSql?: (query: string, params?: unknown[]) => Promise<unknown[]>
}

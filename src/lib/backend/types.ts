export interface Backend {
  /** `supabase` in production, `local` when the whole game runs in the browser (dev, tests). */
  readonly mode: 'supabase' | 'local'
  rpc(fn: string, args?: Record<string, unknown>): Promise<unknown>
  /**
   * Realtime: calls `onMessage` for every broadcast on the topic until the returned function is called.
   * Messages are pokes (an area that changed); the data itself always comes through RPCs.
   */
  subscribe(topic: string, onMessage: (event: string, payload: Record<string, unknown>) => void): () => void
  /** Local mode only: direct SQL for dev tools and tests. */
  readonly devSql?: (query: string, params?: unknown[]) => Promise<unknown[]>
}

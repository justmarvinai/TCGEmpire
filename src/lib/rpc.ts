import type { z } from 'zod'
import { getBackend } from './backend/index.ts'
import { RpcError } from './backend/localRpc.ts'
import { RPC_SCHEMAS, type RpcName } from './schemas.ts'
import { texts } from '@/texts/de.ts'

export { RpcError }

/** Calls a server function and validates the answer against its contract. */
export async function rpc<N extends RpcName>(
  fn: N,
  args: Record<string, unknown> = {},
): Promise<z.infer<(typeof RPC_SCHEMAS)[N]>> {
  const backend = await getBackend()
  const raw = await backend.rpc(fn, args)
  const parsed = RPC_SCHEMAS[fn].safeParse(raw)
  if (!parsed.success) throw new RpcError('contract_mismatch')
  return parsed.data as z.infer<(typeof RPC_SCHEMAS)[N]>
}

/** Every write action carries a fresh id so a retry can never apply twice. */
export const newRequestId = () => crypto.randomUUID()

/** German message for any thrown error. */
export function errorText(error: unknown): string {
  const code = error instanceof RpcError ? error.code : 'server_error'
  return (texts.errors as Record<string, string>)[code] ?? texts.errors.server_error
}

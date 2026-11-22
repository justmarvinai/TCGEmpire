import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { errorText } from '@/lib/rpc.ts'
import { texts } from '@/texts/de.ts'
import { config } from '../../../content/config.ts'

const T = texts.battles
const EMOTES: readonly string[] = config['battle.emotes']

/** Emote buttons and the latest emotes of a battle or break; spectators may throw them too. */
export function Emotes({
  list,
  send,
  queryKey,
}: {
  list: { id: number; name: string; emote: string }[]
  send: (emote: string) => Promise<unknown>
  queryKey: unknown[]
}) {
  const client = useQueryClient()
  const [busy, setBusy] = useState(false)

  const throwEmote = async (emote: string) => {
    setBusy(true)
    try {
      await send(emote)
      void client.invalidateQueries({ queryKey })
    } catch (e) {
      toast('error', errorText(e))
    }
    setBusy(false)
  }

  return (
    <Panel title={T.emotes} tip={T.emotesTip}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex gap-1" role="group" aria-label={T.emotes}>
          {EMOTES.map((e) => (
            <Button key={e} size="sm" disabled={busy} onClick={() => void throwEmote(e)} aria-label={e}>
              <span className="text-lg leading-none">{e}</span>
            </Button>
          ))}
        </span>
        <ul className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {list.slice(-10).map((e) => (
            <li key={e.id} className="animate-pop rounded-full bg-surface-2 px-2 py-0.5 text-sm">
              <span className="text-fg-3">{e.name}</span> {e.emote}
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  )
}

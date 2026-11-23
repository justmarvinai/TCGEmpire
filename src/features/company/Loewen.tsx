import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { LOEWEN } from '../../../content/mogul.ts'
import { Button } from '@/components/ui/Button.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { useAct } from '@/lib/actions.ts'
import { formatMoney } from '@/lib/format.ts'
import { rpc } from '@/lib/rpc.ts'
import { sfx } from '@/lib/sfx.ts'
import { texts } from '@/texts/de.ts'
import { UNLOCKS } from '@/lib/catalog.ts'

const T = texts.loewen

/** Höhle der Löwen in the office: once a week, cash for a share of the company. */
export function Loewen({ level }: { level: number }) {
  const open = level >= UNLOCKS.loewen
  const q = useQuery({ queryKey: ['loewen'], queryFn: () => rpc('loewen_get'), enabled: open })
  const act = useAct()
  const client = useQueryClient()
  const [busy, setBusy] = useState<string | null>(null)
  const d = q.data
  const run = async (key: string, fn: 'loewen_pitch' | 'loewen_deal', args: Record<string, unknown>, done?: string) => {
    setBusy(key)
    const res = await act(fn, args, ['company'])
    setBusy(null)
    if (!res) return
    client.setQueryData(['loewen'], res)
    sfx(key === 'no' ? 'toggle' : 'success')
    if (done) toast(key === 'no' ? 'info' : 'success', done)
  }
  return (
    <Panel tour="loewen" title={T.title} tip={T.tip}>
      {!open ? (
        <p className="text-sm text-fg-3">{T.locked(UNLOCKS.loewen)}</p>
      ) : !d ? null : (
        <div className="flex flex-col gap-3 text-sm">
          <p className="text-fg-2">{T.share(d.investor_pct, d.max_pct)}</p>
          {!d.pitch ? (
            <Button
              className="self-start"
              variant="primary"
              loading={busy === 'pitch'}
              disabled={busy !== null || d.investor_pct >= d.max_pct}
              onClick={() => void run('pitch', 'loewen_pitch', {})}
            >
              {T.pitch}
            </Button>
          ) : d.pitch.chosen !== null ? (
            <p className="text-fg-3">{d.pitch.chosen >= 0 ? T.dealDone(LOEWEN[d.pitch.offers[d.pitch.chosen]!.lion]?.name ?? '') : T.noDealDone}</p>
          ) : (
            <>
              <ul className="flex flex-col gap-2">
                {d.pitch.offers.map((o, i) => (
                  <li key={o.lion} className="flex flex-col gap-1 rounded-xl bg-surface-2 p-3">
                    <span className="font-semibold">{LOEWEN[o.lion]?.name}</span>
                    <span className="text-fg-2 italic">„{LOEWEN[o.lion]?.line}“</span>
                    <span className="nums">{T.offer(formatMoney(o.cents), o.share_pct)}</span>
                    <Button
                      size="sm"
                      className="self-start"
                      variant="primary"
                      loading={busy === String(i)}
                      disabled={busy !== null}
                      onClick={() => void run(String(i), 'loewen_deal', { p_offer: i }, T.deal(LOEWEN[o.lion]?.name ?? '', formatMoney(o.cents)))}
                    >
                      {T.accept}
                    </Button>
                  </li>
                ))}
              </ul>
              <Button className="self-start" size="sm" loading={busy === 'no'} disabled={busy !== null} onClick={() => void run('no', 'loewen_deal', { p_offer: null }, T.noDealDone)}>
                {T.decline}
              </Button>
            </>
          )}
        </div>
      )}
    </Panel>
  )
}

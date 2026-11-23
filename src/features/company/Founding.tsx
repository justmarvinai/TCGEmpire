import clsx from 'clsx'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { emblemFrom } from '@/components/pixel/Emblem.tsx'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Dialog } from '@/components/ui/Dialog.tsx'
import { Field } from '@/components/ui/Field.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { useAct } from '@/lib/actions.ts'
import { formatDuration, formatMoney } from '@/lib/format.ts'
import { useNow } from '@/lib/pure.ts'
import type { CompanyDoc, CompanyLabel, Player } from '@/lib/schemas.ts'
import { sfx } from '@/lib/sfx.ts'
import { useWorld } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'
import { A38_ROOMS } from '../../../content/company.ts'
import { LabelDesigner, LabelPreview } from './LabelDesigner.tsx'

const T = texts.company

/** Gewerbeanmeldung: the application, the Passierschein A38, then the founding. */
export function Founding({ d, player }: { d: CompanyDoc; player: Player }) {
  const act = useAct()
  const client = useQueryClient()
  const now = useNow() + useWorld((w) => w.clockOffsetMs)
  const [busy, setBusy] = useState(false)
  const [a38, setA38] = useState(false)
  const step = d.founding?.step ?? 0
  const readyIn = d.founding ? Math.max(0, Math.ceil((Date.parse(d.founding.ready_at) - now) / 1000)) : 0

  const run = async (p_step: 'antrag' | 'a38') => {
    setBusy(true)
    const res = await act('company_found_step', { p_step })
    setBusy(false)
    if (!res) return
    client.setQueryData(['company'], res)
    sfx('success')
    if (p_step === 'a38') {
      setA38(false)
      toast('success', T.a38Done)
    }
  }

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[22rem_1fr]">
      <Panel title={T.foundTitle} tip={T.foundTip}>
        <ol className="flex flex-col gap-3">
          {[T.step1, T.step2, T.step3].map((name, i) => (
            <li
              key={name}
              className={clsx(
                'flex items-center gap-3 rounded-xl p-3',
                step === i ? 'bg-surface-3' : 'bg-surface-2',
              )}
            >
              <span
                className={clsx(
                  'grid size-8 shrink-0 place-items-center rounded-full font-bold',
                  step > i ? 'bg-gain text-ink' : 'bg-surface-1 text-fg-2',
                )}
              >
                {step > i ? <PixelIcon name="check" /> : i + 1}
              </span>
              <span className={clsx('text-sm font-semibold', step < i && 'text-fg-3')}>{name}</span>
            </li>
          ))}
        </ol>
      </Panel>

      {step === 0 && (
        <Panel title={T.step1} tip={T.step1Tip}>
          <p className="text-sm text-fg-2">{T.step1Text(formatMoney(d.found_fee_cents))}</p>
          <Button
            variant="primary"
            className="mt-4"
            loading={busy}
            disabled={busy || player.cash_cents < d.found_fee_cents}
            onClick={() => void run('antrag')}
          >
            {T.apply}
          </Button>
        </Panel>
      )}
      {step === 1 && (
        <Panel title={T.step2} tip={T.step2Tip}>
          {readyIn > 0 ? (
            <p className="nums text-sm text-fg-2" aria-live="polite">
              {T.waiting(formatDuration(readyIn))}
            </p>
          ) : (
            <>
              <p className="text-sm text-fg-2">{T.step2Text}</p>
              <Button variant="primary" className="mt-4" onClick={() => setA38(true)}>
                {T.a38Start}
              </Button>
            </>
          )}
        </Panel>
      )}
      {step === 2 && <FoundForm d={d} player={player} />}
      {a38 && <A38Dialog busy={busy} onDone={() => void run('a38')} onClose={() => setA38(false)} />}
    </div>
  )
}

/** Three doors per room; the wrong one sends you back to the start. */
function A38Dialog({ busy, onDone, onClose }: { busy: boolean; onDone: () => void; onClose: () => void }) {
  const [room, setRoom] = useState(0)
  const [wrong, setWrong] = useState(false)
  const r = A38_ROOMS[room]!
  const pick = (door: number) => {
    if (door !== r.right) {
      sfx('error')
      setWrong(true)
      setRoom(0)
      return
    }
    setWrong(false)
    if (room + 1 >= A38_ROOMS.length) onDone()
    else setRoom(room + 1)
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={T.a38Title} description={T.step2Text}>
      {wrong && (
        <p className="mb-3 rounded-lg bg-loss/15 p-2 text-sm text-loss animate-shake">{T.a38Wrong}</p>
      )}
      <p className="mb-4 text-sm text-fg-2">{r.text}</p>
      <div className="flex flex-col gap-2">
        {r.doors.map((door, i) => (
          <Button key={door} disabled={busy} loading={busy && i === r.right} onClick={() => pick(i)}>
            {door}
          </Button>
        ))}
      </div>
      <p className="mt-3 text-right text-xs text-fg-3">
        {room + 1} / {A38_ROOMS.length}
      </p>
    </Dialog>
  )
}

function FoundForm({ d, player }: { d: CompanyDoc; player: Player }) {
  const act = useAct()
  const client = useQueryClient()
  const [name, setName] = useState('')
  const [slogan, setSlogan] = useState('')
  const [label, setLabel] = useState<CompanyLabel>({
    bg: 'blau',
    fg: 'weiss',
    emblem: emblemFrom(player.username),
  })
  const [busy, setBusy] = useState(false)
  const valid = name.trim().length >= 3 && name.trim().length <= 24 && slogan.length <= 60

  const found = async () => {
    setBusy(true)
    const res = await act('company_found', { p_name: name.trim(), p_slogan: slogan.trim(), p_label: label })
    setBusy(false)
    if (!res) return
    client.setQueryData(['company'], res)
    sfx('levelup')
    toast('success', T.founded(name.trim()))
  }

  return (
    <Panel title={T.step3} tip={T.step3Tip}>
      <p className="mb-4 text-sm text-fg-2">{T.step3Text(formatMoney(d.found_cost_cents))}</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <Field
          label={T.name}
          placeholder={T.namePlaceholder}
          maxLength={24}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Field
          label={T.slogan}
          placeholder={T.sloganPlaceholder}
          maxLength={60}
          value={slogan}
          onChange={(e) => setSlogan(e.target.value)}
        />
      </div>
      <h3 className="mt-5 mb-2 text-xs font-bold tracking-wider text-fg-3 uppercase">{T.labelTitle}</h3>
      <LabelPreview label={label} name={name} slogan={slogan} className="mb-4 max-w-md" />
      <LabelDesigner value={label} onChange={setLabel} seed={name || player.username} />
      <Button
        variant="primary"
        className="mt-5"
        loading={busy}
        disabled={busy || !valid || player.cash_cents < d.found_cost_cents}
        onClick={() => void found()}
      >
        {T.found} · {formatMoney(d.found_cost_cents)}
      </Button>
    </Panel>
  )
}

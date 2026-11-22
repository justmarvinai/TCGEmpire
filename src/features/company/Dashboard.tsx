import clsx from 'clsx'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { PixelIcon, type IconName } from '@/components/pixel/PixelIcon.tsx'
import { Avatar } from '@/components/ui/Avatar.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Dialog } from '@/components/ui/Dialog.tsx'
import { Field } from '@/components/ui/Field.tsx'
import { HoldButton } from '@/components/ui/HoldButton.tsx'
import { InfoTip } from '@/components/ui/InfoTip.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { Progress } from '@/components/ui/Progress.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { useAct } from '@/lib/actions.ts'
import { formatDate, formatDuration, formatMoney, formatNumber, formatStars } from '@/lib/format.ts'
import { useNow } from '@/lib/pure.ts'
import {
  COMPANY_SERVICES,
  COMPANY_STATIONS,
  type Company,
  type CompanyDoc,
  type CompanyStation,
  type Hakt,
  type Player,
  type RpcName,
} from '@/lib/schemas.ts'
import { sfx } from '@/lib/sfx.ts'
import { useMe, useWorld } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'
import { EQUIPMENT, REVIEWS, STAGES, STATION_DEFS } from '../../../content/company.ts'
import { LabelDesigner, LabelPreview } from './LabelDesigner.tsx'
import { personCv, personName } from './people.ts'

const T = texts.company
const TABS = ['overview', 'team', 'build', 'reviews'] as const
type Tab = (typeof TABS)[number]
const STATION_ICON: Record<CompanyStation, IconName> = {
  annahme: 'gift',
  pruefung: 'loupe',
  slabbing: 'slab',
  versand: 'pack',
}
const stationName = (s: string) => STATION_DEFS.find((d) => d.key === s)?.name ?? s
const stageName = (n: number) => STAGES.find((s) => s.stage === n)?.name ?? String(n)
const money = (cents: number) => formatMoney(Math.round(cents))

/** Every write here answers with the whole company; this puts it into the cache. */
function useCompanyAct() {
  const act = useAct()
  const client = useQueryClient()
  const [busy, setBusy] = useState<string | null>(null)
  const run = async (key: string, fn: RpcName, args: Record<string, unknown>, done?: string) => {
    setBusy(key)
    const res = (await act(fn, args)) as CompanyDoc | undefined
    setBusy(null)
    if (!res) return false
    client.setQueryData(['company'], res)
    sfx('success')
    if (done) toast('success', done)
    return true
  }
  return { busy, run }
}

export function Dashboard({ d, player }: { d: CompanyDoc; player: Player }) {
  const co = d.company!
  const [tab, setTab] = useState<Tab>('overview')
  return (
    <div className="flex flex-col gap-4">
      <Header co={co} player={player} />
      <div className="flex flex-wrap gap-1 self-start rounded-xl bg-surface-2 p-1" role="tablist">
        {TABS.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={clsx(
              'rounded-lg px-4 py-2 text-sm font-semibold',
              tab === k ? 'bg-grad text-white' : 'text-fg-2 hover:text-fg',
            )}
          >
            {T.tabs[k]}
          </button>
        ))}
      </div>
      {tab === 'overview' && (
        <div className="grid items-start gap-4 xl:grid-cols-[1fr_24rem]">
          <div className="flex min-w-0 flex-col gap-4">
            <HaktPanel co={co} onTab={setTab} />
            <Pipeline co={co} />
          </div>
          <Finances co={co} />
        </div>
      )}
      {tab === 'team' && <Team co={co} />}
      {tab === 'build' && (
        <div className="grid items-start gap-4 xl:grid-cols-2">
          <Prices co={co} />
          <Stage co={co} />
          <Equipment co={co} />
          <LabelEdit co={co} />
        </div>
      )}
      {tab === 'reviews' && <Reviews co={co} />}
    </div>
  )
}

function Header({ co, player }: { co: Company; player: Player }) {
  const [money_, setMoney] = useState<'in' | 'out' | null>(null)
  const stat = (label: string, tip: string, value: string) => (
    <div className="flex flex-col">
      <span className="flex items-center gap-1 text-xs text-fg-3">
        {label} <InfoTip>{tip}</InfoTip>
      </span>
      <span className="nums text-lg font-bold">{value}</span>
    </div>
  )
  return (
    <Panel>
      <div className="flex flex-wrap items-center gap-5">
        <LabelPreview label={co.label} name={co.name} slogan={co.slogan} className="min-w-64 flex-1" />
        <div className="flex flex-col">
          <span className="text-xs text-fg-3">{T.stage}</span>
          <span className="font-bold">{stageName(co.stage)}</span>
        </div>
        {stat(T.ruf, T.rufTip, `★ ${formatStars(co.ruf)}`)}
        {stat(T.brand, T.brandTip, `${Math.round(co.brand_bps / 100)} %`)}
        {stat(T.accuracy, T.accuracyTip, `${String(co.accuracy).replace('.', ',')} %`)}
        {stat(T.value, T.valueTip, money(co.value_cents))}
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-1 text-xs text-fg-3">
            {T.account} <InfoTip>{T.accountTip}</InfoTip>
          </span>
          <span className="nums text-xl font-bold text-gold">{money(co.cash_cents)}</span>
          <span className="flex gap-2">
            <Button size="sm" onClick={() => setMoney('in')}>
              {T.deposit}
            </Button>
            <Button size="sm" disabled={co.cash_cents <= 0} onClick={() => setMoney('out')}>
              {T.payout}
            </Button>
          </span>
        </div>
      </div>
      {money_ && (
        <MoneyDialog co={co} player={player} payout={money_ === 'out'} onClose={() => setMoney(null)} />
      )}
    </Panel>
  )
}

function MoneyDialog({
  co,
  player,
  payout,
  onClose,
}: {
  co: Company
  player: Player
  payout: boolean
  onClose: () => void
}) {
  const { busy, run } = useCompanyAct()
  const max = payout ? co.cash_cents : player.cash_cents
  const [euros, setEuros] = useState(String(Math.floor(max / 100)))
  const cents = Math.round(Number(euros.replace(',', '.')) * 100)
  const valid = Number.isFinite(cents) && cents >= 1 && cents <= max
  const send = async () => {
    const ok = await run(
      'money',
      'company_money',
      { p_cents: cents, p_payout: payout },
      payout ? T.paidOut(money(cents)) : T.deposited(money(cents)),
    )
    if (ok) onClose()
  }
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={T.moneyTitle(payout)}
      description={T.moneyDesc(payout, co.payout_tax_pct)}
    >
      <Field
        label={T.amount}
        type="number"
        inputMode="decimal"
        min={0.01}
        max={max / 100}
        step="0.01"
        value={euros}
        onChange={(e) => setEuros(e.target.value)}
      />
      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={onClose}>{texts.common.cancel}</Button>
        <Button
          variant="primary"
          loading={busy === 'money'}
          disabled={!valid || busy !== null}
          onClick={() => void send()}
        >
          {payout ? T.payout : T.deposit}
        </Button>
      </div>
    </Dialog>
  )
}

function haktLine(h: Hakt) {
  const L = T.haktLines
  switch (h.key) {
    case 'kasse':
      return L.kasse(money(h.need_cents ?? 0))
    case 'tempo':
      return L.tempo(stationName(h.station ?? ''))
    case 'bekanntheit':
      return L.bekanntheit
    case 'genauigkeit':
      return L.genauigkeit(String(Math.abs(h.ruf_h ?? 0)).replace('.', ','))
    case 'preis':
      return L.preis(T.services[h.service ?? ''] ?? '', money(h.fair_cents ?? 0))
    case 'team':
      return L.team
  }
}

function HaktPanel({ co, onTab }: { co: Company; onTab: (t: Tab) => void }) {
  const { busy, run } = useCompanyAct()
  const [deposit, setDeposit] = useState(false)
  const fix = (h: Hakt, i: number) => {
    const key = `h${i}`
    if (h.key === 'kasse')
      return (
        <Button size="sm" variant="primary" onClick={() => setDeposit(true)}>
          {T.fixDeposit}
        </Button>
      )
    if (h.action === 'equipment' && h.station && h.cost_cents != null) {
      const name = EQUIPMENT[h.station][h.level ?? 0]?.name ?? ''
      return (
        <Button
          size="sm"
          variant="primary"
          loading={busy === key}
          disabled={busy !== null || co.cash_cents < h.cost_cents}
          onClick={() => void run(key, 'company_equipment_buy', { p_station: h.station }, T.bought(name))}
        >
          {T.fixEquipment(name, money(h.cost_cents))}
        </Button>
      )
    }
    if (h.action === 'price' && h.service && h.fair_cents) {
      return (
        <Button
          size="sm"
          variant="primary"
          loading={busy === key}
          disabled={busy !== null}
          onClick={() =>
            void run(key, 'company_prices_set', { p_prices: { [h.service!]: h.fair_cents } }, T.pricesSaved)
          }
        >
          {T.fixPrice(money(h.fair_cents))}
        </Button>
      )
    }
    if (h.action === 'raise' && h.staff) {
      return (
        <Button
          size="sm"
          variant="primary"
          loading={busy === key}
          disabled={busy !== null}
          onClick={() =>
            void run(key, 'company_staff_act', { p_staff: h.staff, p_action: 'raise', p_arg: null }, T.raised)
          }
        >
          {T.fixRaise}
        </Button>
      )
    }
    if (h.action === 'hire' || h.action === 'equipment')
      return (
        <Button size="sm" onClick={() => onTab('team')}>
          {T.fixHire}
        </Button>
      )
    return <span className="text-xs text-fg-3">{T.fixMarketing}</span>
  }
  return (
    <Panel title={T.hakt} tip={T.haktTip}>
      {co.hakt.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-gain">
          <PixelIcon name="check" /> {T.haktNone}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {co.hakt.map((h, i) => (
            <li
              key={`${h.key}-${i}`}
              className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-2 p-3"
            >
              <span className="min-w-0 flex-1 text-sm">
                {haktLine(h)}
                <span className="nums ml-2 text-xs font-semibold text-loss">
                  {T.haktCost(money(h.cents_h))}
                </span>
                {h.gain_cents_h != null && h.gain_cents_h > 0 && (
                  <span className="nums ml-2 text-xs font-semibold text-gain">
                    {T.haktGain(money(h.gain_cents_h))}
                  </span>
                )}
              </span>
              {fix(h, i)}
            </li>
          ))}
        </ul>
      )}
      {deposit && <DepositShortcut co={co} onClose={() => setDeposit(false)} />}
    </Panel>
  )
}

function DepositShortcut({ co, onClose }: { co: Company; onClose: () => void }) {
  const player = useMe().data?.player
  if (!player) return null
  return <MoneyDialog co={co} player={player} payout={false} onClose={onClose} />
}

function Pipeline({ co }: { co: Company }) {
  const demand = co.demand.total
  const top = Math.max(demand, ...COMPANY_STATIONS.map((s) => co.caps[s])) || 1
  const neck = COMPANY_STATIONS.reduce((a, b) => (co.caps[b] < co.caps[a] ? b : a))
  const people = (s: CompanyStation) => co.staff.filter((x) => x.station === s)
  return (
    <Panel title={T.pipeline} tip={T.pipelineTip}>
      <div className="mb-4 grid grid-cols-3 gap-3 text-sm">
        <div>
          <span className="flex items-center gap-1 text-xs text-fg-3">
            {T.customers} <InfoTip>{T.customersTip}</InfoTip>
          </span>
          <span className="nums text-lg font-bold">{T.perHour(formatNumber(Math.round(demand)))}</span>
        </div>
        <div>
          <span className="flex items-center gap-1 text-xs text-fg-3">
            {T.capacity} <InfoTip>{T.capacityTip}</InfoTip>
          </span>
          <span className={clsx('nums text-lg font-bold', co.capacity < demand ? 'text-loss' : 'text-gain')}>
            {T.perHour(formatNumber(Math.round(co.capacity)))}
          </span>
        </div>
        <div>
          <span className="flex items-center gap-1 text-xs text-fg-3">
            {T.queue} <InfoTip>{T.queueTip}</InfoTip>
          </span>
          <span className="nums text-lg font-bold">
            {T.queueValue(
              formatNumber(Math.round(co.backlog)),
              String(co.demand.backlog_hours).replace('.', ','),
            )}
          </span>
        </div>
      </div>
      <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {COMPANY_STATIONS.map((s) => (
          <li
            key={s}
            className={clsx(
              'flex flex-col gap-2 rounded-xl bg-surface-2 p-3 outline-2 -outline-offset-2',
              s === neck ? 'outline-loss' : 'outline-transparent',
            )}
          >
            <span className="flex items-center gap-2 font-bold">
              <PixelIcon name={STATION_ICON[s]} /> {stationName(s)}
            </span>
            {s === neck && (
              <span className="self-start rounded bg-loss/15 px-1.5 text-[0.65rem] font-bold text-loss uppercase">
                {T.bottleneck}
              </span>
            )}
            <Progress
              value={co.caps[s] / top}
              tone={s === neck ? 'loss' : 'accent'}
              label={T.perHour(formatNumber(Math.round(co.caps[s])))}
            />
            <span className="nums text-xs text-fg-2">{T.perHour(formatNumber(Math.round(co.caps[s])))}</span>
            <span className="text-xs text-fg-3">{EQUIPMENT[s][co.equipment[s]]?.name}</span>
            <span className="flex flex-wrap gap-1">
              {people(s).length === 0 ? (
                <span className="text-xs text-fg-3">{T.nobody}</span>
              ) : (
                people(s).map((p) => (
                  <span key={p.id} title={personName(p)}>
                    <Avatar name={personName(p)} size={22} />
                  </span>
                ))
              )}
            </span>
          </li>
        ))}
      </ol>
    </Panel>
  )
}

function Finances({ co }: { co: Company }) {
  const revenue = Math.min(co.capacity, co.demand.total) * co.demand.avg_price_cents
  const material = Math.min(co.capacity, co.demand.total) * co.costs.material
  const row = (label: string, cents: number, tone?: string) => (
    <div className="flex justify-between text-sm">
      <span className="text-fg-2">{label}</span>
      <span className={clsx('nums font-semibold', tone)}>{money(cents)}</span>
    </div>
  )
  return (
    <Panel title={T.finances} tip={T.financesTip}>
      <p className="mb-2 text-xs text-fg-3">{T.perHourShort}</p>
      <div className="flex flex-col gap-1">
        {row(T.revenue, revenue, 'text-gain')}
        {row(T.material, -material)}
        {row(T.wages, -co.costs.wages)}
        {row(T.rent, -co.costs.rent)}
        {row(T.power, -co.costs.power)}
        <div className="mt-1 border-t border-line pt-1">
          {row(T.profit, co.profit_h, co.profit_h >= 0 ? 'text-gain' : 'text-loss')}
        </div>
      </div>
      <table className="nums mt-4 w-full text-xs">
        <thead className="text-fg-3">
          <tr>
            <th className="text-left font-normal">{T.day}</th>
            <th className="text-right font-normal">{T.orders}</th>
            <th className="text-right font-normal">{T.profit}</th>
          </tr>
        </thead>
        <tbody>
          {co.days.length === 0 && (
            <tr>
              <td colSpan={3} className="pt-2 text-fg-3">
                {T.noDays}
              </td>
            </tr>
          )}
          {[...co.days].reverse().map((x) => (
            <tr key={x.day}>
              <td className="py-0.5">{formatDate(x.day)}</td>
              <td className="text-right">{formatNumber(x.orders)}</td>
              <td
                className={clsx(
                  'text-right font-semibold',
                  x.revenue_cents - x.costs_cents >= 0 ? 'text-gain' : 'text-loss',
                )}
              >
                {money(x.revenue_cents - x.costs_cents)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  )
}

function Team({ co }: { co: Company }) {
  const { busy, run } = useCompanyAct()
  const [station, setStation] = useState<Record<number, CompanyStation>>({})
  const full = co.staff.length >= co.staff_cap
  const bar = (label: string, v: number, tone: 'accent' | 'gain' | 'loss' = 'accent') => (
    <span className="flex items-center gap-2 text-xs">
      <span className="w-20 text-fg-3">{label}</span>
      <Progress value={v / 100} tone={tone} className="flex-1" label={`${label} ${v}`} />
      <span className="nums w-7 text-right">{v}</span>
    </span>
  )
  return (
    <div className="grid items-start gap-4 xl:grid-cols-2">
      <Panel title={`${T.team} · ${co.staff.length}/${co.staff_cap}`} tip={T.teamTip(co.staff_cap)}>
        {co.staff.length === 0 && <p className="text-sm text-fg-3">{T.teamEmpty}</p>}
        <ul className="flex flex-col gap-3">
          {co.staff.map((p) => {
            const name = personName(p)
            const train = Math.round(p.wage_cents * co.train_cost_hours)
            return (
              <li key={p.id} className="flex flex-col gap-2 rounded-xl bg-surface-2 p-3">
                <span className="flex items-center gap-2">
                  <Avatar name={name} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{name}</span>
                    <span className="block truncate text-xs text-fg-3">{personCv(p.archetype)}</span>
                  </span>
                  <span className="nums text-sm text-gold">{T.wage(money(p.wage_cents))}</span>
                </span>
                {bar(T.tempo, p.tempo)}
                {bar(T.accuracyShort, p.accuracy)}
                {bar(T.loyalty, p.loyalty, p.loyalty < 30 ? 'loss' : 'gain')}
                <span className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1 text-xs text-fg-3">
                    {T.station}
                    <select
                      className="panel-inset h-8 bg-transparent px-1 text-sm text-fg"
                      value={p.station}
                      onChange={(e) =>
                        void run(
                          `m${p.id}`,
                          'company_staff_act',
                          { p_staff: p.id, p_action: 'move', p_arg: e.target.value },
                          T.moved,
                        )
                      }
                    >
                      {COMPANY_STATIONS.map((s) => (
                        <option key={s} value={s}>
                          {stationName(s)}
                        </option>
                      ))}
                    </select>
                  </label>
                  {p.trainings < co.train_max &&
                    (['tempo', 'accuracy'] as const).map((k) => (
                      <Button
                        key={k}
                        size="sm"
                        loading={busy === `t${p.id}${k}`}
                        disabled={busy !== null || co.cash_cents < train}
                        onClick={() =>
                          void run(
                            `t${p.id}${k}`,
                            'company_staff_act',
                            { p_staff: p.id, p_action: 'train', p_arg: k },
                            T.trained,
                          )
                        }
                      >
                        {T.train(k === 'tempo' ? T.tempo : T.accuracyShort, money(train))}
                      </Button>
                    ))}
                  <Button
                    size="sm"
                    loading={busy === `r${p.id}`}
                    disabled={busy !== null}
                    onClick={() =>
                      void run(
                        `r${p.id}`,
                        'company_staff_act',
                        { p_staff: p.id, p_action: 'raise', p_arg: null },
                        T.raised,
                      )
                    }
                  >
                    {T.raise}
                  </Button>
                  <HoldButton
                    disabled={busy !== null || co.cash_cents < p.wage_cents * co.fire_cost_hours}
                    onHold={() =>
                      void run(
                        `f${p.id}`,
                        'company_staff_act',
                        { p_staff: p.id, p_action: 'fire', p_arg: null },
                        T.fired,
                      )
                    }
                  >
                    {T.fire(money(p.wage_cents * co.fire_cost_hours))}
                  </HoldButton>
                </span>
              </li>
            )
          })}
        </ul>
      </Panel>
      <Panel title={T.applicants} tip={T.applicantsTip}>
        {co.applicants.length === 0 && <p className="text-sm text-fg-3">{T.applicantsEmpty}</p>}
        {full && co.applicants.length > 0 && <p className="mb-2 text-sm text-fg-3">{T.teamFull}</p>}
        <ul className="flex flex-col gap-3">
          {co.applicants.map((a) => {
            const name = personName(a)
            const at = station[a.id] ?? 'pruefung'
            return (
              <li key={a.id} className="flex flex-col gap-2 rounded-xl bg-surface-2 p-3">
                <span className="flex items-center gap-2">
                  <Avatar name={name} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{name}</span>
                    <span className="block text-xs text-fg-3">{personCv(a.archetype)}</span>
                  </span>
                  <span className="nums text-sm text-gold">{T.wage(money(a.wage_cents))}</span>
                </span>
                {bar(T.tempo, a.tempo)}
                {bar(T.accuracyShort, a.accuracy)}
                {bar(T.loyalty, a.loyalty, a.loyalty < 30 ? 'loss' : 'gain')}
                <span className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label={T.station}
                    className="panel-inset h-8 bg-transparent px-1 text-sm text-fg"
                    value={at}
                    onChange={(e) => setStation({ ...station, [a.id]: e.target.value as CompanyStation })}
                  >
                    {COMPANY_STATIONS.map((s) => (
                      <option key={s} value={s}>
                        {stationName(s)}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="primary"
                    loading={busy === `h${a.id}`}
                    disabled={busy !== null || full}
                    onClick={() =>
                      void run(
                        `h${a.id}`,
                        'company_hire',
                        { p_applicant: a.id, p_station: at },
                        T.hired(name),
                      )
                    }
                  >
                    {T.hire}
                  </Button>
                </span>
              </li>
            )
          })}
        </ul>
      </Panel>
    </div>
  )
}

function Prices({ co }: { co: Company }) {
  const { busy, run } = useCompanyAct()
  const [draft, setDraft] = useState<Record<string, string>>({})
  const value = (s: string) => draft[s] ?? String((co.prices[s] ?? 0) / 100)
  const changed = Object.keys(draft).length > 0
  const save = async () => {
    const prices = Object.fromEntries(
      Object.entries(draft).map(([k, v]) => [k, Math.round(Number(v.replace(',', '.')) * 100)]),
    )
    if (await run('prices', 'company_prices_set', { p_prices: prices }, T.pricesSaved)) setDraft({})
  }
  return (
    <Panel title={T.prices} tip={T.pricesTip}>
      <div className="flex flex-col gap-3">
        {COMPANY_SERVICES.map((s) => {
          const live = co.demand.services[s]
          const open = co.services.includes(s)
          return (
            <div key={s} className={clsx('flex flex-wrap items-end gap-3', !open && 'opacity-50')}>
              <Field
                label={T.services[s] ?? s}
                type="number"
                min={1}
                step="1"
                className="w-36"
                disabled={!open}
                value={value(s)}
                onChange={(e) => setDraft({ ...draft, [s]: e.target.value })}
              />
              {live ? (
                <span className="nums pb-1 text-xs text-fg-3">
                  {T.fair(money(live.fair_cents))} ·{' '}
                  {T.priceFactor(String(live.price_factor).replace('.', ','))}
                </span>
              ) : (
                <span className="pb-1 text-xs text-fg-3">
                  {T.serviceLocked(stageName(STAGES.find((x) => x.services.includes(s))?.stage ?? 1))}
                </span>
              )}
            </div>
          )
        })}
        <Button
          variant="primary"
          className="self-start"
          loading={busy === 'prices'}
          disabled={!changed || busy !== null}
          onClick={() => void save()}
        >
          {T.savePrices}
        </Button>
      </div>
    </Panel>
  )
}

function Equipment({ co }: { co: Company }) {
  const { busy, run } = useCompanyAct()
  return (
    <Panel title={T.equipment} tip={T.equipmentTip}>
      <ul className="flex flex-col gap-2">
        {COMPANY_STATIONS.map((s) => {
          const lvl = co.equipment[s]
          const next = co.equipment_next[s]
          const nextDef = EQUIPMENT[s][lvl + 1]
          return (
            <li key={s} className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-2 p-3">
              <PixelIcon name={STATION_ICON[s]} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">
                  {stationName(s)}: {EQUIPMENT[s][lvl]?.name}
                </span>
                <span className="block text-xs text-fg-3">
                  {nextDef ? `→ ${nextDef.name}: ${nextDef.text}` : EQUIPMENT[s][lvl]?.text}
                </span>
              </span>
              {next ? (
                <Button
                  size="sm"
                  variant="primary"
                  loading={busy === s}
                  disabled={busy !== null || co.cash_cents < next.cost_cents}
                  onClick={() =>
                    void run(s, 'company_equipment_buy', { p_station: s }, T.bought(nextDef?.name ?? ''))
                  }
                >
                  {T.buy(money(next.cost_cents))}
                </Button>
              ) : (
                <span className="text-xs text-fg-3">{T.maxEquipment}</span>
              )}
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

function Stage({ co }: { co: Company }) {
  const { busy, run } = useCompanyAct()
  const now = useNow() + useWorld((w) => w.clockOffsetMs)
  const next = STAGES.find((s) => s.stage === co.stage + 1)
  return (
    <Panel title={T.stage} tip={T.stageTip}>
      <p className="mb-3 font-bold">{stageName(co.stage)}</p>
      {co.stage_pending && co.stage_ready_at ? (
        <p className="nums text-sm text-fg-2">
          {STAGES.find((s) => s.stage === co.stage_pending)?.quest}{' '}
          {T.stagePending(
            stageName(co.stage_pending),
            formatDuration(Math.max(0, Math.ceil((Date.parse(co.stage_ready_at) - now) / 1000))),
          )}
        </p>
      ) : co.next_stage && next ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-fg-2">
            {T.stageUnlocks(next.staffCap, next.services.map((s) => T.services[s]).join(', '))}
          </p>
          <p className="text-xs text-fg-3">{next.quest}</p>
          <Button
            variant="primary"
            className="self-start"
            loading={busy === 'stage'}
            disabled={busy !== null || co.cash_cents < co.next_stage.cost_cents}
            onClick={() => void run('stage', 'company_stage_up', {}, T.stageUp(next.name))}
          >
            {T.stageNext(next.name, money(co.next_stage.cost_cents))}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-fg-3">{T.stageMax}</p>
      )}
    </Panel>
  )
}

function LabelEdit({ co }: { co: Company }) {
  const { busy, run } = useCompanyAct()
  const [label, setLabel] = useState(co.label)
  const [slogan, setSlogan] = useState(co.slogan)
  return (
    <Panel title={T.labelTitle} tip={T.labelTip}>
      <LabelPreview label={label} name={co.name} slogan={slogan} className="mb-4" />
      <Field
        label={T.slogan}
        maxLength={60}
        value={slogan}
        onChange={(e) => setSlogan(e.target.value)}
        className="mb-4"
      />
      <LabelDesigner value={label} onChange={setLabel} seed={co.name} />
      <Button
        variant="primary"
        className="mt-4"
        loading={busy === 'label'}
        disabled={busy !== null}
        onClick={() =>
          void run('label', 'company_label_set', { p_slogan: slogan, p_label: label }, T.labelSaved)
        }
      >
        {T.saveLabel}
      </Button>
    </Panel>
  )
}

function Reviews({ co }: { co: Company }) {
  return (
    <Panel title={T.reviews} tip={T.reviewsTip}>
      {co.stars_avg !== null && (
        <p className="mb-3 font-bold text-gold">★ {T.starsAvg(String(co.stars_avg).replace('.', ','))}</p>
      )}
      {co.reviews.length === 0 ? (
        <p className="text-sm text-fg-3">{T.reviewsEmpty}</p>
      ) : (
        <ul className="grid gap-2 lg:grid-cols-2">
          {co.reviews.map((r) => (
            <li key={r.id} className="rounded-xl bg-surface-2 p-3">
              <span className="block text-sm text-gold" aria-label={`${r.stars} / 5`}>
                {'★'.repeat(r.stars)}
                <span className="text-fg-3">{'★'.repeat(5 - r.stars)}</span>
              </span>
              <span className="mt-1 block text-sm text-fg-2">„{REVIEWS[r.stars - 1]?.[r.text] ?? ''}“</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

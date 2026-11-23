import clsx from 'clsx'
import { useState } from 'react'
import { Link } from 'react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { Avatar, PlayerName } from '@/components/ui/Avatar.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Dialog } from '@/components/ui/Dialog.tsx'
import { InfoTip } from '@/components/ui/InfoTip.tsx'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { GoodsPicker, NO_GOODS, useSettled } from '@/features/trade/GoodsPicker.tsx'
import { useAct, useLimits, usePlayers } from '@/lib/actions.ts'
import { formatAgo, formatMoney } from '@/lib/format.ts'
import { useNow } from '@/lib/pure.ts'
import { errorText, rpc } from '@/lib/rpc.ts'
import type { Goods, Players } from '@/lib/schemas.ts'
import { sfx } from '@/lib/sfx.ts'
import { useMe, useWorld } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'
import { GroupOrders } from './GroupOrders.tsx'
import { HonorBadge, LoanDialog, LoansPanel, useLoans } from './Loans.tsx'

const T = texts.players

export function PlayersPage() {
  const q = usePlayers()
  const me = useMe().data?.player
  const level = me?.level ?? 0
  const now = useNow()
  const offset = useWorld((w) => w.clockOffsetMs)
  const [giftTo, setGiftTo] = useState<Players['players'][number] | null>(null)
  const [loanTo, setLoanTo] = useState<Players['players'][number] | null>(null)
  const loanLevel = useLoans().data?.unlock_level
  const d = q.data
  const canTrade = !!d && level >= d.trades.unlock_level
  const canHelp = !!d && level >= d.friends.unlock_level
  return (
    <Page icon="people" title={T.title} subtitle={T.subtitle} tip={T.tip}>
      {q.isPending ? (
        <Skeleton className="h-80 w-full" />
      ) : q.isError || !d ? (
        <ErrorState message={errorText(q.error)} onRetry={() => void q.refetch()} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-12">
          <Panel
            className="lg:col-span-8"
            tip={
              canHelp ? (
                <>
                  <strong className="text-fg">{T.help}:</strong> {T.helpTip(d.friends.help_minutes)}{' '}
                  <strong className="text-fg">{T.kaffee}:</strong>{' '}
                  {T.kaffeeTip(d.friends.kaffee_pct, d.friends.kaffee_minutes)}
                </>
              ) : (
                T.friendsLocked(d.friends.unlock_level)
              )
            }
          >
            {d.players.length < 2 && <EmptyState icon="people" title={T.empty} />}
            <ul className="flex flex-col gap-1.5">
              {d.players.map((p) => {
                const lockedMin = Math.ceil((Date.parse(p.locked_until) - (now + offset)) / 60_000)
                return (
                  <li
                    key={p.id}
                    className={clsx(
                      'flex flex-wrap items-center gap-3 rounded-xl px-3 py-2.5',
                      p.me ? 'bg-surface-3' : 'bg-surface-2',
                    )}
                  >
                    <span className="relative shrink-0">
                      <Avatar name={p.name} look={p.look} size={40} />
                      <i
                        className={clsx(
                          'absolute -right-0.5 -bottom-0.5 size-3.5 rounded-full ring-2 ring-surface-1',
                          p.online ? 'bg-gain' : 'bg-fg-3',
                        )}
                        aria-hidden
                      />
                    </span>
                    <span className="min-w-40 flex-1">
                      <span className="flex items-center gap-2">
                        <Link
                          to={p.me ? '/profile' : `/players/${p.id}`}
                          className="truncate font-bold hover:underline"
                        >
                          <PlayerName name={p.name} look={p.look} />
                        </Link>
                        {p.me && (
                          <span className="rounded-md bg-grad px-1.5 py-0.5 text-[0.65rem] font-bold text-white">
                            {T.you}
                          </span>
                        )}
                        {p.is_admin && (
                          <span className="rounded-md bg-surface-3 px-1.5 py-0.5 text-[0.65rem] font-bold text-fg-3">
                            {T.admin}
                          </span>
                        )}
                        {p.honor.title && <HonorBadge honor={p.honor} />}
                      </span>
                      <span className="block text-xs text-fg-3">
                        Lv {p.level}
                        {p.title && <span className="text-accent"> · {p.title}</span>} ·{' '}
                        <span className={p.online ? 'text-gain' : undefined}>
                          {p.online ? T.online : T.seen(formatAgo(p.last_seen_at, now + offset))}
                        </span>
                      </span>
                    </span>
                    {!p.me && canHelp && <FriendButtons target={p} done={d.friends.done[p.id] ?? []} />}
                    {!p.me && canTrade && lockedMin > 0 && (
                      <span className="text-xs text-fg-3">{T.fresh(lockedMin)}</span>
                    )}
                    {!p.me && canTrade && lockedMin <= 0 && (
                      <span className="flex gap-2">
                        <Button size="sm" onClick={() => setGiftTo(p)}>
                          {T.gift}
                        </Button>
                        {loanLevel !== undefined && level >= loanLevel && p.level >= loanLevel && (
                          <Button size="sm" onClick={() => setLoanTo(p)}>
                            {texts.loans.give}
                          </Button>
                        )}
                        <Link
                          to={`/trade?with=${p.id}`}
                          className="btn btn-neutral inline-flex min-h-8 items-center px-3 text-sm font-semibold"
                        >
                          {T.trade}
                        </Link>
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          </Panel>
          <div className="flex flex-col gap-4 self-start lg:col-span-4">
            <Panel title={T.allowance} tip={T.allowanceTip}>
              {canTrade ? (
                <p className="nums text-3xl font-bold tracking-tight">
                  {formatMoney(d.trades.allowance_left_cents)}
                  <span className="block text-sm font-normal text-fg-3">
                    / {formatMoney(d.trades.allowance_cents)}
                  </span>
                </p>
              ) : (
                <p className="text-sm text-fg-3">{T.lockedLevel(d.trades.unlock_level)}</p>
              )}
            </Panel>
            {me && <LoansPanel player={me} />}
            {me && <GroupOrders player={me} />}
          </div>
        </div>
      )}
      {giftTo && <GiftDialog to={giftTo} onClose={() => setGiftTo(null)} />}
      {loanTo && <LoanDialog to={loanTo} onClose={() => setLoanTo(null)} />}
    </Page>
  )
}

/** Aushelfen and Kaffee und Kuchen: once a day per friend each. */
function FriendButtons({ target, done }: { target: Players['players'][number]; done: string[] }) {
  const act = useAct()
  // nobody gets more than a few helps a day (decision 111)
  const full = useLimits(target.id).data?.target?.helps_left === 0
  const [busy, setBusy] = useState<string | null>(null)
  const run = async (kind: 'aushelfen' | 'kaffee') => {
    setBusy(kind)
    const res = await act('friend_act', { p_target: target.id, p_kind: kind }, ['players', 'grading', 'jobs'])
    setBusy(null)
    if (!res) return
    sfx('success')
    toast('success', kind === 'aushelfen' ? T.helped(target.name, res.minutes) : T.kaffeeDone(target.name))
  }
  return (
    <span className="flex flex-wrap gap-2">
      {(['aushelfen', 'kaffee'] as const).map((kind) => (
        <Button
          key={kind}
          size="sm"
          loading={busy === kind}
          disabled={busy !== null || done.includes(kind) || (kind === 'aushelfen' && full)}
          title={done.includes(kind) ? T.doneToday : kind === 'aushelfen' && full ? T.helpFull : undefined}
          onClick={() => void run(kind)}
        >
          <PixelIcon name={kind === 'aushelfen' ? 'clock' : 'heart'} />
          {kind === 'aushelfen' ? T.help : T.kaffee}
          {done.includes(kind) && <PixelIcon name="check" />}
        </Button>
      ))}
    </span>
  )
}

function GiftDialog({ to, onClose }: { to: Players['players'][number]; onClose: () => void }) {
  const act = useAct()
  const me = useMe().data?.player
  const [goods, setGoods] = useState<Goods>(NO_GOODS)
  const [busy, setBusy] = useState(false)
  const inv = useQuery({
    queryKey: ['trade-inventory', me?.id],
    queryFn: () => rpc('trade_inventory', { p_player: me!.id }),
    enabled: !!me,
  })
  const settled = useSettled(goods)
  const quote = useQuery({
    queryKey: ['trade-quote', to.id, settled],
    queryFn: () => rpc('trade_quote', { p_to: to.id, p_give: settled, p_take: NO_GOODS }),
    placeholderData: keepPreviousData,
  })
  const empty = goods.money_cents === 0 && goods.items.length === 0
  // what the friend may still receive today (decision 111)
  const tooMuch = !!quote.data && quote.data.give_cents > quote.data.their_receive_left_cents
  const send = async () => {
    setBusy(true)
    const res = await act('gift_send', { p_to: to.id, p_goods: goods }, ['players', 'trade-inventory'])
    setBusy(false)
    if (res) {
      toast('success', T.giftDone(to.name, formatMoney(res.value_cents)))
      onClose()
    }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={T.giftTitle(to.name)} description={T.giftDesc}>
      {inv.data ? (
        <GoodsPicker items={inv.data.items} value={goods} onChange={setGoods} />
      ) : (
        <Skeleton className="h-60 w-full" />
      )}
      <dl className="mt-4 grid grid-cols-2 gap-y-1 rounded-xl bg-surface-2 p-3 text-sm">
        <dt className="text-fg-2">{texts.trade.value}</dt>
        <dd className="nums text-right font-semibold">{formatMoney(quote.data?.give_cents ?? 0)}</dd>
        <dt className="text-fg-2">{T.allowance}</dt>
        <dd className="nums text-right">{formatMoney(quote.data?.allowance_left_cents ?? 0)}</dd>
        <dt className="text-fg-2">{texts.trade.yourTax}</dt>
        <dd
          className={clsx(
            'nums text-right font-semibold',
            (quote.data?.my_tax_cents ?? 0) > 0 && 'text-warn',
          )}
        >
          {formatMoney(quote.data?.my_tax_cents ?? 0)}
        </dd>
      </dl>
      {quote.data && (
        <p className={clsx('mt-2 flex items-center gap-1 text-xs', tooMuch ? 'text-warn' : 'text-fg-3')}>
          {tooMuch ? T.receiveBlocked(to.name) : T.receiveLeft(to.name, formatMoney(quote.data.their_receive_left_cents))}
          <InfoTip>{T.receiveTip}</InfoTip>
        </p>
      )}
      <Button
        variant="primary"
        className="mt-4 w-full"
        loading={busy}
        disabled={empty || tooMuch}
        onClick={() => void send()}
      >
        {T.gift}
      </Button>
    </Dialog>
  )
}

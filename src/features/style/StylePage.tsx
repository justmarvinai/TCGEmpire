import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/cards/Card.tsx'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { Avatar, PlayerName } from '@/components/ui/Avatar.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { useAct, useCosmetics } from '@/lib/actions.ts'
import { cardById, COSMETIC_KINDS, COSMETICS, type CosmeticDef } from '@/lib/catalog.ts'
import { formatMoney } from '@/lib/format.ts'
import { errorText } from '@/lib/rpc.ts'
import type { Cosmetics, Look, Player } from '@/lib/schemas.ts'
import { sfx } from '@/lib/sfx.ts'
import { useMe } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'

const T = texts.style

export function StylePage() {
  const q = useCosmetics()
  const player = useMe().data?.player
  const d = q.data
  return (
    <Page icon="sparkle" title={T.title} subtitle={T.subtitle} tip={T.tip}>
      {q.isPending || !player ? (
        <Skeleton className="h-96 w-full" />
      ) : q.isError || !d ? (
        <ErrorState message={errorText(q.error)} onRetry={() => void q.refetch()} />
      ) : player.level < d.unlock_level ? (
        <Panel>
          <EmptyState icon="lock" title={T.locked(d.unlock_level)} />
        </Panel>
      ) : (
        <Shop d={d} player={player} />
      )}
    </Page>
  )
}

function Shop({ d, player }: { d: Cosmetics; player: Player }) {
  const act = useAct()
  const client = useQueryClient()
  const [busy, setBusy] = useState<string | null>(null)
  const owned = new Set(d.owned)
  const look: Look = { name_color: d.style.name_color ?? null, frame: d.style.frame ?? null, avatar_card: d.avatar_card }
  const put = (doc: Cosmetics) => {
    client.setQueryData(['cosmetics'], doc)
    void client.invalidateQueries({ queryKey: ['profile'] })
  }

  const buy = async (c: CosmeticDef) => {
    setBusy(c.key)
    const res = await act('cosmetic_buy', { p_key: c.key }, ['stats'])
    setBusy(null)
    if (res) {
      put(res)
      sfx('coin')
      toast('success', T.bought(c.name))
    }
  }
  const equip = async (c: CosmeticDef, on: boolean) => {
    setBusy(c.key)
    const res = await act('cosmetic_equip', { p_kind: c.kind, p_key: on ? c.key : null })
    setBusy(null)
    if (res) {
      put(res)
      sfx('toggle')
    }
  }

  return (
    <div className="grid items-start gap-4 xl:grid-cols-2">
      <AvatarPanel d={d} look={look} name={player.username} put={put} />
      {COSMETIC_KINDS.map((kind) => (
        <Panel key={kind} title={T.kinds[kind]} tip={T.kindTips[kind]}>
          <ul className="flex flex-col gap-2">
            {COSMETICS.filter((c) => c.kind === kind).map((c) => {
              const has = owned.has(c.key)
              const worn = kind !== 'title' && d.style[kind] === c.key
              const price = d.items.find((i) => i.key === c.key)?.price_cents ?? 0
              return (
                <li key={c.key} className={clsx('flex flex-wrap items-center gap-3 rounded-xl p-3', worn ? 'bg-surface-3 outline-2 -outline-offset-2 outline-accent' : 'bg-surface-2')}>
                  <Preview c={c} name={player.username} look={look} />
                  <span className="min-w-0 flex-1">
                    <b className="block">{c.name}</b>
                    <span className="text-xs text-fg-3">{c.text}</span>
                  </span>
                  {!has ? (
                    player.level < c.minLevel ? (
                      <span className="text-xs text-fg-3">{T.fromLevel(c.minLevel)}</span>
                    ) : (
                      <Button size="sm" loading={busy === c.key} disabled={busy !== null || player.cash_cents < price} onClick={() => void buy(c)}>
                        {T.buy(formatMoney(price))}
                      </Button>
                    )
                  ) : kind === 'title' ? (
                    <span className="text-xs text-fg-3">{T.titleHint}</span>
                  ) : (
                    <Button size="sm" variant={worn ? 'neutral' : 'primary'} loading={busy === c.key} disabled={busy !== null} onClick={() => void equip(c, !worn)}>
                      {worn ? T.takeOff : T.equip}
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        </Panel>
      ))}
    </div>
  )
}

/** What a look does, shown small next to it. */
function Preview({ c, name, look }: { c: CosmeticDef; name: string; look: Look }) {
  if (c.kind === 'name_color') return <PlayerName name={name} look={{ ...look, name_color: c.key }} className="w-24 truncate font-bold" />
  if (c.kind === 'frame') return <Avatar name={name} look={{ ...look, frame: c.key }} size={36} className="m-1.5" />
  if (c.kind === 'sleeve') return <span className={clsx('block h-12 w-9', c.key)} aria-hidden><span className="block h-full w-full rounded-sm bg-surface-1" /></span>
  if (c.kind === 'binder') return <span className={clsx('block size-12 !p-0', c.key)} aria-hidden />
  if (c.kind === 'pack_fx')
    return (
      <span className="flex w-12 flex-wrap gap-0.5" aria-hidden>
        {Array.from({ length: 8 }, (_, i) => (
          <i key={i} className="size-2.5 rounded-full" style={{ background: `hsl(${c.hues![0] + ((c.hues![1] - c.hues![0]) * i) / 7} 90% 62%)` }} />
        ))}
      </span>
    )
  return <span className="w-24 truncate text-sm font-semibold text-accent">{c.title}</span>
}

/** The profile picture: any card the player owns. */
function AvatarPanel({ d, look, name, put }: { d: Cosmetics; look: Look; name: string; put: (doc: Cosmetics) => void }) {
  const act = useAct()
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const matches = useMemo(() => {
    const s = search.trim().toLowerCase()
    return d.cards
      .map((id) => cardById.get(id))
      .filter((c) => c && (!s || c.name.toLowerCase().includes(s)))
      .slice(0, 12)
  }, [d.cards, search])

  const set = async (card: string | null) => {
    setBusy(card ?? 'none')
    const res = await act('avatar_set', { p_card: card })
    setBusy(null)
    if (res) {
      put(res)
      sfx('toggle')
      toast('success', T.avatarSet)
    }
  }

  return (
    <Panel title={T.avatar} tip={T.avatarTip} className="xl:col-span-2">
      <div className="flex flex-wrap items-start gap-5">
        <div className="flex flex-col items-center gap-2">
          <Avatar name={name} look={look} size={96} className="m-2" />
          {d.avatar_card ? (
            <Button size="sm" loading={busy === 'none'} onClick={() => void set(null)}>
              {T.avatarClear}
            </Button>
          ) : (
            <span className="max-w-32 text-center text-xs text-fg-3">{T.avatarNone}</span>
          )}
        </div>
        <div className="min-w-60 flex-1">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={T.avatarSearch}
            aria-label={T.avatarSearch}
            className="panel-inset mb-3 h-10 w-full max-w-md bg-transparent px-3 text-sm placeholder:text-fg-3"
          />
          {matches.length === 0 ? (
            <p className="text-sm text-fg-3">{T.avatarNothing}</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {matches.map((c) => (
                <li key={c!.id}>
                  <button
                    type="button"
                    onClick={() => void set(c!.id)}
                    disabled={busy !== null}
                    className={clsx('flex flex-col items-center gap-1 rounded-xl p-1.5 text-xs hover:bg-surface-3', d.avatar_card === c!.id && 'bg-surface-3 outline-2 -outline-offset-2 outline-accent')}
                    aria-label={c!.name}
                  >
                    <Card id={c!.id} scale={1} foil="none" />
                    <span className="w-20 truncate">{c!.name}</span>
                    {d.avatar_card === c!.id && <PixelIcon name="check" className="text-gain" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Panel>
  )
}

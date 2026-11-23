import clsx from 'clsx'
import { PlayerName } from '@/components/ui/Avatar.tsx'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button.tsx'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { FeedList } from '@/features/feed/Feed.tsx'
import { useAct } from '@/lib/actions.ts'
import { cardById, itemName, productById } from '@/lib/catalog.ts'
import { formatAgo } from '@/lib/format.ts'
import { useNow } from '@/lib/pure.ts'
import { errorText, rpc } from '@/lib/rpc.ts'
import type { Chat } from '@/lib/schemas.ts'
import { useSettings } from '@/lib/settings.ts'
import { useMe, useWorld } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'

const T = texts.stammtisch
const EMOTES = ['🔥', '💀', '😂', '🤡', '💸', '📦', '👀', '🙏']
const ITEMS = [...cardById.values(), ...productById.values()].map((i) => ({ id: i.id, name: i.name }))

export function StammtischPage() {
  const q = useQuery({ queryKey: ['chat'], queryFn: () => rpc('chat_get'), refetchInterval: 5_000 })
  const priceLevel = useMe().data?.server.price_level ?? 1
  const last = q.data?.messages.at(-1)?.id ?? 0
  const chatSeen = useSettings((s) => s.chatSeen)
  const setSettings = useSettings((s) => s.set)
  const apply = useWorld((w) => w.apply)

  // Reading the chat marks it as read on this device.
  useEffect(() => {
    if (last > chatSeen) setSettings({ chatSeen: last })
    apply({ chatUnread: 0 })
  }, [last, chatSeen, setSettings, apply])

  return (
    <Page icon="chat" title={T.title} subtitle={T.subtitle} tip={T.tip}>
      <div className="grid gap-4 lg:grid-cols-12">
        <Panel tour="stammtisch-chat" title={T.chat} tip={T.chatTip} className="flex flex-col lg:col-span-8">
          {q.isPending ? (
            <Skeleton className="h-96 w-full" />
          ) : q.isError || !q.data ? (
            <ErrorState message={errorText(q.error)} onRetry={() => void q.refetch()} />
          ) : (
            <>
              <Messages messages={q.data.messages} />
              <Composer />
            </>
          )}
        </Panel>
        <div className="flex flex-col gap-4 lg:col-span-4">
          <Panel tour="stammtisch-online" title={T.online} tip={T.onlineTip}>
            {q.data ? (
              <ul className="flex flex-wrap gap-2">
                {q.data.online.map((o) => (
                  <li key={o.id} className="flex items-center gap-2 rounded-full bg-surface-2 py-1 pr-3 pl-2 text-sm">
                    <i className="size-2.5 rounded-full bg-gain" aria-hidden />
                    {o.name}
                    <span className="nums text-xs text-fg-3">Lv {o.level}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Skeleton className="h-10 w-full" />
            )}
          </Panel>
          <Panel title={T.feed} tip={texts.feed.subtitle}>
            <FeedList priceLevel={priceLevel} limit={8} />
          </Panel>
        </div>
      </div>
    </Page>
  )
}

function Messages({ messages }: { messages: Chat['messages'] }) {
  const box = useRef<HTMLOListElement>(null)
  const now = useNow()
  const offset = useWorld((w) => w.clockOffsetMs)
  const myName = useMe().data?.player?.username
  const last = messages.at(-1)?.id
  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight
  }, [last])
  if (messages.length === 0) return <p className="flex-1 py-12 text-center text-sm text-fg-3">{T.empty}</p>
  return (
    <ol ref={box} className="mb-4 flex max-h-[60vh] min-h-72 flex-col gap-2 overflow-y-auto pr-1" aria-live="polite">
      {messages.map((m) => {
        const mention = !!myName && !m.me && m.body.toLowerCase().includes(`@${myName.toLowerCase()}`)
        return (
          <li key={m.id} className={clsx('max-w-[85%] rounded-2xl px-3 py-2', m.me ? 'self-end bg-accent-lo/30' : mention ? 'bg-warn/15 ring-1 ring-warn' : 'bg-surface-2')}>
            <p className="flex items-baseline gap-2 text-xs">
              <b className={m.name ? 'text-fg' : 'text-fg-3'}>{m.name ? <PlayerName name={m.name} look={m.look} /> : T.deleted}</b>
              {m.level !== null && <span className="nums text-fg-3">Lv {m.level}</span>}
              {m.title && <span className="text-accent">{m.title}</span>}
              <span className="text-fg-3">{formatAgo(m.at, now + offset)}</span>
            </p>
            {m.body && <p className="mt-0.5 text-sm break-words whitespace-pre-wrap">{m.body}</p>}
            {m.item_id && (
              <Link to={`/cardmarket/${m.item_id}`} className="mt-1 inline-flex items-center gap-1 rounded-lg bg-surface-3 px-2 py-1 text-xs font-semibold text-accent hover:underline">
                {itemName(m.item_id)}
              </Link>
            )}
          </li>
        )
      })}
    </ol>
  )
}

function Composer() {
  const act = useAct()
  const client = useQueryClient()
  const [body, setBody] = useState('')
  const [attach, setAttach] = useState('')
  const [busy, setBusy] = useState(false)
  const item = useMemo(() => ITEMS.find((i) => i.name.toLowerCase() === attach.trim().toLowerCase()), [attach])
  const canSend = !busy && (body.trim().length > 0 || !!item) && body.length <= 280

  const send = async () => {
    if (!canSend) return
    setBusy(true)
    const res = await act('chat_send', { p_body: body, p_item: item?.id ?? null })
    setBusy(false)
    if (res) {
      client.setQueryData(['chat'], { messages: res.messages, online: res.online })
      setBody('')
      setAttach('')
    }
  }

  return (
    <form
      className="mt-auto flex flex-col gap-2 border-t border-line pt-4"
      onSubmit={(e) => {
        e.preventDefault()
        void send()
      }}
    >
      <div className="flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={280}
          placeholder={T.placeholder}
          aria-label={T.placeholder}
          className="panel-inset h-11 min-w-0 flex-1 bg-transparent px-3 text-fg placeholder:text-fg-3"
        />
        <Button type="submit" variant="primary" loading={busy} disabled={!canSend}>
          {T.send}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex gap-1" role="group" aria-label={T.emotes}>
          {EMOTES.map((e) => (
            <button key={e} type="button" onClick={() => setBody((b) => (b + e).slice(0, 280))} className="btn btn-neutral size-8 text-base" aria-label={e}>
              {e}
            </button>
          ))}
        </span>
        <input
          value={attach}
          onChange={(e) => setAttach(e.target.value)}
          list="chat-items"
          placeholder={T.attachPlaceholder}
          aria-label={T.attach}
          className={clsx('panel-inset h-8 min-w-48 flex-1 bg-transparent px-3 text-sm placeholder:text-fg-3', item && 'ring-1 ring-accent')}
        />
        <datalist id="chat-items">
          {ITEMS.map((i) => (
            <option key={i.id} value={i.name} />
          ))}
        </datalist>
        {item && <span className="text-xs text-accent">{T.attached(item.name)}</span>}
      </div>
    </form>
  )
}

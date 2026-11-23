import { useState } from 'react'
import { LEXIKON } from '../../../content/lexikon.ts'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { texts } from '@/texts/de.ts'

const T = texts.help

/** Rules of the game and the TCG-Lexikon. */
export function HelpPage() {
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const terms = LEXIKON.filter((e) => !needle || e.term.toLowerCase().includes(needle) || e.text.toLowerCase().includes(needle))
  return (
    <Page icon="info" title={T.title} subtitle={T.subtitle}>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Panel title={T.rules} tip={T.rulesTip}>
          <dl className="flex flex-col gap-3 text-sm">
            {T.ruleList.map((r) => (
              <div key={r.title}>
                <dt className="font-semibold">{r.title}</dt>
                <dd className="text-fg-2">{r.text}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        <Panel title={T.lexikon} tip={T.lexikonTip}>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={T.search}
            aria-label={T.search}
            className="panel-inset mb-3 h-9 w-full bg-transparent px-2 text-fg placeholder:text-fg-3"
          />
          {terms.length === 0 ? (
            <p className="text-sm text-fg-3">{T.none}</p>
          ) : (
            <dl className="flex flex-col gap-2 text-sm">
              {terms.map((e) => (
                <div key={e.term} className="rounded-lg bg-surface-2 px-3 py-2">
                  <dt className="font-semibold text-accent">{e.term}</dt>
                  <dd className="text-fg-2">{e.text}</dd>
                </div>
              ))}
            </dl>
          )}
        </Panel>
      </div>
    </Page>
  )
}

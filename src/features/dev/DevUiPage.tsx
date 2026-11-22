// Living showcase: every building block in one place. Also holds the local-mode dev tools.
import { useEffect, useState } from 'react'
import { ICONS } from '@/components/pixel/icon-data.ts'
import { PixelIcon, type IconName } from '@/components/pixel/PixelIcon.tsx'
import { useCardAtlas, useSpriteAtlas } from '@/components/pixel/atlas.ts'
import { PixelProduct } from '@/components/pixel/PixelSprite.tsx'
import { Card, TiltCard } from '@/components/cards/Card.tsx'
import { Slab } from '@/components/cards/Slab.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Dialog } from '@/components/ui/Dialog.tsx'
import { Field } from '@/components/ui/Field.tsx'
import { NumberTicker } from '@/components/ui/NumberTicker.tsx'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { Progress } from '@/components/ui/Progress.tsx'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { getBackend } from '@/lib/backend/index.ts'
import type { Backend } from '@/lib/backend/types.ts'
import { formatMoney } from '@/lib/format.ts'
import { sfx, SFX_NAMES } from '@/lib/sfx.ts'
import { useMe } from '@/lib/world.ts'

const COLORS = [
  'ink', 'surface-1', 'surface-2', 'surface-3', 'line', 'fg', 'fg-2', 'fg-3', 'accent', 'gold', 'gain', 'loss', 'warn', 'info',
  'tier-common', 'tier-uncommon', 'tier-rare', 'tier-holo', 'tier-alternative', 'tier-ultra', 'tier-grail',
]

export default function DevUiPage() {
  const [dialog, setDialog] = useState(false)
  const [amount, setAmount] = useState(123456)
  const [backend, setBackend] = useState<Backend>()
  useEffect(() => void getBackend().then(setBackend), [])

  return (
    <Page icon="gear" title="Baukasten" subtitle="Alle Bausteine der Oberfläche an einem Ort." tip="Nur für die Entwicklung.">
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Farben">
          <div className="grid grid-cols-7 gap-2">
            {COLORS.map((c) => (
              <div key={c} className="text-center text-[0.625rem] text-fg-3">
                <div className="mb-1 h-8 outline-2 outline-line" style={{ background: `var(--color-${c})` }} />
                {c}
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Schrift">
          <p className="font-pixel text-4xl leading-tight">Glurak! 1.234.567 €</p>
          <p className="font-pixel text-xl">Pixelify Sans für Titel und große Momente</p>
          <p className="mt-2">Rubik für alles, was man liest: Zahlen 0123456789, Umlaute ÄÖÜäöüß.</p>
          <p className="text-sm text-fg-2">Sekundärtext in fg-2, Hinweise in fg-3.</p>
        </Panel>

        <Panel title="Buttons" tip="Jeder Button hat Hover, Gedrückt, Fokus, Deaktiviert und Laden.">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" size="lg">Booster kaufen</Button>
            <Button variant="primary">Primär</Button>
            <Button>Neutral</Button>
            <Button variant="danger">Löschen</Button>
            <Button size="sm">Klein</Button>
            <Button disabled>Deaktiviert</Button>
            <Button variant="primary" loading>Lädt</Button>
          </div>
        </Panel>

        <Panel title="Rückmeldung">
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => toast('success', 'Verkauft. Geld ist da.')}>Toast Erfolg</Button>
            <Button onClick={() => toast('error', 'Dafür reicht dein Geld nicht. Wie immer.')}>Toast Fehler</Button>
            <Button onClick={() => toast('info', 'Restock bei Müller in 5 Minuten.')}>Toast Info</Button>
            <Button onClick={() => setDialog(true)}>Dialog</Button>
          </div>
          <Dialog open={dialog} onOpenChange={setDialog} title="Wirklich?" description="Das lässt sich nicht rückgängig machen. Wie die meisten deiner Entscheidungen.">
            <div className="flex justify-end gap-2">
              <Button onClick={() => setDialog(false)}>Lieber nicht</Button>
              <Button variant="danger" onClick={() => setDialog(false)}>Mach</Button>
            </div>
          </Dialog>
        </Panel>

        <Panel title="Zahlen und Fortschritt">
          <NumberTicker value={amount} format={formatMoney} className="nums font-pixel text-3xl text-gold" />
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={() => { setAmount((a) => a * 7 + 9900); sfx('coin') }}>mehr</Button>
            <Button size="sm" onClick={() => setAmount((a) => Math.round(a / 5))}>weniger</Button>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <Progress value={0.35} />
            <Progress value={0.7} tone="gold" />
            <Progress value={0.9} tone="gain" />
          </div>
        </Panel>

        <Panel title="Eingabe">
          <Field label="Benutzername" placeholder="Karten-Kalle" hint="3–16 Zeichen." />
        </Panel>

        <Panel title="Zustände">
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-16 w-full" />
            </div>
            <EmptyState icon="binder" title="Nichts da">Zieh erst mal was.</EmptyState>
            <ErrorState message="Der Server hat sich verschluckt." />
          </div>
        </Panel>

        <Panel title="Sound" tip="Alle Töne werden im Code erzeugt, es gibt keine Audiodateien.">
          <div className="flex flex-wrap gap-2">
            {SFX_NAMES.map((n) => (
              <Button key={n} size="sm" onClick={() => setTimeout(() => sfx(n), 60)}>{n}</Button>
            ))}
          </div>
        </Panel>

        <Panel title="Icons" className="lg:col-span-2">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-3">
            {(Object.keys(ICONS) as IconName[]).map((name) => (
              <div key={name} className="flex flex-col items-center gap-1 text-[0.625rem] text-fg-3">
                <div className="flex items-end gap-2 text-fg">
                  <PixelIcon name={name} />
                  <PixelIcon name={name} scale={2} />
                </div>
                {name}
              </div>
            ))}
          </div>
        </Panel>

        <ArtGallery />

        <Panel title="Slabs" className="lg:col-span-2" tip="Ein Rahmen pro Grading-Firma. Karte und Beschriftung kommen zur Laufzeit dazu.">
          <div className="flex flex-wrap gap-6">
            <Slab grader="psa" cardId="pkm-base-090" title="Glurak" subtitle="Basis-Set · 090" grade="10" gradeWord="GEM MT" cert="40117352" />
            <Slab grader="bgs" cardId="pkm-base-088" title="Turtok" subtitle="Basis-Set · 088" grade="9.5" gradeWord="GEM MINT" cert="00902841" scale={2} />
            <Slab grader="cgc" cardId="pkm-base-028" title="Pikachu" subtitle="Basis-Set · 028" grade="9" gradeWord="MINT" cert="38650127" scale={2} />
            <Slab grader="company" cardId="pkm-base-084" title="Pikachu" subtitle="Basis-Set · 084" grade="8" gradeWord="NM-MT" cert="00000001" brand="KALLE" scale={2} />
          </div>
        </Panel>

        {backend?.devSql && <DevTools sql={backend.devSql} />}
      </div>
    </Page>
  )
}

/** Local mode only: poke the in-browser server directly. */
function DevTools({ sql }: { sql: NonNullable<Backend['devSql']> }) {
  const me = useMe()
  const id = me.data?.player?.id
  const run = async (query: string, params: unknown[] = []) => {
    await sql(query, params)
    await me.refetch()
  }
  return (
    <Panel title="Lokale Dev-Tools" className="lg:col-span-2" tip="Nur im lokalen Modus: greift direkt in die Datenbank im Browser.">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => run(`select private.money_add($1, 100000, 'dev')`, [id])}>+1.000 €</Button>
        <Button size="sm" onClick={() => run(`select private.ep_grant($1, 50)`, [id])}>+EP</Button>
        <Button size="sm" onClick={() => run(`select private.ep_grant($1, 5000)`, [id])}>+viel EP</Button>
        <Button size="sm" onClick={() => run(`update game.server set clock_offset = clock_offset + interval '1 day' where id; select private.tick()`)}>+1 Tag</Button>
      </div>
    </Panel>
  )
}

/** Everything the art build produced, at binder (x2) and opening (x4) size. */
function ArtGallery() {
  const cards = useCardAtlas('pokemon-base')
  const products = useSpriteAtlas('products')
  const cardIds = [...(cards.data?.ids ?? [])].sort()
  const productIds = [...(products.data?.ids ?? [])].sort()
  return (
    <Panel title="Karten und Produkte" className="lg:col-span-2" tip="Alle Grafiken werden per Code erzeugt (pnpm art:build).">
      {cardIds.length === 0 && productIds.length === 0 ? (
        <EmptyState icon="card" title="Noch nichts gebaut">Erst pnpm art:build ausführen.</EmptyState>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap gap-3">
            {cardIds.map((id) => (
              <Card key={id} id={id} scale={1} foil="sweep" />
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-4">
            {cardIds.filter((id) => ['pkm-base-088', 'pkm-base-090'].includes(id)).map((id) => (
              <TiltCard key={id}>
                <Card id={id} scale={3} foil="sweep" />
              </TiltCard>
            ))}
            {productIds.map((id) => (
              <PixelProduct key={id} id={id} scale={3} />
            ))}
          </div>
        </div>
      )}
    </Panel>
  )
}

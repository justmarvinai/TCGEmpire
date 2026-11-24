// Living showcase: every building block in one place. Also holds the local-mode dev tools.
import { useEffect, useState } from 'react'
import { ICONS } from '@/components/pixel/icon-data.ts'
import { PixelIcon, type IconName } from '@/components/pixel/PixelIcon.tsx'
import { useCardAtlas, useSpriteAtlas } from '@/components/pixel/atlas.ts'
import { PixelProduct } from '@/components/pixel/PixelSprite.tsx'
import { Card, TiltCard } from '@/components/cards/Card.tsx'
import { SlabOf } from '@/components/cards/Slab.tsx'
import { GradeReveal } from '@/features/grading/GradeReveal.tsx'
import { PackArt } from '@/features/open/PackInfo.tsx'
import type { GradeResult, SlabLabel } from '@/lib/schemas.ts'
import { Button } from '@/components/ui/Button.tsx'
import { Dialog } from '@/components/ui/Dialog.tsx'
import { Field } from '@/components/ui/Field.tsx'
import { NumberTicker } from '@/components/ui/NumberTicker.tsx'
import { Page } from '@/components/ui/Page.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { Progress } from '@/components/ui/Progress.tsx'
import { Ring } from '@/components/ui/Ring.tsx'
import { Chart } from '@/components/ui/Chart.tsx'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { getBackend } from '@/lib/backend/index.ts'
import type { Backend } from '@/lib/backend/types.ts'
import { formatMoney } from '@/lib/format.ts'
import { sfx, SFX_NAMES } from '@/lib/sfx.ts'
import { useMe } from '@/lib/world.ts'
import { useSettings } from '@/lib/settings.ts'
import { FEATURES } from '@/app/nav.ts'

const COLORS = [
  'ink', 'surface-1', 'surface-2', 'surface-3', 'line', 'fg', 'fg-2', 'fg-3', 'accent', 'gold', 'gain', 'loss', 'warn', 'info',
  'tier-common', 'tier-uncommon', 'tier-rare', 'tier-holo', 'tier-alternative', 'tier-ultra', 'tier-grail',
]

export default function DevUiPage() {
  const [reveal, setReveal] = useState<GradeResult[] | null>(null)
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
          <p className="font-pixel text-xl">Pixelify Sans für große Spielmomente</p>
          <p className="mt-2">Space Grotesk für alles, was man liest: Zahlen 0123456789, Umlaute ÄÖÜäöüß.</p>
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
          <NumberTicker value={amount} format={formatMoney} className="nums text-3xl font-bold tracking-tight text-gold" />
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={() => { setAmount((a) => a * 7 + 9900); sfx('coin') }}>mehr</Button>
            <Button size="sm" onClick={() => setAmount((a) => Math.round(a / 5))}>weniger</Button>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <Progress value={0.35} />
            <Progress value={0.7} tone="gold" />
            <Progress value={0.9} tone="gain" />
            <Chart points={[[0, 100], [1, 140], [2, 120], [3, 180], [4, 170], [5, 230]]} tone="gain" height={72} label="Beispielkurs" />
            <div className="flex gap-4">
              <Ring value={0.65}>65 %</Ring>
              <Ring value={0.3} tone="accent" size={64} stroke={8}>
                30 %
              </Ring>
            </div>
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

        <Panel title="Slabs" className="lg:col-span-2" tip="Ein Rahmen pro Etikett-Stil (PSA, BGS Gold/Silber/Black Label, CGC, Spielerfirma). Karte und Beschriftung kommen zur Laufzeit dazu.">
          <div className="flex flex-wrap items-end gap-6">
            <SlabOf cardId="pkm-base-090" slab={{ grader: 'psa', grade: 10, subgrades: null, black_label: false, cert_no: '40117352', pop: 1, pop_higher: 0 }} scale={3} />
            <SlabOf cardId="pkm-base-088" slab={{ grader: 'bgs', grade: 9.5, subgrades: [10, 9.5, 9.5, 10], black_label: false, cert_no: '0000902841', pop: 2, pop_higher: 0 }} />
            <SlabOf cardId="pkm-base-087" slab={{ grader: 'bgs', grade: 8.5, subgrades: [9, 8.5, 9, 8], black_label: false, cert_no: '0001772030', pop: 1, pop_higher: 3 }} />
            <SlabOf cardId="pkm-base-089" slab={{ grader: 'bgs', grade: 10, subgrades: [10, 10, 10, 10], black_label: true, cert_no: '0000007919', pop: 1, pop_higher: 0 }} />
            <SlabOf cardId="pkm-base-028" slab={{ grader: 'cgc', grade: 9, subgrades: null, black_label: false, cert_no: '3038650127', pop: 4, pop_higher: 1 }} />
            <SlabOf
              cardId="pkm-base-084"
              slab={{ grader: 'co:1', grade: 8, subgrades: null, black_label: false, cert_no: '1-0007919', pop: 1, pop_higher: 0, company: { id: 1, name: 'Slabwerk', label: { bg: 'gruen', fg: 'weiss', emblem: '183c7effff7e3c18' } } }}
            />
            <SlabOf
              cardId="pkm-base-058"
              slab={{ grader: 'co:2', grade: 10, subgrades: null, black_label: false, cert_no: '2-0015838', pop: 1, pop_higher: 0, company: { id: 2, name: 'Glurak & Söhne', label: { bg: 'gold', fg: 'schwarz', emblem: 'a55a3cdbdb3c5aa5' } } }}
            />
          </div>
        </Panel>

        <Panel title="Pack-Info und Grade-Reveal" className="lg:col-span-2" tip="Klick auf einen Booster zeigt Inhalt und Chancen. Die Knöpfe spielen das Aufdecken nach dem Grading mit Beispiel-Slabs ab.">
          <div className="flex flex-wrap items-center gap-4">
            <PackArt id="booster-pkm-base" scale={1} />
            <PackArt id="booster-emp1" scale={1} />
            {DEMO_REVEALS.map(([label, result]) => (
              <Button key={label} onClick={() => setReveal([result])}>
                {label}
              </Button>
            ))}
          </div>
          {reveal && <GradeReveal results={reveal} onClose={() => setReveal(null)} />}
        </Panel>

        {backend?.devSql && <DevTools sql={backend.devSql} />}
      </div>
    </Page>
  )
}

const demo = (card: string, slab: SlabLabel, raw: number, value: number): GradeResult => ({
  order_id: 0,
  copy_id: card,
  card_id: card,
  slab,
  fee_cents: 700_00,
  raw_cents: raw,
  value_cents: value,
})
/** Sample results for the grade reveal: a gem, a BGS with sub-grades and a flop. */
const DEMO_REVEALS: [string, GradeResult][] = [
  ['Reveal PSA 10', demo('pkm-base-090', { grader: 'psa', grade: 10, subgrades: null, black_label: false, cert_no: '40117352', pop: 1, pop_higher: 0 }, 47_167_00, 377_336_00)],
  ['Reveal BGS 9,5', demo('emp1-019', { grader: 'bgs', grade: 9.5, subgrades: [10, 9.5, 9.5, 10], black_label: false, cert_no: '0000902841', pop: 1, pop_higher: 0 }, 428_000_000, 1_712_000_000)],
  ['Reveal CGC 6', demo('pkm-base-028', { grader: 'cgc', grade: 6, subgrades: null, black_label: false, cert_no: '3038650127', pop: 3, pop_higher: 9 }, 12_00, 6_00)],
]

/** Local mode only: poke the in-browser server directly. */
function DevTools({ sql }: { sql: NonNullable<Backend['devSql']> }) {
  const me = useMe()
  const id = me.data?.player?.id
  const seeTour = useSettings((s) => s.seeTour)
  const run = async (query: string, params: unknown[] = []) => {
    await sql(query, params)
    await me.refetch()
  }
  return (
    <Panel title="Lokale Dev-Tools" className="lg:col-span-2" tip="Nur im lokalen Modus: greift direkt in die Datenbank im Browser.">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => run(`select private.money_add($1, 100000, 'dev')`, [id])}>+1.000 €</Button>
        <Button size="sm" onClick={() => run(`select private.money_add($1, 10000000, 'dev')`, [id])}>+100.000 €</Button>
        <Button size="sm" onClick={() => run(`select private.ep_grant($1, 50)`, [id])}>+EP</Button>
        <Button size="sm" onClick={() => run(`select private.ep_grant($1, 5000)`, [id])}>+viel EP</Button>
        <Button size="sm" onClick={() => run(`update game.players set level = 100, skill_points = skill_points + 99 where id = $1`, [id])}>Level 100</Button>
        <Button size="sm" onClick={() => run(`update game.server set clock_offset = clock_offset + interval '1 day' where id; select private.tick()`)}>+1 Tag</Button>
        <Button size="sm" onClick={() => run(`update game.server set clock_offset = clock_offset + interval '1 hour' where id; select private.tick()`)}>+1 Stunde</Button>
        <Button size="sm" onClick={() => run(`update game.players set tutorial_step = -1 where id = $1`, [id])}>Tutorial aus</Button>
        <Button size="sm" onClick={() => FEATURES.forEach((f) => seeTour(`${id}:${f.key}`))}>
          Touren aus
        </Button>
        <Button
          size="sm"
          onClick={() =>
            run(`with p as (
                   insert into game.players (username, level, cash_cents, energy_at, created_at, last_seen_at)
                   select 'Kumpel' || count(*), 40, 0, private.now(), private.now() - interval '2 hours', private.now() from game.players
                   returning id)
                 insert into game.bunker (player_id, accrual_at) select id, private.now() - interval '3 hours' from p`)
          }
        >
          +Kumpel
        </Button>
        <Button size="sm" onClick={() => run(`select private.sealed_add($1, (select id from game.product_defs where kind = 'display' order by id limit 1), 1)`, [id])}>
          +Display
        </Button>
        <Button
          size="sm"
          onClick={() =>
            run(
              `insert into game.card_copies (owner_id, card_id, q_centering, q_corners, q_edges, q_surface, pulled_at)
               select $1, c.id, private.roll_quality(), private.roll_quality(), private.roll_quality(), private.roll_quality(), private.now()
               from game.card_defs c join game.set_defs s on s.id = c.set_id
               where c.tier in ('holo', 'alternative', 'ultra', 'grail') and not s.house order by random() limit 5`,
              [id],
            )
          }
        >
          +5 Hits
        </Button>
        <Button
          size="sm"
          onClick={() =>
            run(
              `select private.stack_add($1, c.id, 3)
               from (select id from game.card_defs where tier = 'common' and id like 'pkm-%' order by id limit 3) c`,
              [id],
            )
          }
        >
          +Duplikate
        </Button>
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

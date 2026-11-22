// Events (docs/GAME_DESIGN.md §19): a Tagesereignis at 00:00 for everyone, small random events (personal and on the
// market), and two or three announced Highlight-Events a week. Effects are data:
//   stat      a modifier for the event's duration (global for everyone, or personal)
//   hype      the market hype of one random game (or all) × factor; it fades back on its own over days
//   pressure  price pressure on one random hit card or on every card of one random set × factor (fades in hours)
//   restock   every store restocks now, or one random store
//   money     one-off, in minutes of the player's reference income (negative: a cost)
//   cards     one-off, random cards of the player's favourite game
//   pfandbons, energy   one-off
// `slots` says when an event can happen; `hours` is how long a stat event runs (one-offs: 0).
export type EventSlot = 'daily' | 'random' | 'highlight' | 'personal'

export interface EventEffect {
  stat?: { stat: string; op: 'flat' | 'pct'; value: number }
  hype?: { game: 'random' | 'all'; factor: number }
  pressure?: { pick: 'hit' | 'set'; factor: number }
  restock?: 'all' | 'random'
  money?: number
  cards?: number
  pfandbons?: number
  energy?: number
  /** personal events that need a home of one's own */
  needsHome?: boolean
}

export interface EventDef {
  key: string
  name: string
  text: string
  slots: readonly EventSlot[]
  weight: number
  hours: number
  tone: 'good' | 'bad'
  effect: EventEffect
}

export const EVENTS: readonly EventDef[] = [
  // Tagesereignisse and Highlights for everyone
  { key: 'doppel_ep', name: 'Doppel-EP-Abend', text: 'Drei Stunden doppelte EP auf alles. Der Wecker für morgen ist egal.', slots: ['highlight'], weight: 3, hours: 3, tone: 'good', effect: { stat: { stat: 'ep', op: 'pct', value: 100 } } },
  { key: 'god_pack_nacht', name: 'God-Pack-Nacht', text: 'Die Druckerei hat geschlampt: God Packs sind drei Stunden lang dreimal so häufig.', slots: ['highlight'], weight: 3, hours: 3, tone: 'good', effect: { stat: { stat: 'god_pack_mult', op: 'flat', value: 2 } } },
  { key: 'mega_restock', name: 'Mega-Restock', text: 'Alle Läden bekommen gleichzeitig Ware. Scalper-Sven hat Urlaub genommen. Angeblich.', slots: ['highlight'], weight: 3, hours: 1, tone: 'good', effect: { restock: 'all' } },
  { key: 'blase', name: 'Die Blase platzt', text: 'Panik am Markt! Ein ganzes Spiel stürzt ab. Wer jetzt verkauft, verliert. Wer kauft, gewinnt. Vielleicht.', slots: ['highlight'], weight: 1, hours: 24, tone: 'bad', effect: { hype: { game: 'random', factor: 0.65 } } },
  { key: 'hype_welle', name: 'Hype-Welle', text: 'Ein Spiel ist plötzlich überall: auf TikTok, im Fernsehen, bei Oma. Die Preise ziehen an.', slots: ['highlight', 'random'], weight: 2, hours: 24, tone: 'good', effect: { hype: { game: 'random', factor: 1.3 } } },
  { key: 'gluecksrausch', name: 'Glücksrausch', text: 'Heute liegt was in der Luft. Mehr Hits in jedem Booster. Und Pollen.', slots: ['daily'], weight: 3, hours: 24, tone: 'good', effect: { stat: { stat: 'pack_luck', op: 'flat', value: 10 } } },
  { key: 'ankauf_aktion', name: 'Ankauf-Aktion', text: 'Der Kartenladen zahlt heute 10 Prozentpunkte mehr. Der Chef hat Geburtstag.', slots: ['daily'], weight: 3, hours: 24, tone: 'good', effect: { stat: { stat: 'ankauf_bps', op: 'flat', value: 1_000 } } },
  { key: 'gebuehrenfrei', name: 'Gebührenfreier Tag', text: 'Cardmarket verzichtet heute auf die Verkaufsgebühr. Niemand weiß, warum. Nicht nachfragen.', slots: ['daily'], weight: 2, hours: 24, tone: 'good', effect: { stat: { stat: 'fee_cut_bps', op: 'flat', value: 500 } } },
  { key: 'mindestlohn', name: 'Mindestlohn-Debatte', text: 'Alle Chefs zahlen heute freiwillig mehr. Aus Angst vor der Talkshow.', slots: ['daily'], weight: 2, hours: 24, tone: 'good', effect: { stat: { stat: 'wage_pct', op: 'flat', value: 20 } } },
  { key: 'energy_promo', name: 'Energy-Drink-Promo', text: 'Gratis-Dosen am Kiosk. Deine Energie lädt heute doppelt so schnell. Dein Herz klopft auch doppelt.', slots: ['daily'], weight: 2, hours: 24, tone: 'good', effect: { stat: { stat: 'energy_regen_pct', op: 'flat', value: 100 } } },
  { key: 'zinsparty', name: 'Zinsparty', text: 'Die Zentralbank hat sich verrechnet. Der Geldbunker bringt heute 30 % mehr.', slots: ['daily'], weight: 2, hours: 24, tone: 'good', effect: { stat: { stat: 'bunker_rate_pct', op: 'flat', value: 30 } } },
  { key: 'kiosk_rabatt', name: 'Kiosk-Rabatt', text: 'Der Kioskbesitzer hat zu viel bestellt: Booster heute 20 % billiger.', slots: ['daily'], weight: 3, hours: 24, tone: 'good', effect: { stat: { stat: 'kiosk_pct', op: 'flat', value: -20 } } },
  { key: 'turnier', name: 'Turnier-Wochenende', text: 'Großes Turnier in der Stadthalle. Ein Spiel ist gefragt wie nie.', slots: ['daily'], weight: 2, hours: 24, tone: 'good', effect: { hype: { game: 'random', factor: 1.15 } } },
  { key: 'kiosk_teuer', name: 'Preiserhöhung am Kiosk', text: '„Die Inflation“, sagt der Kioskbesitzer und zeigt auf seinen neuen Porsche. Booster heute 15 % teurer.', slots: ['daily'], weight: 2, hours: 24, tone: 'bad', effect: { stat: { stat: 'kiosk_pct', op: 'flat', value: 15 } } },
  { key: 'pechtag', name: 'Freitag der 13.', text: 'Schwarze Katzen überall. Heute sind weniger Hits in den Boostern. Kein Witz.', slots: ['daily'], weight: 1, hours: 24, tone: 'bad', effect: { stat: { stat: 'pack_luck', op: 'flat', value: -5 } } },
  { key: 'minijob_flaute', name: 'Flaute im Minijob-Markt', text: 'Alle wollen arbeiten, keiner will zahlen. Löhne heute 15 % niedriger.', slots: ['daily'], weight: 1, hours: 24, tone: 'bad', effect: { stat: { stat: 'wage_pct', op: 'flat', value: -15 } } },
  // Random events on the market
  { key: 'reprint_geruecht', name: 'Reprint-Gerücht', text: 'Ein Forum munkelt über einen Nachdruck. Die Karten eines Sets fallen. Bis jemand nachfragt.', slots: ['random'], weight: 2, hours: 6, tone: 'bad', effect: { pressure: { pick: 'set', factor: 0.85 } } },
  { key: 'influencer', name: 'Influencer-Pull', text: 'Ein Influencer zieht live eine Karte und schreit. Plötzlich will sie jeder.', slots: ['random'], weight: 3, hours: 6, tone: 'good', effect: { pressure: { pick: 'hit', factor: 1.5 } } },
  { key: 'kaufland', name: 'Überraschungs-Restock', text: 'Ein Laden hat eine Palette im Lager gefunden. Wer zuerst kommt …', slots: ['random'], weight: 3, hours: 1, tone: 'good', effect: { restock: 'random' } },
  // Personal events
  { key: 'steuerrueckerstattung', name: 'Steuerrückerstattung', text: 'Das Finanzamt überweist dir Geld. Freiwillig. Prüf lieber nach, ob du träumst.', slots: ['personal'], weight: 2, hours: 0, tone: 'good', effect: { money: 30 } },
  { key: 'oma', name: 'Oma steckt dir was zu', text: '„Kauf dir was Schönes, aber nicht wieder diese Karten.“ Du kaufst Karten.', slots: ['personal'], weight: 3, hours: 0, tone: 'good', effect: { money: 10 } },
  { key: 'opas_ordner', name: 'Opas alter Ordner', text: 'Opa hat auf dem Dachboden einen Ordner gefunden. Riecht nach Keller, enthält Karten.', slots: ['personal'], weight: 2, hours: 0, tone: 'good', effect: { cards: 5 } },
  { key: 'pfandfund', name: 'Pfandflaschen im Park', text: 'Nach dem Stadtfest liegt der Park voller Flaschen. Du bist schneller als die Rentner.', slots: ['personal'], weight: 3, hours: 0, tone: 'good', effect: { pfandbons: 3 } },
  { key: 'glueckstag', name: 'Glückstag', text: 'Du hast ein vierblättriges Kleeblatt gefunden. Zwei Stunden mehr Glück beim Aufreißen.', slots: ['personal'], weight: 2, hours: 2, tone: 'good', effect: { stat: { stat: 'pack_luck', op: 'flat', value: 15 } } },
  { key: 'muse', name: 'Die Muse küsst dich', text: 'Eine Stunde lang bist du ein Genie. +50 % EP. Nutze es weise. Oder für Booster.', slots: ['personal'], weight: 2, hours: 1, tone: 'good', effect: { stat: { stat: 'ep', op: 'pct', value: 50 } } },
  { key: 'gez', name: 'GEZ-Brief', text: 'Der Beitragsservice hat dich gefunden. Er findet jeden.', slots: ['personal'], weight: 2, hours: 0, tone: 'bad', effect: { money: -15 } },
  { key: 'nebenkosten', name: 'Nebenkostennachzahlung', text: 'Der Vermieter hat nachgerechnet. Mit einem sehr kreativen Taschenrechner.', slots: ['personal'], weight: 1, hours: 0, tone: 'bad', effect: { money: -20, needsHome: true } },
  { key: 'knoellchen', name: 'Knöllchen', text: 'Vor dem Kartenladen geparkt. Zehn Minuten. Das Ordnungsamt war schneller.', slots: ['personal'], weight: 2, hours: 0, tone: 'bad', effect: { money: -5 } },
  { key: 'kaffee', name: 'Kaffee auf der Tastatur', text: 'Die Tastatur klebt, du bist müde. Energie weg.', slots: ['personal'], weight: 2, hours: 0, tone: 'bad', effect: { energy: -20 } },
]

/** What the server needs (seeded as config `events.defs`). */
export const EVENTS_CONFIG = {
  'events.defs': Object.fromEntries(EVENTS.map(({ key, name: _n, text: _t, ...e }) => [key, e])),
} as const

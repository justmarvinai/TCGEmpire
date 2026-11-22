// Wohnen (docs/GAME_DESIGN.md §14): a ladder of homes and furnishing slots. A home brings storage, Vitrine places,
// faster energy and more furnishing slots; every furnishing item gives a small bonus and Wohnwert. Moving sells the
// old home back for half its price. Prices are Basis-€ cents; the server turns them into real money (Preisniveau).
export interface HomeDef {
  tier: number
  key: string
  name: string
  /** grammatical gender of the name: im / ins (das) or in der / in die (die) */
  article: 'das' | 'die'
  text: string
  minLevel: number
  priceBaseCents: number
  wohnwert: number
  /** furnishing slots (the first N of FURNISHING_SLOTS) */
  slots: number
  lagerUnits: number
  vitrineSlots: number
  energyRegenPct: number
}

export const HOMES: readonly HomeDef[] = [
  { tier: 0, key: 'kinderzimmer', name: 'Kinderzimmer bei Mutti', article: 'das', text: 'Gratis. Mutti klopft nicht an. Nie.', minLevel: 1, priceBaseCents: 0, wohnwert: 0, slots: 2, lagerUnits: 0, vitrineSlots: 0, energyRegenPct: 0 },
  { tier: 1, key: 'wg', name: 'WG-Zimmer in Berlin-Neukölln', article: 'das', text: 'Der Mitbewohner isst dein Essen und nennt es Kommune.', minLevel: 20, priceBaseCents: 5_000_00, wohnwert: 10, slots: 3, lagerUnits: 10, vitrineSlots: 1, energyRegenPct: 5 },
  { tier: 2, key: 'einzimmer', name: '1-Zimmer-Wohnung in Gelsenkirchen', article: 'die', text: 'Günstig. Sehr günstig. Frag nicht, warum.', minLevel: 24, priceBaseCents: 20_000_00, wohnwert: 30, slots: 4, lagerUnits: 25, vitrineSlots: 1, energyRegenPct: 5 },
  { tier: 3, key: 'altbau', name: 'Altbauwohnung in Leipzig', article: 'die', text: 'Stuck an der Decke, die Heizkosten noch höher als die Decke.', minLevel: 28, priceBaseCents: 80_000_00, wohnwert: 80, slots: 5, lagerUnits: 50, vitrineSlots: 2, energyRegenPct: 10 },
  { tier: 4, key: 'reihenhaus', name: 'Reihenhaus in Bielefeld', article: 'das', text: 'Offiziell gibt es das nicht. Die Grundsteuer kommt trotzdem.', minLevel: 32, priceBaseCents: 320_000_00, wohnwert: 200, slots: 6, lagerUnits: 100, vitrineSlots: 2, energyRegenPct: 10 },
  { tier: 5, key: 'einfamilienhaus', name: 'Einfamilienhaus mit Garten', article: 'das', text: 'Schaffe, schaffe, Häusle baue. Rasenmähen am Samstag ist Pflicht.', minLevel: 38, priceBaseCents: 1_300_000_00, wohnwert: 500, slots: 7, lagerUnits: 150, vitrineSlots: 3, energyRegenPct: 15 },
  { tier: 6, key: 'loft', name: 'Loft in der Hamburger HafenCity', article: 'das', text: 'Backsteinwände, Elbblick, Nachbarn mit Segelyacht und Meinung.', minLevel: 45, priceBaseCents: 5_000_000_00, wohnwert: 1_200, slots: 8, lagerUnits: 250, vitrineSlots: 3, energyRegenPct: 20 },
  { tier: 7, key: 'villa', name: 'Villa in München-Grünwald', article: 'die', text: 'Die Nachbarn sind Fußballer. Sie grüßen nicht zurück.', minLevel: 52, priceBaseCents: 20_000_000_00, wohnwert: 3_000, slots: 8, lagerUnits: 400, vitrineSlots: 4, energyRegenPct: 25 },
  { tier: 8, key: 'penthouse', name: 'Penthouse in Frankfurt', article: 'das', text: 'Über den Banken. Endlich schaust du auf die runter.', minLevel: 60, priceBaseCents: 80_000_000_00, wohnwert: 7_000, slots: 8, lagerUnits: 600, vitrineSlots: 5, energyRegenPct: 30 },
  { tier: 9, key: 'schloss', name: 'Schloss in Bayern', article: 'das', text: 'Märchenkönig-Vibes. Die Touristen fotografieren dich beim Frühstück.', minLevel: 70, priceBaseCents: 320_000_000_00, wohnwert: 15_000, slots: 8, lagerUnits: 900, vitrineSlots: 6, energyRegenPct: 35 },
  { tier: 10, key: 'finca', name: 'Finca auf Mallorca', article: 'die', text: 'Sonne, Sangria, deutsche Nachbarn. Wie zu Hause, nur wärmer.', minLevel: 80, priceBaseCents: 1_300_000_000_00, wohnwert: 35_000, slots: 8, lagerUnits: 1_300, vitrineSlots: 7, energyRegenPct: 40 },
  { tier: 11, key: 'insel', name: 'Privatinsel', article: 'die', text: 'Kein Nachbar, kein WLAN, kein Paketbote. Endlich Ruhe vor dem Hobby. Haha, nein.', minLevel: 90, priceBaseCents: 5_000_000_000_00, wohnwert: 80_000, slots: 8, lagerUnits: 2_000, vitrineSlots: 9, energyRegenPct: 50 },
]

export interface FurnishingSlot {
  key: string
  name: string
  /** what every item of the slot improves */
  stat: string
  op: 'flat' | 'pct'
  /** how the client shows the bonus */
  unit: 'pct' | 'energy' | 'places' | 'h'
}

/** In the order homes open them. */
export const FURNISHING_SLOTS: readonly FurnishingSlot[] = [
  { key: 'schreibtisch', name: 'Schreibtisch', stat: 'wage_pct', op: 'flat', unit: 'pct' },
  { key: 'sofa', name: 'Sofa', stat: 'energy_max', op: 'flat', unit: 'energy' },
  { key: 'wand', name: 'Wand', stat: 'ep', op: 'pct', unit: 'pct' },
  { key: 'vitrine', name: 'Vitrine', stat: 'vitrine_slots', op: 'flat', unit: 'places' },
  { key: 'teppich', name: 'Teppich', stat: 'energy_regen_pct', op: 'flat', unit: 'pct' },
  { key: 'gaming', name: 'Gaming-Setup', stat: 'pack_luck', op: 'flat', unit: 'pct' },
  { key: 'haustier', name: 'Haustier', stat: 'bunker_capacity_h', op: 'flat', unit: 'h' },
  { key: 'deko', name: 'Deko', stat: 'bunker_interest_pct', op: 'flat', unit: 'pct' },
]

export interface FurnitureDef {
  key: string
  slot: string
  rank: number
  name: string
  text: string
  minLevel: number
  priceBaseCents: number
  wohnwert: number
  /** bonus in the slot's stat */
  value: number
}

const RANK = [
  { minLevel: 20, priceBaseCents: 400_00, wohnwert: 5 },
  { minLevel: 24, priceBaseCents: 5_000_00, wohnwert: 25 },
  { minLevel: 32, priceBaseCents: 60_000_00, wohnwert: 100 },
  { minLevel: 50, priceBaseCents: 2_500_000_00, wohnwert: 400 },
  { minLevel: 75, priceBaseCents: 500_000_000_00, wohnwert: 2_000 },
] as const

/** Per slot: five items from cheap to absurd, with the bonus each gives. */
const ITEMS: Record<string, readonly (readonly [name: string, text: string, value: number])[]> = {
  schreibtisch: [
    ['Ikea-Schreibtisch', 'Wackelt. Wie deine Pläne.', 1],
    ['Höhenverstellbarer Schreibtisch', 'Stehen ist das neue Sitzen. Du sitzt trotzdem.', 2],
    ['Eichen-Chefschreibtisch', 'Für wichtige Entscheidungen. Booster oder Display.', 4],
    ['Zirbenholz-Schreibtisch, handgemacht', 'Ein Schreiner aus Tirol hat drei Jahre daran geweint.', 6],
    ['Goldener Präsidentenschreibtisch', 'Das Weiße Haus hat angerufen. Sie wollen ihn zurück.', 10],
  ],
  sofa: [
    ['Sperrmüll-Couch', 'Riecht nach WG-Party 2009.', 5],
    ['Ecksofa mit Schlaffunktion', 'Für den Kumpel, der nie wieder auszieht.', 10],
    ['Ledersofa vom Möbelhaus', 'Klebt im Sommer an den Beinen.', 15],
    ['Designersofa aus Mailand', 'Unbequem, aber teuer. Also perfekt.', 25],
    ['Sofa aus Drachenleder', 'Glurak hat es nicht freiwillig hergegeben.', 40],
  ],
  wand: [
    ['Glurak-Poster', 'Mit Reißzwecken. Die Kaution ist weg.', 1],
    ['Gerahmte Booster-Sammlung', 'Ungeöffnet. Natürlich.', 2],
    ['Kunstdruck vom Flohmarkt', 'Angeblich ein echter Warhol. Angeblich.', 3],
    ['Originalgemälde', 'Der Künstler ist tot. Das treibt den Preis.', 4],
    ['Die Mona Lisa', 'Der Louvre hat noch nicht gemerkt, dass sie fehlt.', 6],
  ],
  vitrine: [
    ['Regal mit Glastür', 'Das Glas ist Plexi. Merkt keiner.', 1],
    ['Beleuchtete Sammlervitrine', 'LEDs in Regenbogenfarben. Augenkrebs inklusive.', 1],
    ['Museumsvitrine mit Alarm', 'Piept, wenn Mama Staub wischt.', 2],
    ['Tresorvitrine aus Panzerglas', 'Hält Schüssen stand. Und neidischen Blicken.', 3],
    ['Vitrinensaal mit Wachpersonal', 'Zwei Securitys. Einer heißt Kevin.', 5],
  ],
  teppich: [
    ['Fußmatte „Willkommen“', 'Ironisch gemeint.', 2],
    ['Hochflor-Teppich', 'Verschluckt Kleingeld, Würfel und Energiekarten.', 4],
    ['Perserteppich', 'Echt. Steht zumindest auf dem Zettel.', 6],
    ['Roter Teppich', 'Für den Weg vom Sofa zum Kühlschrank.', 10],
    ['Teppich aus Hundert-Euro-Scheinen', 'Rutschfest ist er nicht.', 15],
  ],
  gaming: [
    ['Röhrenfernseher mit Konsole', 'Rennspiele, bis die Freundschaft endet.', 1],
    ['Gaming-PC mit RGB', 'Mehr Lichter als Leistung.', 2],
    ['Streaming-Setup', 'Drei Zuschauer, alle Bots.', 3],
    ['Simulator-Cockpit', 'Du fliegst nicht, aber du könntest.', 4],
    ['Privater E-Sport-Saal', 'Mit eigenem Kommentator, der dich lobt.', 6],
  ],
  haustier: [
    ['Goldfisch Günther', 'Vergisst alles nach drei Sekunden. Wie du deine Vorsätze.', 1],
    ['Kater Klaus', 'Wirft Karten vom Tisch. Mit Absicht.', 1],
    ['Wachhund Rex', 'Bellt bei jedem Lieferanten. Nur bei denen.', 2],
    ['Papagei, der „Glurak!“ ruft', 'Den ganzen Tag. Wirklich den ganzen Tag.', 3],
    ['Ein echter Tiger', 'Das Ordnungsamt ermittelt.', 4],
  ],
  deko: [
    ['Lavalampe', 'Blubbert. Beruhigt. Frisst Strom.', 1],
    ['Bonsai-Baum', 'Drei Jahre alt, zwei davon tot.', 1],
    ['Pikachu-Aufsteller in Lebensgröße', 'Erschreckt nachts den Besuch.', 2],
    ['Kristall-Kronleuchter', 'Hängt im Flur. Natürlich im Flur.', 3],
    ['Goldene Kloschüssel', 'Sitzt sich wie jede andere. Nur teurer.', 5],
  ],
}

export const FURNITURE: readonly FurnitureDef[] = FURNISHING_SLOTS.flatMap((s) =>
  ITEMS[s.key]!.map(([name, text, value], i) => ({ key: `${s.key}_${i + 1}`, slot: s.key, rank: i + 1, name, text, value, ...RANK[i]! })),
)

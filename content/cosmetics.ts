// Stil (docs/GAME_DESIGN.md §15): cosmetics bought with money and seen by friends. All looks are CSS on top of the
// existing art (no new pixel art): name colours, avatar frames, card sleeves in the binder, binder skins, colours of
// the pack-opening burst, and joke titles. The CSS class of a look is its key (src/styles/app.css). The profile
// picture is not sold: it is the artwork of any card you own.
export type CosmeticKind = 'name_color' | 'frame' | 'sleeve' | 'binder' | 'pack_fx' | 'title'

export interface CosmeticDef {
  key: string
  kind: CosmeticKind
  name: string
  text: string
  minLevel: number
  priceBaseCents: number
  /** pack_fx: hue range of the burst particles */
  hues?: readonly [number, number]
  /** title: the title text */
  title?: string
}

export const COSMETIC_KINDS: readonly CosmeticKind[] = ['name_color', 'frame', 'sleeve', 'binder', 'pack_fx', 'title']

export const COSMETICS: readonly CosmeticDef[] = [
  { key: 'nc-mint', kind: 'name_color', name: 'Minzgrün', text: 'Frisch wie ein ungeöffneter Booster.', minLevel: 5, priceBaseCents: 1_000_00 },
  { key: 'nc-cyan', kind: 'name_color', name: 'Eisblau', text: 'Kühl. Wie deine Verhandlungstaktik.', minLevel: 5, priceBaseCents: 1_000_00 },
  { key: 'nc-pink', kind: 'name_color', name: 'Pink Panther', text: 'Fällt auf. Soll es auch.', minLevel: 5, priceBaseCents: 2_500_00 },
  { key: 'nc-fire', kind: 'name_color', name: 'Feuerrot', text: 'Für Leute, die Glurak zu Hause hängen haben.', minLevel: 5, priceBaseCents: 2_500_00 },
  { key: 'nc-gold', kind: 'name_color', name: 'Goldener Name', text: 'Neureich in Schriftform.', minLevel: 10, priceBaseCents: 10_000_00 },
  { key: 'nc-rainbow', kind: 'name_color', name: 'Regenbogen', text: 'Jeder Buchstabe eine andere Farbe. Augenkrebs als Statement.', minLevel: 20, priceBaseCents: 50_000_00 },
  { key: 'nc-holo', kind: 'name_color', name: 'Holo-Schimmer', text: 'Dein Name glänzt wie eine Grail. Du leider nicht.', minLevel: 35, priceBaseCents: 500_000_00 },

  { key: 'fr-simple', kind: 'frame', name: 'Schlichter Ring', text: 'Unauffällig. Wie ein Steuerberater.', minLevel: 5, priceBaseCents: 1_000_00 },
  { key: 'fr-double', kind: 'frame', name: 'Doppelring', text: 'Doppelt hält besser. Sagt man.', minLevel: 5, priceBaseCents: 5_000_00 },
  { key: 'fr-gold', kind: 'frame', name: 'Goldrahmen', text: 'Mit Glow. Damit es auch der Letzte merkt.', minLevel: 15, priceBaseCents: 25_000_00 },
  { key: 'fr-holo', kind: 'frame', name: 'Holo-Rahmen', text: 'Schillert in allen Farben der Seltenheit.', minLevel: 25, priceBaseCents: 150_000_00 },
  { key: 'fr-crown', kind: 'frame', name: 'Königsrahmen', text: 'Gold, Pink und ein Ego in Übergröße.', minLevel: 50, priceBaseCents: 5_000_000_00 },

  { key: 'sl-black', kind: 'sleeve', name: 'Schwarze Hüllen', text: 'Der Klassiker. Passt zu allem, auch zu Trauer.', minLevel: 5, priceBaseCents: 1_000_00 },
  { key: 'sl-stripes', kind: 'sleeve', name: 'Gestreifte Hüllen', text: 'Wie ein Zebra. Ein teures Zebra.', minLevel: 5, priceBaseCents: 3_000_00 },
  { key: 'sl-dots', kind: 'sleeve', name: 'Gepunktete Hüllen', text: 'Sehen aus wie Omas Tischdecke. Mit Absicht.', minLevel: 8, priceBaseCents: 3_000_00 },
  { key: 'sl-holo', kind: 'sleeve', name: 'Holo-Hüllen', text: 'Jetzt glänzt auch die Pappe drumherum.', minLevel: 20, priceBaseCents: 40_000_00 },
  { key: 'sl-gold', kind: 'sleeve', name: 'Goldhüllen', text: 'Die Karte darin ist wertloser als die Hülle.', minLevel: 40, priceBaseCents: 1_000_000_00 },

  { key: 'bi-leather', kind: 'binder', name: 'Leder-Ordner', text: 'Riecht nach Opas Arbeitszimmer.', minLevel: 5, priceBaseCents: 2_000_00 },
  { key: 'bi-denim', kind: 'binder', name: 'Jeans-Ordner', text: 'Neunziger-Jahre-Schulhof in Ordnerform.', minLevel: 5, priceBaseCents: 2_000_00 },
  { key: 'bi-neon', kind: 'binder', name: 'Neon-Ordner', text: 'Leuchtet im Dunkeln. Und im Hellen auch.', minLevel: 12, priceBaseCents: 15_000_00 },
  { key: 'bi-velvet', kind: 'binder', name: 'Samt-Ordner', text: 'Weich, dunkel, dekadent. Wie ein Nachtclub für Karten.', minLevel: 25, priceBaseCents: 150_000_00 },
  { key: 'bi-gold', kind: 'binder', name: 'Goldener Ordner', text: 'Wiegt drei Kilo. Die Karten auch nicht weniger.', minLevel: 60, priceBaseCents: 10_000_000_00 },

  { key: 'fx-fire', kind: 'pack_fx', name: 'Feuerwerk', text: 'Hits explodieren in Rot und Orange.', minLevel: 5, priceBaseCents: 5_000_00, hues: [0, 40] },
  { key: 'fx-ice', kind: 'pack_fx', name: 'Eisregen', text: 'Hits zerspringen in kaltes Blau.', minLevel: 5, priceBaseCents: 5_000_00, hues: [180, 220] },
  { key: 'fx-gold', kind: 'pack_fx', name: 'Goldregen', text: 'Jeder Hit regnet Gold. Nur optisch, leider.', minLevel: 20, priceBaseCents: 50_000_00, hues: [38, 52] },
  { key: 'fx-rainbow', kind: 'pack_fx', name: 'Regenbogen-Explosion', text: 'Jeder Hit fühlt sich an wie eine Grail. Ist es nicht.', minLevel: 35, priceBaseCents: 500_000_00, hues: [0, 360] },

  { key: 'ti-neureich', kind: 'title', name: 'Titel „Neureich“', text: 'Gekauft, nicht verdient. Wie alles bei dir.', minLevel: 5, priceBaseCents: 10_000_00, title: 'Neureich' },
  { key: 'ti-pappbonze', kind: 'title', name: 'Titel „Pappbonze“', text: 'Reich durch Pappe. Stolz darauf.', minLevel: 10, priceBaseCents: 25_000_00, title: 'Pappbonze' },
  { key: 'ti-sugar', kind: 'title', name: 'Titel „Sugar Daddy“', text: 'Für Leute, die Booster an Freunde verschenken. Oder es wollen.', minLevel: 20, priceBaseCents: 100_000_00, title: 'Sugar Daddy' },
  { key: 'ti-influencer', kind: 'title', name: 'Titel „Karten-Influencer“', text: 'Unboxing-Videos ohne Zuschauer.', minLevel: 25, priceBaseCents: 250_000_00, title: 'Karten-Influencer' },
  { key: 'ti-oldmoney', kind: 'title', name: 'Titel „Old Money“', text: 'Geld seit drei Generationen. Oder seit Dienstag.', minLevel: 40, priceBaseCents: 1_000_000_00, title: 'Old Money' },
]

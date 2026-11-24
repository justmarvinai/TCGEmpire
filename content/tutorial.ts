// First-session tutorial. Mutti writes, the player acts; each step completes when the server sees `event`.
// Rewards are paid by the server (booster = level reward product, cents = Basis-€ cents, ep = level-1 units).
// The guide is what the coach marks, in order: a menu entry first, then the buttons on the page. The last entry
// that is on screen wins, so a later click target takes over as soon as it appears.
export interface TutorialStep {
  event: string
  reward: { booster?: number; cents?: number; ep?: number }
  /** Mutti's message */
  text: string
  /** the step is done by picking the favourite game (starter choice) */
  pick?: true
  /** [data-tour] targets to mark ("nav:/path" is the menu entry of a page) with what to do there */
  guide?: readonly { target: string; hint: string }[]
}

const nav = (path: string, label: string) => ({ target: `nav:${path}`, hint: `Klick links auf „${label}“.` })
const openPack = [nav('/open', 'Booster öffnen'), { target: 'open-pack', hint: 'Klick auf „1× öffnen“.' }]

export const TUTORIAL: readonly TutorialStep[] = [
  {
    event: 'starter_picked',
    reward: { booster: 1 },
    text: 'Hallo Schatz, hier ist die Mama. Opa war da und will dir einen Booster dalassen. Er fragt, welches Kartenspiel. Ich hab gesagt, die sind eh alle gleich. Such dir eins aus. LG Mama',
    pick: true,
  },
  { event: 'pack_opened', reward: { ep: 10 }, text: 'Mach Opas Booster auf. Er will wissen, was drin war. Lüg ihn nicht an.', guide: openPack },
  {
    event: 'minigame_round',
    reward: { cents: 50_00 },
    text: 'Von Luft und Karten kann man nicht leben. Im Park liegen Pfandflaschen. Sammel welche, dann hast du was Eigenes.',
    guide: [
      nav('/jobs', 'Jobs'),
      { target: 'pfand', hint: 'Klick bei „Pfandflaschen sammeln“ auf „Los gehts“.' },
      { target: 'minigame', hint: 'Klick die Flaschen an. Die Scherben lässt du liegen.' },
    ],
  },
  {
    event: 'packs_bought',
    reward: { ep: 10 },
    text: 'Jetzt kauf dir am Kiosk einen Booster. Von deinem eigenen Geld. Ich bin stolz. Ein bisschen.',
    guide: [nav('/shop', 'Läden'), { target: 'kiosk', hint: 'Klick am Kiosk auf „1× kaufen“.' }],
  },
  { event: 'pack_opened', reward: { ep: 10 }, text: 'Na los, aufmachen. Und nicht wieder so laut schreien wie bei Opas Booster.', guide: openPack },
  {
    event: 'cards_sold',
    reward: { cents: 50_00 },
    text: 'Dein Zimmer ist voll mit Pappe. Verkauf ein paar Karten im Kartenladen. Die nehmen alles. Für fast nichts.',
    guide: [
      nav('/collection', 'Sammlung'),
      { target: 'binder-card', hint: 'Klick auf eine deiner Karten.' },
      { target: 'sell-one', hint: 'Klick auf „Eine verkaufen“.' },
      { target: 'sell-dupes', hint: 'Klick auf „Duplikate verkaufen“. Weg mit dem doppelten Kram.' },
    ],
  },
  {
    event: 'quest_claimed',
    reward: { booster: 1, cents: 100_00 },
    text: 'Letzte Aufgabe von Mama: Hol dir eine Belohnung bei den Quests ab. Danach bist du auf dich allein gestellt. Ruf mal an.',
    guide: [nav('/quests', 'Quests'), { target: 'quest-claim', hint: 'Klick auf „Abholen“.' }],
  },
]

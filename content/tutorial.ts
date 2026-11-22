// First-session tutorial. Mutti writes, the player acts; each step completes when the server sees `event`.
// Rewards are paid by the server (booster = level reward product, cents = Basis-€ cents, ep = level-1 units).
export interface TutorialStep {
  event: string
  /** where the "Zeig's mir" button leads */
  path?: string
  reward: { booster?: number; cents?: number; ep?: number }
  /** Mutti's message */
  text: string
  /** button label for steps that are acknowledged by clicking */
  ack?: string
  /** the step is done by picking the favourite game (starter choice) */
  pick?: true
}

export const TUTORIAL: readonly TutorialStep[] = [
  {
    event: 'starter_picked',
    reward: { booster: 1 },
    text: 'Hallo Schatz, hier ist die Mama. Opa war da und will dir einen Booster dalassen. Er fragt, welches Kartenspiel. Ich hab gesagt, die sind eh alle gleich. Such dir eins aus. LG Mama',
    pick: true,
  },
  { event: 'pack_opened', path: '/open', reward: { ep: 10 }, text: 'Mach Opas Booster auf. Er will wissen, was drin war. Lüg ihn nicht an.' },
  {
    event: 'minigame_round',
    path: '/jobs',
    reward: { cents: 50_00 },
    text: 'Von Luft und Karten kann man nicht leben. Im Park liegen Pfandflaschen. Sammel welche, dann hast du was Eigenes.',
  },
  { event: 'packs_bought', path: '/shop', reward: { ep: 10 }, text: 'Jetzt kauf dir am Kiosk einen Booster. Von deinem eigenen Geld. Ich bin stolz. Ein bisschen.' },
  { event: 'pack_opened', path: '/open', reward: { ep: 10 }, text: 'Na los, aufmachen. Und nicht wieder so laut schreien wie bei Opas Booster.' },
  {
    event: 'cards_sold',
    path: '/collection',
    reward: { cents: 50_00 },
    text: 'Dein Zimmer ist voll mit Energiekarten. Verkauf ein paar im Kartenladen. Die nehmen alles. Für fast nichts.',
  },
  {
    event: 'quest_claimed',
    path: '/quests',
    reward: { booster: 1, cents: 100_00 },
    text: 'Letzte Aufgabe von Mama: Hol dir eine Belohnung bei den Aufgaben ab. Danach bist du auf dich allein gestellt. Ruf mal an.',
  },
]

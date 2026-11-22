// Jobs: a minijob (active mini-game, costs energy) and/or an idle shift. Names are real employers as parody.
export interface JobDef {
  key: string
  name: string
  employer: string
  /** player level for the minijob and for shifts of this job */
  minLevel: number
  /** shift wage relative to the base shift wage */
  wage: number
  minigame?: 'pfand' | 'regale' | 'sortieren' | 'pakete'
  /** whether the job offers idle shifts */
  shifts: boolean
}

export const JOBS: readonly JobDef[] = [
  { key: 'pfand', name: 'Pfandflaschen sammeln', employer: 'Der Park', minLevel: 1, wage: 0, minigame: 'pfand', shifts: false },
  { key: 'mueller', name: 'Regale einräumen', employer: 'Müller', minLevel: 3, wage: 1.0, minigame: 'regale', shifts: true },
  { key: 'wuerfelbude', name: 'Karten sortieren', employer: 'Würfelbude', minLevel: 6, wage: 1.1, minigame: 'sortieren', shifts: true },
  { key: 'dhl', name: 'Pakete ausliefern', employer: 'DHL', minLevel: 10, wage: 1.25, minigame: 'pakete', shifts: true },
]

/** Shift ranks per job: hours worked needed, wage bonus. */
export const RANKS = [
  { name: 'Aushilfe', hours: 0, bonus: 1.0 },
  { name: 'Festangestellt', hours: 10, bonus: 1.15 },
  { name: 'Schichtleitung', hours: 40, bonus: 1.35 },
  { name: 'Filialleitung', hours: 120, bonus: 1.6 },
] as const

/** Shift lengths in hours a player can pick. */
export const SHIFT_HOURS = [0.25, 1, 4, 8] as const

// Skill tree (docs/GAME_DESIGN.md §12.2): one Skillpunkt per level. Four branches, each with two lines of three
// nodes and a keystone that needs both lines. Deeper nodes cost more, so one run cannot buy everything
// (4 × 28 points > 99). `stat` + `op` + `value` become a modifier with source `skill:<key>`; the keystones use
// stats of their own (god_pack_mult, npc_trust, bailout, pate) that the server reads where they apply.
export type SkillBranch = 'sammler' | 'haendler' | 'unternehmer' | 'schlitzohr'

export interface SkillDef {
  key: string
  branch: SkillBranch
  /** 1–3 along a line, 4 for the keystone */
  tier: 1 | 2 | 3 | 4
  /** line 0 or 1 inside the branch; the keystone uses -1 */
  line: -1 | 0 | 1
  name: string
  text: string
  requires: readonly string[]
  stat: string
  op: 'flat' | 'pct'
  value: number
}

/** Skillpunkte per node by tier. */
export const SKILL_COST: Record<SkillDef['tier'], number> = { 1: 2, 2: 3, 3: 4, 4: 10 }

export const SKILL_BRANCHES: readonly { key: SkillBranch; name: string; text: string }[] = [
  { key: 'sammler', name: 'Sammler', text: 'Glück und ein scharfes Auge.' },
  { key: 'haendler', name: 'Händler', text: 'Bessere Deals, kleinere Gebühren.' },
  { key: 'unternehmer', name: 'Unternehmer', text: 'Fleiß, Kapital, Größe.' },
  { key: 'schlitzohr', name: 'Schlitzohr', text: 'Straßenschläue und kreative Steuerplanung.' },
]

export const SKILLS: readonly SkillDef[] = [
  // Sammler
  { key: 's_glueck1', branch: 'sammler', tier: 1, line: 0, name: 'Glückspfennig', text: '+3 % Pack-Glück: mehr Alternative, Ultra und Grail.', requires: [], stat: 'pack_luck', op: 'flat', value: 3 },
  { key: 's_glueck2', branch: 'sammler', tier: 2, line: 0, name: 'Hasenpfote', text: '+5 % Pack-Glück.', requires: ['s_glueck1'], stat: 'pack_luck', op: 'flat', value: 5 },
  { key: 's_glueck3', branch: 'sammler', tier: 3, line: 0, name: 'Vierblättriges Kleeblatt', text: '+7 % Pack-Glück. Mehr als +50 % gibt es trotzdem nicht.', requires: ['s_glueck2'], stat: 'pack_luck', op: 'flat', value: 7 },
  { key: 's_auge1', branch: 'sammler', tier: 1, line: 1, name: 'Vitrinenputzer', text: '+1 Platz in der Vitrine.', requires: [], stat: 'vitrine_slots', op: 'flat', value: 1 },
  { key: 's_auge2', branch: 'sammler', tier: 2, line: 1, name: 'Adlerauge', text: 'Die Vorprüfung zeigt um eine Note engere Spannen.', requires: ['s_auge1'], stat: 'pregrade_skill', op: 'flat', value: 1 },
  { key: 's_auge3', branch: 'sammler', tier: 3, line: 1, name: 'Grading-Abo', text: '+2 Einsende-Slots beim Grading.', requires: ['s_auge2'], stat: 'grading_slots', op: 'flat', value: 2 },
  { key: 's_god', branch: 'sammler', tier: 4, line: -1, name: 'God-Pack-Magnet', text: 'Dreifache Chance auf God-Packs: Booster, in denen nur Hits stecken.', requires: ['s_glueck3', 's_auge3'], stat: 'god_pack_mult', op: 'flat', value: 2 },
  // Händler
  { key: 'h_feil1', branch: 'haendler', tier: 1, line: 0, name: 'Ankauf-Profi', text: 'Der Kartenladen zahlt dir 65 statt 60 % vom Marktwert.', requires: [], stat: 'ankauf_bps', op: 'flat', value: 500 },
  { key: 'h_feil2', branch: 'haendler', tier: 2, line: 0, name: 'Gebührenfuchs', text: 'Cardmarket-Gebühr 4 statt 5 %.', requires: ['h_feil1'], stat: 'fee_cut_bps', op: 'flat', value: 100 },
  { key: 'h_feil3', branch: 'haendler', tier: 3, line: 0, name: 'Feilschkönig', text: 'Der Kartenladen zahlt 75 % vom Marktwert. Der Besitzer weint leise.', requires: ['h_feil2'], stat: 'ankauf_bps', op: 'flat', value: 1000 },
  { key: 'h_netz1', branch: 'haendler', tier: 1, line: 1, name: 'Großes Regal', text: '+5 Plätze für Angebote und Gesuche am Cardmarket.', requires: [], stat: 'listing_slots', op: 'flat', value: 5 },
  { key: 'h_netz2', branch: 'haendler', tier: 2, line: 1, name: 'Silberzunge', text: 'Käufer in den Kleinanzeigen bieten 10 % mehr für deine Anzeigen.', requires: ['h_netz1'], stat: 'ad_bonus_pct', op: 'flat', value: 10 },
  { key: 'h_netz3', branch: 'haendler', tier: 3, line: 1, name: 'Lagerhalle', text: '+30 Plätze im Lager für Booster und Displays.', requires: ['h_netz2'], stat: 'lager_units', op: 'flat', value: 30 },
  { key: 'h_stamm', branch: 'haendler', tier: 4, line: -1, name: 'Stammkunden', text: 'Sammler und Investoren kaufen deine Cardmarket-Angebote bis zum vollen Marktwert, nicht nur Schnäppchen.', requires: ['h_feil3', 'h_netz3'], stat: 'npc_trust', op: 'flat', value: 1 },
  // Unternehmer
  { key: 'u_fleiss1', branch: 'unternehmer', tier: 1, line: 0, name: 'Frühaufsteher', text: '+5 % Lohn in Schichten und Minijobs.', requires: [], stat: 'wage_pct', op: 'flat', value: 5 },
  { key: 'u_fleiss2', branch: 'unternehmer', tier: 2, line: 0, name: 'Energydrink-Abo', text: '+15 maximale Energie.', requires: ['u_fleiss1'], stat: 'energy_max', op: 'flat', value: 15 },
  { key: 'u_fleiss3', branch: 'unternehmer', tier: 3, line: 0, name: 'Workaholic', text: 'Energie lädt 15 % schneller.', requires: ['u_fleiss2'], stat: 'energy_regen_pct', op: 'flat', value: 15 },
  { key: 'u_kap1', branch: 'unternehmer', tier: 1, line: 1, name: 'Sparbuch', text: '+3 % Zinsen, wenn du einen fast vollen Bunker leerst.', requires: [], stat: 'bunker_interest_pct', op: 'flat', value: 3 },
  { key: 'u_kap2', branch: 'unternehmer', tier: 2, line: 1, name: 'Tresorraum', text: 'Der Bunker sammelt 4 Stunden länger.', requires: ['u_kap1'], stat: 'bunker_capacity_h', op: 'flat', value: 4 },
  { key: 'u_kap3', branch: 'unternehmer', tier: 3, line: 1, name: 'Zinseszins', text: '+15 % Ertrag im Geldbunker.', requires: ['u_kap2'], stat: 'bunker_rate_pct', op: 'flat', value: 15 },
  { key: 'u_tbtf', branch: 'unternehmer', tier: 4, line: -1, name: 'Too Big To Fail', text: 'Einmal pro Durchgang rettet dich der Staat: Fällt dein Bargeld unter 5 % deines Vermögens, gibt es ein Viertel deines Vermögens als Rettungspaket.', requires: ['u_fleiss3', 'u_kap3'], stat: 'bailout', op: 'flat', value: 1 },
  // Schlitzohr
  { key: 'x_str1', branch: 'schlitzohr', tier: 1, line: 0, name: 'Nase für Fakes', text: 'Du erkennst Fälschungen in den Kleinanzeigen. Immer.', requires: [], stat: 'fake_sense', op: 'flat', value: 1 },
  { key: 'x_str2', branch: 'schlitzohr', tier: 2, line: 0, name: 'Menschenkenner', text: 'Du riechst in den Kleinanzeigen auch geknickte Ware und Abtaucher.', requires: ['x_str1'], stat: 'risk_sense', op: 'flat', value: 1 },
  { key: 'x_str3', branch: 'schlitzohr', tier: 3, line: 0, name: 'Kevin-Radar', text: 'Kevins Mama findet die Kreditkarte nie: keine Rückbuchungen mehr.', requires: ['x_str2'], stat: 'no_chargeback', op: 'flat', value: 1 },
  { key: 'x_deck1', branch: 'schlitzohr', tier: 1, line: 1, name: 'Steuertrick', text: 'Ein Viertel weniger Schenkungssteuer.', requires: [], stat: 'gift_tax_cut_pct', op: 'flat', value: 25 },
  { key: 'x_deck2', branch: 'schlitzohr', tier: 2, line: 1, name: 'Zweitkonto', text: 'Noch ein Viertel weniger Schenkungssteuer.', requires: ['x_deck1'], stat: 'gift_tax_cut_pct', op: 'flat', value: 25 },
  { key: 'x_deck3', branch: 'schlitzohr', tier: 3, line: 1, name: 'Familienkasse', text: '+50 % Freibetrag für Geschenke an Freunde.', requires: ['x_deck2'], stat: 'gift_allowance_pct', op: 'flat', value: 50 },
  { key: 'x_pate', branch: 'schlitzohr', tier: 4, line: -1, name: 'Der Pate', text: 'Du siehst bei jeder Kleinanzeige die Schmerzgrenze des Verkäufers. Man macht dir Angebote, die du nicht ablehnen kannst.', requires: ['x_str3', 'x_deck3'], stat: 'pate', op: 'flat', value: 1 },
]

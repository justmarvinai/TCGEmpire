// Die Firma (docs/GAME_DESIGN.md §9, docs/ECONOMY.md §9): a grading company. Orders run through four stations;
// the slowest one limits everything. Money values are Basis-€ cents (the server applies the Preisniveau); rates per
// hour. COMPANY_CONFIG below is what the server needs (seeded as config `company.*`); the texts stay on the client.

export const STATIONS = ['annahme', 'pruefung', 'slabbing', 'versand'] as const
export type Station = (typeof STATIONS)[number]

export const SERVICES = ['economy', 'standard', 'express'] as const
export type CompanyService = (typeof SERVICES)[number]

export interface StageDef {
  stage: number
  key: string
  name: string
  /** the bureaucracy before the stage starts (shown while waiting) */
  quest: string
  costBaseCents: number
  waitMinutes: number
  staffCap: number
  /** customers per hour before Ruf, price, hype, marketing and speed */
  baseDemand: number
  rentBaseCents: number
  /** capacity factor: a second shift from the GmbH on */
  shiftMult: number
  services: readonly CompanyService[]
  /** highest equipment level per station */
  equipmentMax: number
  /** applicants' base wage per hour; better companies attract (and pay) better people */
  wageBaseCents: number
  /** added to every stat of an applicant */
  statBonus: number
}

export const STAGES: readonly StageDef[] = [
  { stage: 1, key: 'garage', name: 'Garagenfirma', quest: 'Die Garage ausräumen. Papas Werkbank darf bleiben, sagt Papa.', costBaseCents: 25_000_00, waitMinutes: 0, staffCap: 2, baseDemand: 70, rentBaseCents: 40_00, shiftMult: 1, services: ['economy'], equipmentMax: 2, wageBaseCents: 60_00, statBonus: 0 },
  { stage: 2, key: 'gbr', name: 'GbR', quest: 'Gesellschaftervertrag beim Notar. Er liest jeden Satz vor. Jeden.', costBaseCents: 150_000_00, waitMinutes: 30, staffCap: 4, baseDemand: 140, rentBaseCents: 200_00, shiftMult: 1, services: ['economy', 'standard'], equipmentMax: 3, wageBaseCents: 120_00, statBonus: 5 },
  { stage: 3, key: 'ug', name: 'UG (haftungsbeschränkt)', quest: 'Eintrag ins Handelsregister. Das Amtsgericht hat eine Faxnummer. Nur eine Faxnummer.', costBaseCents: 1_200_000_00, waitMinutes: 60, staffCap: 8, baseDemand: 330, rentBaseCents: 900_00, shiftMult: 1, services: ['economy', 'standard', 'express'], equipmentMax: 4, wageBaseCents: 250_00, statBonus: 10 },
  { stage: 4, key: 'gmbh', name: 'GmbH', quest: 'Stammkapital einzahlen, IHK-Beitrag zahlen, IHK-Zeitschrift abbestellen. Geht nicht.', costBaseCents: 12_000_000_00, waitMinutes: 120, staffCap: 16, baseDemand: 800, rentBaseCents: 4_000_00, shiftMult: 1.5, services: ['economy', 'standard', 'express'], equipmentMax: 5, wageBaseCents: 500_00, statBonus: 15 },
  { stage: 5, key: 'kg', name: 'GmbH & Co. KG', quest: 'Zweiter Standort. Der Steuerberater weint vor Freude.', costBaseCents: 100_000_000_00, waitMinutes: 240, staffCap: 30, baseDemand: 2_000, rentBaseCents: 18_000_00, shiftMult: 1.5, services: ['economy', 'standard', 'express'], equipmentMax: 5, wageBaseCents: 1_000_00, statBonus: 20 },
  { stage: 6, key: 'ag', name: 'AG', quest: 'Hauptversammlung mit Schnittchen. Die Aktionäre wollen Dividende und Häppchen.', costBaseCents: 800_000_000_00, waitMinutes: 480, staffCap: 60, baseDemand: 5_000, rentBaseCents: 80_000_00, shiftMult: 2, services: ['economy', 'standard', 'express'], equipmentMax: 5, wageBaseCents: 2_000_00, statBonus: 25 },
  { stage: 7, key: 'se', name: 'SE', quest: 'Europäische Aktiengesellschaft. Brüssel schickt einen Fragebogen mit 400 Seiten.', costBaseCents: 6_000_000_000_00, waitMinutes: 720, staffCap: 120, baseDemand: 13_000, rentBaseCents: 300_000_00, shiftMult: 2, services: ['economy', 'standard', 'express'], equipmentMax: 5, wageBaseCents: 4_000_00, statBonus: 30 },
]

export interface StationDef {
  key: Station
  name: string
  text: string
  /** orders per hour of an average worker (Tempo 50) with the basic equipment */
  perWorker: number
}

export const STATION_DEFS: readonly StationDef[] = [
  { key: 'annahme', name: 'Annahme', text: 'Pakete aufmachen, Karten zählen, Formulare abtippen.', perWorker: 40 },
  { key: 'pruefung', name: 'Prüfung', text: 'Hier wird gegradet. Genauigkeit zählt, sonst hagelt es 1-Stern-Bewertungen.', perWorker: 16 },
  { key: 'slabbing', name: 'Einschweißen', text: 'Karte in den Slab, Etikett drauf, zuschweißen. Nicht die Finger.', perWorker: 24 },
  { key: 'versand', name: 'Versand', text: 'Einpacken, Etikett, ab zur Post. Die Post macht um 18 Uhr zu.', perWorker: 40 },
]

export interface EquipmentDef {
  name: string
  text: string
  costBaseCents: number
  /** capacity factor of the station */
  mult: number
  /** electricity per hour */
  powerBaseCents: number
  /** Prüfung only: percentage points of accuracy */
  accuracy?: number
}

/** Level 0 is what every company starts with. */
export const EQUIPMENT: Record<Station, readonly EquipmentDef[]> = {
  annahme: [
    { name: 'Briefkasten', text: 'Mit Aufkleber „Bitte keine Werbung“. Werbung kommt trotzdem.', costBaseCents: 0, mult: 1, powerBaseCents: 0 },
    { name: 'Paketannahme mit Klingel', text: 'Der Bote klingelt jetzt. Manchmal sogar, bevor er die Karte einwirft.', costBaseCents: 8_000_00, mult: 1.4, powerBaseCents: 2_00 },
    { name: 'Barcode-Scanner', text: 'Piep. Piep. Piep. Der Klang des Fortschritts.', costBaseCents: 60_000_00, mult: 1.9, powerBaseCents: 8_00 },
    { name: 'Annahmeschalter mit Wartenummern', text: 'Wie beim Amt, nur schneller. Also anders als beim Amt.', costBaseCents: 400_000_00, mult: 2.6, powerBaseCents: 30_00 },
    { name: 'Förderband', text: 'Die Pakete fahren jetzt Karussell. Die Praktikanten auch.', costBaseCents: 2_500_000_00, mult: 3.5, powerBaseCents: 120_00 },
    { name: 'Annahme-Roboter', text: 'Er hat einen Namen: Horst. Horst arbeitet ohne Pause und ohne Gewerkschaft.', costBaseCents: 15_000_000_00, mult: 4.8, powerBaseCents: 500_00 },
  ],
  pruefung: [
    { name: 'Lupe vom Flohmarkt', text: 'Hat Opa beim Briefmarkensammeln benutzt. Ein Kratzer im Glas ist ein Feature.', costBaseCents: 0, mult: 1, powerBaseCents: 0, accuracy: 0 },
    { name: 'Juwelierlupe', text: 'Klemmt im Auge, sieht professionell aus. Mehr will der Kunde nicht.', costBaseCents: 10_000_00, mult: 1.3, powerBaseCents: 1_00, accuracy: 2 },
    { name: 'Mikroskop', text: 'Jetzt siehst du Kratzer, die es gar nicht gibt. Und welche, die es gibt.', costBaseCents: 80_000_00, mult: 1.7, powerBaseCents: 5_00, accuracy: 4 },
    { name: 'Lichttisch mit UV-Lampe', text: 'Macht Fälschungen sichtbar. Und Flecken auf dem Teppich.', costBaseCents: 500_000_00, mult: 2.3, powerBaseCents: 25_00, accuracy: 6 },
    { name: 'Messroboter', text: 'Misst die Zentrierung auf den Mikrometer. Mag keine Menschen.', costBaseCents: 3_000_000_00, mult: 3.1, powerBaseCents: 100_00, accuracy: 8 },
    { name: 'KI-Scanner „Made in Germany“', text: 'Entwickelt in Stuttgart, gebaut in Shenzhen, Datenschutzerklärung 80 Seiten.', costBaseCents: 20_000_000_00, mult: 4.2, powerBaseCents: 450_00, accuracy: 10 },
  ],
  slabbing: [
    { name: 'Laminiergerät', text: 'Aus dem Schreibwarenladen. Riecht nach Grundschule.', costBaseCents: 0, mult: 1, powerBaseCents: 1_00 },
    { name: 'Schweißgerät', text: 'Zischt bedrohlich. Die Versicherung fragt nach.', costBaseCents: 9_000_00, mult: 1.4, powerBaseCents: 4_00 },
    { name: 'Ultraschall-Schweißer', text: 'Die Hunde der Nachbarschaft hassen dich jetzt.', costBaseCents: 70_000_00, mult: 1.9, powerBaseCents: 12_00 },
    { name: 'Slab-Presse', text: 'Drei Tonnen Druck. Für eine Karte. Verhältnismäßig.', costBaseCents: 450_000_00, mult: 2.6, powerBaseCents: 45_00 },
    { name: 'Vollautomat', text: 'Karte rein, Slab raus. Wie ein Kaugummiautomat, nur seriös.', costBaseCents: 2_800_000_00, mult: 3.5, powerBaseCents: 150_00 },
    { name: 'Slab-Fabrik', text: 'Eine ganze Halle. Die Gemeinde hat ein Gewerbegebiet nach dir benannt.', costBaseCents: 18_000_000_00, mult: 4.8, powerBaseCents: 600_00 },
  ],
  versand: [
    { name: 'Tesafilm', text: 'Hält. Meistens. Der Rest ist Gottvertrauen.', costBaseCents: 0, mult: 1, powerBaseCents: 0 },
    { name: 'Klebeband-Abroller', text: 'Ratsch! Das schönste Geräusch im Versand.', costBaseCents: 7_000_00, mult: 1.4, powerBaseCents: 0 },
    { name: 'Etikettendrucker', text: 'Druckt Adressen, Barcodes und gelegentlich Papierstau.', costBaseCents: 50_000_00, mult: 1.9, powerBaseCents: 6_00 },
    { name: 'Versandstraße', text: 'Wiegen, packen, frankieren. Der Postbote kriegt eine Rampe.', costBaseCents: 350_000_00, mult: 2.6, powerBaseCents: 30_00 },
    { name: 'Packroboter', text: 'Packt in Rekordzeit. Füllmaterial: viel zu viel.', costBaseCents: 2_200_000_00, mult: 3.5, powerBaseCents: 110_00 },
    { name: 'Eigene Paketflotte', text: 'Zehn Transporter mit deinem Logo. Und Parkknöllchen mit deinem Namen.', costBaseCents: 14_000_000_00, mult: 4.8, powerBaseCents: 400_00 },
  ],
}

export interface ServiceDef {
  key: CompanyService
  name: string
  /** share of the stage's customers that want this service */
  share: number
  /** what the big graders charge on average (Basis-€ cents); your fair price is this × your brand */
  refFeeBaseCents: number
}

export const SERVICE_DEFS: readonly ServiceDef[] = [
  { key: 'economy', name: 'Economy', share: 0.6, refFeeBaseCents: 260_00 },
  { key: 'standard', name: 'Standard', share: 0.3, refFeeBaseCents: 520_00 },
  { key: 'express', name: 'Express', share: 0.1, refFeeBaseCents: 1_200_00 },
]

export interface ApplicantType {
  key: string
  /** fixed name (a character) or null for a random one from the name pools */
  name: string | null
  cv: string
  weight: number
  tempo: readonly [number, number]
  accuracy: readonly [number, number]
  loyalty: readonly [number, number]
  /** wage wish as a factor of the stage's base wage */
  wage: readonly [number, number]
}

export const APPLICANT_TYPES: readonly ApplicantType[] = [
  { key: 'praktikant', name: 'Praktikant Kevin', cv: 'Arbeitet für „Erfahrung“. Erfahrung hat er keine, das ist ja der Punkt.', weight: 3, tempo: [30, 55], accuracy: [20, 45], loyalty: [40, 70], wage: [0.1, 0.2] },
  { key: 'rentner', name: 'Rentner Heinz', cv: 'Minijob-Basis. Hat 40 Jahre Briefmarken sortiert. Sieht alles, macht alles langsam.', weight: 3, tempo: [15, 35], accuracy: [65, 90], loyalty: [60, 90], wage: [0.4, 0.6] },
  { key: 'doktor', name: 'Dr. Müller', cv: 'Promoviert in Kunstgeschichte. Überqualifiziert, gelangweilt, hält Vorträge über Zentrierung.', weight: 1, tempo: [45, 70], accuracy: [80, 98], loyalty: [10, 40], wage: [2.2, 3] },
  { key: 'zocker', name: null, cv: 'Kennt jede Karte, hat jede Karte, will jede Karte. Bitte nicht in die Taschen gucken.', weight: 3, tempo: [50, 75], accuracy: [55, 80], loyalty: [20, 50], wage: [0.9, 1.3] },
  { key: 'azubi', name: null, cv: 'Azubi im dritten Lehrjahr. Fragt viel, lernt schnell, hört dabei Podcasts.', weight: 4, tempo: [40, 60], accuracy: [40, 65], loyalty: [50, 80], wage: [0.5, 0.8] },
  { key: 'quereinsteiger', name: null, cv: 'Vorher Versicherungsvertreter. Will „was mit Menschen“. Hier gibt es Karten.', weight: 4, tempo: [45, 65], accuracy: [45, 65], loyalty: [40, 70], wage: [0.9, 1.2] },
  { key: 'profi', name: null, cv: 'Zehn Jahre bei einem großen Grader. Redet nicht drüber. NDA.', weight: 2, tempo: [60, 85], accuracy: [70, 90], loyalty: [30, 60], wage: [1.6, 2.2] },
  { key: 'schnell', name: null, cv: 'Ex-Paketbote. Schnell wie der Wind, sorgfältig wie der Wind.', weight: 3, tempo: [70, 95], accuracy: [20, 45], loyalty: [30, 60], wage: [0.9, 1.3] },
  { key: 'cousin', name: 'Cousin Marvin', cv: 'Familie. Kann nichts, kostet nichts, geht nie wieder.', weight: 1, tempo: [20, 45], accuracy: [20, 45], loyalty: [90, 100], wage: [0.3, 0.5] },
  { key: 'influencerin', name: null, cv: 'Hat 12.000 Follower. Will jede Karte vor dem Einschweißen filmen.', weight: 2, tempo: [25, 50], accuracy: [35, 60], loyalty: [20, 50], wage: [1, 1.5] },
]

export const FIRST_NAMES: readonly string[] = [
  'Jacqueline', 'Chantal', 'Dennis', 'Sven', 'Mandy', 'Ronny', 'Gertrud', 'Uwe', 'Sabine', 'Dieter', 'Jannik', 'Leonie',
  'Torben', 'Anke', 'Mehmet', 'Olga', 'Bernd', 'Svenja', 'Malte', 'Yvonne', 'Hakan', 'Ingrid', 'Pascal', 'Nadine',
]
export const LAST_NAMES: readonly string[] = [
  'Schmidt', 'Kowalski', 'Meier', 'Yılmaz', 'Hoffmann', 'Krause', 'Schulze', 'Becker', 'Wagner', 'Petrović', 'Lehmann',
  'Fischer', 'Wolff', 'Neumann', 'Schwarz', 'Zimmermann',
]

/** Generated customer reviews, by stars (index 0 = 1 star). */
export const REVIEWS: readonly (readonly string[])[] = [
  [
    'Karte kam als 9 zurück, war safe eine 10. 1 Stern. Anwalt ist informiert.',
    'Drei Wochen gewartet, dann war der Slab verkratzt. Nie wieder!!!',
    'Die haben meine Karte vertauscht. Meine war eine Glurak. Glaube ich.',
    'Unfreundlich am Telefon. Also, es ging keiner ran. Das ist unfreundlich.',
  ],
  [
    'Geht so. Etikett schief, Note okay, Versand ewig.',
    'Für den Preis hätte ich mehr erwartet. Zum Beispiel eine 10.',
    'Slab hat einen Fingerabdruck. Innen.',
  ],
  [
    'Solide. Nicht schnell, nicht langsam, nicht spannend.',
    'Note fair, Wartezeit unfair. Drei Sterne, weil ich nett bin.',
    'Mittelmaß mit Etikett. Passt schon.',
  ],
  [
    'Schnelle Bearbeitung, gerne wieder!!1!',
    'Hat alles gepasst, nur die Mail-Updates waren auf Comic Sans.',
    'Fairer Preis, ordentliche Slabs. Mutti ist stolz.',
    'Note stimmt, Paket kam heile. Mehr will man doch nicht.',
  ],
  [
    'Beste Firma Deutschlands!!! Meine Karte sieht im Slab aus wie neu. War sie auch.',
    'Rasend schnell, super genau, das Etikett ist ein Kunstwerk. 10/10.',
    'Habe geweint, als ich den Slab ausgepackt habe. Vor Freude. Glaube ich.',
    'Der Chef hat persönlich eine Notiz beigelegt. Mit Smiley. Ehrenmann.',
  ],
]

/** Colours for company slab labels (art palette). */
export const LABEL_COLORS: Readonly<Record<string, string>> = {
  weiss: '#f4f1e8',
  schwarz: '#141218',
  rot: '#c8323c',
  blau: '#2f5fd0',
  gruen: '#2e9b5a',
  gold: '#d6a63a',
  silber: '#a9b0bb',
  lila: '#7a4cc4',
  orange: '#e27a2e',
  pink: '#d9488f',
  tuerkis: '#2aa6a6',
  braun: '#7a5236',
}

/** Passierschein A38: three doors per room, the hint tells which one. A wrong door sends you back to the start. */
export const A38_ROOMS: readonly { text: string; doors: readonly string[]; right: number }[] = [
  { text: 'Erdgeschoss. Ein Schild: „Passierscheine gibt es nur mit dem blauen Formular aus dem Keller.“', doors: ['Schalter 1', 'Treppe zum Keller', 'Kantine'], right: 1 },
  { text: 'Keller. Die Dame am Tresen: „Das blaue Formular? Das stempelt nur der Hausmeister. Der ist im dritten Stock.“', doors: ['Aufzug (außer Betrieb)', 'Zurück ins Erdgeschoss', 'Treppe in den dritten Stock'], right: 2 },
  { text: 'Dritter Stock. Der Hausmeister stempelt und sagt: „Jetzt brauchen Sie noch die Unterschrift von Zimmer 2B.“', doors: ['Zimmer 2B', 'Zimmer B2', 'Zimmer 2 im Haus B'], right: 0 },
  { text: 'Zimmer 2B. „Unterschrift? Gerne. Aber erst, wenn Sie den Passierschein A38 haben.“ Ein Formular liegt auf dem Tisch.', doors: ['Das Formular selbst ausfüllen', 'Nach dem Passierschein A38 fragen', 'Weinen'], right: 0 },
]

export interface CampaignDef {
  key: string
  name: string
  text: string
  /** price at stage 1; bigger companies pay more (× the stage's wage level) */
  costBaseCents: number
  /** customers × (1 + boost) while it runs */
  boost: number
  hours: number
  minStage: number
}

export const CAMPAIGNS: readonly CampaignDef[] = [
  { key: 'flyer', name: 'Flyer im Kiosk', text: 'Copyshop, 500 Stück, Comic Sans. Der Kioskbesitzer legt sie neben die Lottoscheine.', costBaseCents: 500_00, boost: 0.2, hours: 24, minStage: 1 },
  { key: 'instagram', name: 'Instagram-Kampagne', text: 'Ein Reel mit Slab-Unboxing und trendigem Sound. Die Kommentare: nur Bots und Mutti.', costBaseCents: 2_500_00, boost: 0.4, hours: 24, minStage: 2 },
  { key: 'youtuber', name: 'YouTuber sponsern', text: '„Dieses Video wird gesponsert von …“ Er spricht deinen Namen falsch aus. Egal, 200.000 Aufrufe.', costBaseCents: 9_000_00, boost: 0.7, hours: 24, minStage: 2 },
  { key: 'messe', name: 'Stand auf der Kartenmesse', text: 'Zwei Tage Messehalle, Klapptisch, Bannerständer. Die Füße tun weh, die Kasse klingelt.', costBaseCents: 30_000_00, boost: 1.2, hours: 48, minStage: 3 },
]

/**
 * Decision cards. Effects: cash (Basis-€ cents × the stage's wage level; negative costs), ruf, loyalty and wagePct for
 * all staff, bump (Gefälligkeitsgutachten: a slab one grade too good is out there), downgrade (equipment of a station
 * drops a level), boost/hours (more customers for a while), rufAccuracy (Ruf ± that much depending on accuracy ≥ 90 %).
 * `ignore` is the choice that happens when nobody decides in time.
 */
export interface DecisionEffect {
  cash?: number
  ruf?: number
  loyalty?: number
  wagePct?: number
  bump?: number
  downgrade?: Station
  boost?: number
  hours?: number
  rufAccuracy?: number
}
export interface DecisionDef {
  key: string
  title: string
  text: string
  weight: number
  minStage: number
  ignore: number
  choices: readonly { label: string; result: string; effect: DecisionEffect }[]
}

export const DECISIONS: readonly DecisionDef[] = [
  {
    key: 'reklamation', title: 'Reklamation', weight: 4, minStage: 1, ignore: 2,
    text: 'Ein Kunde schwört, seine Karte war eine 10. Er hat eine 8 bekommen. Er hat Fotos. Unscharfe Fotos.',
    choices: [
      { label: 'Kulanz: Geld zurück', result: 'Der Kunde ist besänftigt und schreibt „Service top“. Das Geld ist weg.', effect: { cash: -300_00, ruf: 4 } },
      { label: 'Gutachten verteidigen', result: 'Du erklärst ihm Zentrierung. Er versteht es nicht. Er schreibt eine Bewertung.', effect: { ruf: -2 } },
      { label: 'Ignorieren', result: 'Er postet es in drei Facebook-Gruppen. Mit Großbuchstaben.', effect: { ruf: -6 } },
    ],
  },
  {
    key: 'bestechung', title: 'Ein Umschlag', weight: 3, minStage: 1, ignore: 1,
    text: 'Ein Händler schiebt dir einen Umschlag hin: „Für eine Note besser. Unter uns.“',
    choices: [
      { label: 'Nehmen', result: 'Das Geld ist auf dem Konto, der Slab in der Welt. Eine kleine Zeitbombe tickt.', effect: { cash: 1_500_00, bump: 1 } },
      { label: 'Ablehnen', result: 'Der Händler geht beleidigt. Dein Gewissen schläft gut.', effect: { ruf: 2 } },
    ],
  },
  {
    key: 'journalistin', title: 'Presseanfrage', weight: 2, minStage: 1, ignore: 1,
    text: 'Eine Journalistin der KARTEN-BILD will wissen, wie streng ihr wirklich prüft.',
    choices: [
      { label: 'Interview geben', result: 'Der Artikel erscheint. Ob er dir gefällt, hängt davon ab, wie gut du wirklich bist.', effect: { rufAccuracy: 8 } },
      { label: 'Kein Kommentar', result: '„Die Firma wollte sich nicht äußern.“ Klingt nach Leiche im Keller.', effect: { ruf: -2 } },
    ],
  },
  {
    key: 'schweissgeraet', title: 'Es raucht', weight: 3, minStage: 1, ignore: 1,
    text: 'Das Gerät zum Einschweißen macht komische Geräusche und riecht nach verbranntem Plastik.',
    choices: [
      { label: 'Reparieren lassen', result: 'Der Techniker kommt, schaut, seufzt und schreibt eine Rechnung.', effect: { cash: -800_00 } },
      { label: 'Wird schon gehen', result: 'Es ging nicht. Das Gerät ist hinüber, ihr arbeitet wieder mit dem alten.', effect: { downgrade: 'slabbing' } },
    ],
  },
  {
    key: 'betriebsrat', title: 'Betriebsrat', weight: 2, minStage: 2, ignore: 0,
    text: 'Die Belegschaft will einen Betriebsrat gründen. Es gibt Flyer. Und eine Liste mit Forderungen.',
    choices: [
      { label: 'Unterstützen', result: 'Mehr Lohn, bessere Laune. Der Kaffee ist jetzt Bio.', effect: { loyalty: 15, wagePct: 5 } },
      { label: 'Dagegen kämpfen', result: 'Du gewinnst. Die Stimmung ist im Keller, und das Internet weiß es.', effect: { loyalty: -20, ruf: -4 } },
    ],
  },
  {
    key: 'praktikant', title: 'Missgeschick', weight: 3, minStage: 1, ignore: 1,
    text: 'Praktikant Kevin hat die Karte eines Kunden fallen lassen. Ecke ab. Er weint.',
    choices: [
      { label: 'Kunden entschädigen', result: 'Teuer, aber der Kunde kommt wieder. Kevin auch.', effect: { cash: -600_00, ruf: 1 } },
      { label: 'Vertuschen', result: 'Der Kunde merkt es. Natürlich merkt er es.', effect: { ruf: -5, loyalty: -5 } },
    ],
  },
  {
    key: 'nachbar', title: 'Der Nachbar', weight: 2, minStage: 1, ignore: 1,
    text: 'Der Nachbar beschwert sich über den Lärm vom Schweißgerät. Er droht mit dem Ordnungsamt.',
    choices: [
      { label: 'Kuchen vorbeibringen', result: 'Er ist versöhnt und empfiehlt dich im Kleingartenverein.', effect: { cash: -30_00, boost: 0.1, hours: 12 } },
      { label: 'Lauter machen', result: 'Das Ordnungsamt kommt. Mit Formular.', effect: { cash: -400_00, ruf: -2 } },
    ],
  },
  {
    key: 'kooperation', title: 'Kooperation', weight: 2, minStage: 2, ignore: 1,
    text: 'Ein Kartenladen will seine Kunden an dich schicken. Gegen eine kleine Provision.',
    choices: [
      { label: 'Einschlagen', result: 'Der Laden schickt Kunden. Viele Kunden.', effect: { cash: -2_000_00, boost: 0.3, hours: 48 } },
      { label: 'Ablehnen', result: 'Du bleibst unabhängig. Und leer.', effect: {} },
    ],
  },
  {
    key: 'abwerbung', title: 'Abwerbeversuch', weight: 2, minStage: 2, ignore: 1,
    text: 'Die Konkurrenz hat deinen besten Leuten ein Angebot gemacht. Sie überlegen.',
    choices: [
      { label: 'Gehälter erhöhen', result: 'Alle bleiben. Und wissen jetzt, was sie wert sind.', effect: { wagePct: 8, loyalty: 10 } },
      { label: 'Pokern', result: 'Sie bleiben, aber sie reden in der Kaffeeküche über dich.', effect: { loyalty: -15 } },
    ],
  },
]

export interface AwardDef {
  key: string
  name: string
  text: string
}

/** Only for honest companies: no open Gefälligkeitsgutachten, no Schwarzarbeit, no scandal. */
export const AWARDS: readonly AwardDef[] = [
  { key: 'tuev', name: 'TÜV-geprüft', text: '500 Aufträge bei mindestens 90 % Genauigkeit.' },
  { key: 'warentest', name: 'Stiftung Warentest: SEHR GUT (1,3)', text: 'Im Schnitt mindestens 4,3 Sterne aus 20 Bewertungen.' },
  { key: 'din', name: 'DIN-Norm für Slabs', text: '5.000 Aufträge und mindestens 4 Sterne Ruf.' },
]

export interface ResearchDef {
  key: string
  name: string
  text: string
  costBaseCents: number
  /** brand of the company's slabs, in basis points of PSA */
  brandBps: number
  /** four quality values of 10 become the company's own Black Label */
  blackLabel?: boolean
}

/** Research (from the UG on): better slabs, a stronger brand. */
export const RESEARCH: readonly ResearchDef[] = [
  { key: 'uv', name: 'UV-Schutz-Slab', text: 'Slabs, die nicht vergilben. Behauptet zumindest die Werbung.', costBaseCents: 2_000_000_00, brandBps: 300 },
  { key: 'hologramm', name: 'Hologramm-Label', text: 'Schillert, glitzert und ist schwer zu fälschen. Leichter als gedacht, aber schwer.', costBaseCents: 6_000_000_00, brandBps: 400 },
  { key: 'nfc', name: 'NFC-Zertifikat', text: 'Handy an den Slab halten, das Zertifikat erscheint. Opa hält ihn ans Ohr.', costBaseCents: 15_000_000_00, brandBps: 500 },
  { key: 'blacklabel', name: 'Eigenes Black Label', text: 'Vier glatte 10er bekommen dein schwarzes Etikett. Und den Wert dazu.', costBaseCents: 40_000_000_00, brandBps: 0, blackLabel: true },
]

/** Umsatzsteuer-Voranmeldung: a form with one honest number and two wrong ones. */
export const TAX_FORM = {
  title: 'Umsatzsteuer-Voranmeldung',
  question: 'Zeile 21: Umsatz der letzten sieben Tage. Welcher Betrag steht in deinen Büchern?',
}

/** What the server needs (seeded as config). */
export const COMPANY_CONFIG = {
  'company.stages': STAGES.map(({ name: _n, quest: _q, key: _k, ...s }) => s),
  'company.per_worker': Object.fromEntries(STATION_DEFS.map((s) => [s.key, s.perWorker])),
  'company.equipment': Object.fromEntries(
    Object.entries(EQUIPMENT).map(([k, list]) => [k, list.map(({ name: _n, text: _t, ...e }) => ({ accuracy: 0, ...e }))]),
  ),
  'company.services': Object.fromEntries(SERVICE_DEFS.map((s) => [s.key, { share: s.share, ref_fee_base_cents: s.refFeeBaseCents }])),
  'company.applicants': APPLICANT_TYPES.map(({ cv: _c, name, ...a }) => ({ ...a, fixed_name: name !== null })),
  'company.first_names': FIRST_NAMES.length,
  'company.last_names': LAST_NAMES.length,
  'company.review_counts': REVIEWS.map((r) => r.length),
  'company.label_colors': Object.keys(LABEL_COLORS),
  'company.campaigns': Object.fromEntries(CAMPAIGNS.map(({ key, name: _n, text: _t, ...c }) => [key, c])),
  'company.decisions': DECISIONS.map(({ title: _t, text: _x, choices, ...d }) => ({ ...d, choices: choices.map((c) => c.effect) })),
  'company.research': Object.fromEntries(RESEARCH.map(({ key, name: _n, text: _t, ...r }) => [key, { blackLabel: false, ...r }])),
} as const

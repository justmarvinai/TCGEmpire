// Empiremon: the game's own TCG (0.0.5, docs/sets/empiremon.md). Five sets, all in print from the start and for good,
// sold only at the kiosk, no licence needed. Each set: 2 Grail, 3 Ultra, the rest Common; the pack odds are the house
// odds in content/config.ts. Elements: Glut, Flut, Kraut, Strom, Beton, Spuk. d = desirability 1-10 (value inside the tier).
import type { CardData, SetData, Tier } from '../types.ts'

type Row = readonly [name: string, element: string, d: number]

/** Cards in printed order: the commons first, then the 3 Ultras, then the 2 Grails. */
function house(id: string, code: string, name: string, commons: readonly Row[], ultras: readonly Row[], grails: readonly Row[]): SetData {
  const rows: [Row, Tier][] = [
    ...commons.map((r) => [r, 'common'] as [Row, Tier]),
    ...ultras.map((r) => [r, 'ultra'] as [Row, Tier]),
    ...grails.map((r) => [r, 'grail'] as [Row, Tier]),
  ]
  const cards: CardData[] = rows.map(([[cardName, element, d], tier], i) => ({
    id: `${code}-${String(i + 1).padStart(3, '0')}`,
    no: i + 1,
    name: cardName,
    en: cardName,
    tier,
    kind: 'monster',
    element,
    d,
  }))
  return { id, game: 'empiremon', name, size: cards.length, house: true, cards }
}

export const empiremonGrundauflage = house(
  'empiremon-1',
  'emp1',
  'Grundauflage',
  [
    ['Funkfuchs', 'Strom', 3],
    ['Glutkröte', 'Glut', 3],
    ['Pfützling', 'Flut', 2],
    ['Moosbär', 'Kraut', 3],
    ['Kieselkauz', 'Beton', 2],
    ['Spukspatz', 'Spuk', 2],
    ['Flämmchen', 'Glut', 4],
    ['Blubbaal', 'Flut', 2],
    ['Knospenkobold', 'Kraut', 2],
    ['Zappelmaus', 'Strom', 4],
    ['Bröckelbock', 'Beton', 2],
    ['Nebelnatter', 'Spuk', 3],
    ['Rußratte', 'Glut', 1],
    ['Schlammschnecke', 'Flut', 1],
    ['Steckdosenigel', 'Strom', 3],
  ],
  [
    ['Vulkanwolf', 'Glut', 8],
    ['Gewitterhirsch', 'Strom', 9],
    ['Abgrundwal', 'Flut', 8],
  ],
  [
    ['Imperadon', 'Glut', 10],
    ['Mondkaiserin', 'Spuk', 9],
  ],
)

export const empiremonSpaetschicht = house(
  'empiremon-2',
  'emp2',
  'Spätschicht',
  [
    ['Dosenkater', 'Beton', 3],
    ['Kronkorkenkrabbe', 'Flut', 2],
    ['Kippenkrähe', 'Spuk', 2],
    ['Neonmotte', 'Strom', 3],
    ['Pizzakartonpanzer', 'Beton', 2],
    ['Mitternachtsmops', 'Spuk', 4],
    ['Energydrinkechse', 'Strom', 3],
    ['Frittenfuchs', 'Glut', 3],
    ['Nachtbusschnecke', 'Kraut', 2],
    ['Kioskkakadu', 'Kraut', 3],
    ['Dönerdachs', 'Glut', 4],
    ['Laternenlibelle', 'Strom', 2],
    ['Rucksackratte', 'Beton', 1],
  ],
  [
    ['Spätikönig', 'Beton', 8],
    ['Neonphönix', 'Strom', 9],
    ['Kebabkrake', 'Glut', 8],
  ],
  [
    ['Der Letzte Döner', 'Glut', 10],
    ['Neonyx', 'Spuk', 9],
  ],
)

export const empiremonAmt = house(
  'empiremon-3',
  'emp3',
  'Amt & Elend',
  [
    ['Stempelkrebs', 'Beton', 3],
    ['Formularfalter', 'Kraut', 3],
    ['Aktenschnecke', 'Flut', 2],
    ['Wartenummerwurm', 'Beton', 2],
    ['Paragrafenpython', 'Spuk', 3],
    ['Kopierkobold', 'Strom', 2],
    ['Tackerdackel', 'Beton', 3],
    ['Lochermaulwurf', 'Kraut', 2],
    ['Faxfledermaus', 'Strom', 2],
    ['Kaffeeautomatenkauz', 'Glut', 3],
  ],
  [
    ['Bürokrator', 'Beton', 8],
    ['Aktenhydra', 'Spuk', 8],
    ['Faxdrache', 'Strom', 9],
  ],
  [
    ['Der Ewige Antrag', 'Spuk', 9],
    ['Stempelgott', 'Beton', 10],
  ],
)

export const empiremonPfandland = house(
  'empiremon-4',
  'emp4',
  'Pfandland',
  [
    ['Pfandpinguin', 'Flut', 4],
    ['Flaschengeist', 'Spuk', 3],
    ['Dosendachs', 'Beton', 2],
    ['Kistenkrabbe', 'Flut', 2],
    ['Scherbenschlange', 'Beton', 2],
    ['Kronkorkenkäfer', 'Strom', 2],
    ['Mehrwegmaus', 'Kraut', 3],
    ['Einwegigel', 'Flut', 2],
    ['Leergutlurch', 'Flut', 2],
    ['Bierdeckelbiber', 'Kraut', 3],
    ['Glascontainerkrake', 'Flut', 2],
    ['Etikettenechse', 'Kraut', 1],
    ['Sixpackspinne', 'Spuk', 2],
    ['Gärkellerkröte', 'Glut', 2],
    ['Korkenkobold', 'Kraut', 2],
    ['Strohhalmstorch', 'Flut', 2],
    ['Pfandbonbär', 'Beton', 3],
    ['Tütenqualle', 'Flut', 1],
    ['Rückgaberabe', 'Spuk', 2],
  ],
  [
    ['Pfandautomaten-Titan', 'Beton', 8],
    ['Glasdrache', 'Flut', 9],
    ['Recyclingphönix', 'Glut', 8],
  ],
  [
    ['Goldflaschengeist', 'Spuk', 10],
    ['Pfandkönig', 'Beton', 9],
  ],
)

export const empiremonAbstellgleis = house(
  'empiremon-5',
  'emp5',
  'Abstellgleis',
  [
    ['Verspätungsschnecke', 'Kraut', 4],
    ['Weichenwiesel', 'Strom', 2],
    ['Gleisgecko', 'Beton', 2],
    ['Schaffnereule', 'Spuk', 3],
    ['Pendlerpinguin', 'Flut', 3],
    ['Ersatzverkehrsesel', 'Beton', 3],
    ['Bahnsteigbiber', 'Kraut', 2],
    ['Durchsagendrossel', 'Strom', 2],
    ['Fahrkartenfalke', 'Spuk', 2],
    ['Klimaanlagenkrake', 'Flut', 2],
    ['Großraumgrille', 'Kraut', 1],
    ['Kofferkäfer', 'Beton', 2],
    ['Signalsalamander', 'Glut', 2],
    ['Stellwerksspinne', 'Strom', 2],
    ['Oberleitungsotter', 'Strom', 3],
    ['Speisewagenschwein', 'Glut', 3],
    ['Ruhebereichsrobbe', 'Flut', 2],
    ['Tunnelmaulwurf', 'Beton', 2],
    ['Bahnhofstaube', 'Beton', 1],
    ['Gepäckgeier', 'Spuk', 2],
    ['Umsteigeunke', 'Flut', 2],
    ['Funklochfledermaus', 'Spuk', 3],
    ['Sitzplatzschakal', 'Glut', 2],
    ['Weichenwurm', 'Kraut', 1],
    ['Notbremsnashorn', 'Glut', 3],
  ],
  [
    ['Zugausfall-Hydra', 'Spuk', 8],
    ['Stellwerk-Golem', 'Beton', 8],
    ['Schnellzugphönix', 'Glut', 9],
  ],
  [
    ['Signalstörung', 'Strom', 9],
    ['Der Pünktliche', 'Strom', 10],
  ],
)

export const EMPIREMON: readonly SetData[] = [
  empiremonGrundauflage,
  empiremonSpaetschicht,
  empiremonAmt,
  empiremonPfandland,
  empiremonAbstellgleis,
]

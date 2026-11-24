// Kleinanzeigen (docs/GAME_DESIGN.md §7.2): who sells, what the ads say and how people answer. The server
// picks the style, the title number and the reply number; the client renders these lines ({card}, {price}).

/** Private sellers of NPC ads (attic finds belong to Dachboden-Doris, see content/npcs.ts). */
export const AD_SELLERS = ['Uwe aus Herne', 'Biggi', 'Manni', 'Sören', 'Chantal', 'Opa Heinz', 'Jacqueline', 'Detlef', 'Gaby', 'Torsten']

export const AD_TITLES = {
  attic: [
    'Dachbodenfund, keine Ahnung was die wert sind',
    'Alte Sammelkarten vom Sohn, der ist jetzt Steuerberater',
    'Karten aus Nachlass, nur Abholung',
    'Beim Umzug gefunden. Pokemon oder so',
  ],
  normal: [
    '{card} zu verkaufen',
    '{card}, tierfreier Nichtraucherhaushalt',
    '{card}, Versand möglich, kein Tausch',
    'Biete {card}, sehr guter Zustand (glaub ich)',
  ],
  dreamer: [
    'RARITÄT!!! {card}, weiß was ich hab',
    '{card}, Preis ist fest, keine Kinder bitte',
    'Seltenes {card}!!! Sammlerstück!!!',
    '{card}, Wertanlage, nur an Kenner',
  ],
  player: ['{card}'],
} as const

export const AD_REPLIES = {
  accept: ['Deal. Komm vorbei, der Hund ist angeleint.', 'Passt. Holst du es heute noch ab?', 'Na gut. Aber nur weil heute mein guter Tag ist.'],
  counter: ['{price} und wir sind im Geschäft.', 'Letzte Preis: {price}. Drunter geht nicht.', 'Für {price} kannst du es haben. Meine Frau sagt, ich bin zu weich.'],
  block: ['Für {price} steh ich nicht mal auf. Blockiert.', 'Unverschämt. Tschüss.', 'Melde dich nie wieder.'],
  lowball: ['Was letzte Preis? {price} bar.', 'Gebe {price}, heute noch.', 'Ist noch da? {price} und ich hol sofort.'],
  kid: ['ich zahl {price}!!! mama hat kreditkarte', 'NEHME ES FÜR {price} BITTE BITTE', 'ich will das unbedingt, {price} ok???'],
  fair: ['Würde {price} geben. Passt das?', '{price} wäre fair, oder?', 'Ich biete {price}, Abholung heute.'],
  // 0.0.11: the collector who comes at the asking price (market.npc_buy_steps)
  full: ['Nehm ich, {price} ohne Feilschen. Wann kann ich vorbeikommen?', '{price}? Gekauft. Endlich mal einer, der nicht spinnt.', 'Zum vollen Preis, {price}. Ich bring Bargeld und Kekse mit.'],
} as const

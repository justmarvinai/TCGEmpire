// Snacks (money, at the Kiosk) and Pfandautomat items (Pfandbons). Used at once when bought.
// buff: a temporary modifier; the Döner's Fettfinger makes freshly pulled hits a bit worse.
export interface ConsumableDef {
  key: string
  name: string
  text: string
  where: 'kiosk' | 'pfandautomat'
  priceBaseCents?: number
  pfandbons?: number
  energy?: number
  booster?: number
  /** name and text are shown on the buff chip in the top bar while it runs */
  buff?: { stat: string; op: 'flat' | 'pct'; value: number; minutes: number; name: string; text: string }
}

export const CONSUMABLES: readonly ConsumableDef[] = [
  { key: 'doener', name: 'Döner', text: '+50 Energie. Fettige Finger für 10 Minuten: frisch gezogene Hits haben schlechtere Oberflächen.', where: 'kiosk', priceBaseCents: 150_00, energy: 50, buff: { stat: 'fettfinger', op: 'flat', value: 1, minutes: 10, name: 'Fettfinger', text: 'Frisch gezogene Hits haben schlechtere Oberflächen. Erst Hände waschen, dann aufreißen.' } },
  { key: 'mate', name: 'Club-Mate', text: '+20 Energie. Schmeckt wie ein Bierdeckel, wirkt wie ein Wecker.', where: 'kiosk', priceBaseCents: 50_00, energy: 20 },
  { key: 'kaffee', name: 'Kaffee', text: '+12 Energie. Filterkaffee aus der Thermoskanne vom Kioskbesitzer.', where: 'kiosk', priceBaseCents: 35_00, energy: 12 },
  { key: 'energiebon', name: 'Energie-Bon', text: '+30 Energie. Ohne Fettfinger, ohne Würde.', where: 'pfandautomat', pfandbons: 3, energy: 30 },
  { key: 'lernbon', name: 'Lern-Bon', text: '+25 % EP für 30 Minuten.', where: 'pfandautomat', pfandbons: 4, buff: { stat: 'ep', op: 'pct', value: 25, minutes: 30, name: 'Lern-Bon', text: '+25 % EP auf alles.' } },
  { key: 'gluecksbon', name: 'Glücks-Bon', text: '+10 % Pack-Glück für 30 Minuten.', where: 'pfandautomat', pfandbons: 5, buff: { stat: 'pack_luck', op: 'flat', value: 10, minutes: 30, name: 'Glücks-Bon', text: '+10 % Pack-Glück.' } },
  { key: 'kioskbon', name: 'Kiosk-Gutschein', text: 'Ein Booster. Der Kioskbesitzer guckt komisch, nimmt ihn aber.', where: 'pfandautomat', pfandbons: 8, booster: 1 },
]

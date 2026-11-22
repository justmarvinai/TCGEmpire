// German texts of the grading minijobs "Echt oder Fake?" and "Grading-Praktikum" (names and blurbs: de.ts).
export const minijobs = {
  fake: {
    hint: 'Fakes verraten sich: falsche Farben, blass, gespiegelt, zu dunkel oder ein verschriebener Name.',
    plate: 'Inserat',
    real: 'Echt',
    fake: 'Fake',
    keysReal: ['E', '←'],
    keysFake: ['F', '→'],
    /** stamp when a fake was waved through, with the tell that gave it away */
    caught: 'Fake!',
    tells: {
      hue: 'Farben verschoben',
      faded: 'Ausgeblichen',
      mirror: 'Gespiegelt',
      dark: 'Zu dunkel',
      name: 'Name verschrieben',
    },
    passed: 'Durchgewunken. Der Fälscher sagt danke.',
    /** stamp when a real card was called a fake */
    wasReal: 'Echt!',
    flagged: 'War echt. Jetzt heult der Verkäufer.',
  },
  praktikum: {
    hint: 'Die schlechteste Stelle zählt.',
    grades: { 10: '10', 9: '9', 8: '8', 7: '7 oder schlechter' } as Record<number, string>,
    grade: (g: number) => `Note ${g}`,
    aspects: { centering: 'Zentrierung', corners: 'Ecken', edges: 'Kanten', surface: 'Oberfläche' },
    near: 'Knapp daneben.',
    wrong: 'Voll daneben. Lupe putzen, Praktikant.',
  },
} as const

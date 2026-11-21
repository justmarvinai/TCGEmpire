// All German UI text lives here (and in content files), never inline in components.
// Tone: trocken, derb, schwarzhumorig (docs/HUMOR.md).

export const texts = {
  brand: { name: 'TCGEmpire', claim: 'Vom Pfandflaschen-Sammler zum Karten-Mogul.' },

  auth: {
    login: 'Anmelden',
    register: 'Neu hier',
    username: 'Benutzername',
    password: 'Passwort',
    invite: 'Einladungscode',
    submitLogin: 'Rein da',
    submitRegister: 'Imperium gründen',
    usernameHint: '3–16 Zeichen. Buchstaben, Zahlen, _ und -.',
    passwordHint: 'Mindestens 6 Zeichen. Nimm keins, das du woanders benutzt.',
    inviteHint: 'Hat dir jemand gegeben, der dich mag. Oder dich abziehen will.',
    firstAccount:
      'Du bist der erste Account. Der Code, den du hier eingibst, gilt ab jetzt für alle – und du bist Admin. Glückwunsch, Chef.',
    localMode: 'Lokaler Modus: Das ganze Spiel läuft nur in diesem Browser. Zum Testen.',
    loading: 'Server wird geweckt …',
  },

  nav: {
    groups: {
      start: 'Start',
      sammeln: 'Sammeln',
      handeln: 'Handeln',
      verdienen: 'Verdienen',
      aufsteigen: 'Aufsteigen',
      leben: 'Leben',
      freunde: 'Freunde',
    },
    items: {
      home: 'Übersicht',
      shop: 'Läden',
      open: 'Booster öffnen',
      collection: 'Sammlung',
      grading: 'Grading',
      cardmarket: 'Cardmarket',
      kleinanzeigen: 'Kleinanzeigen',
      auctions: 'Auktionen',
      trade: 'Tausch',
      jobs: 'Jobs',
      bunker: 'Geldbunker',
      company: 'Firma',
      streaming: 'Streaming',
      quests: 'Quests',
      upgrades: 'Upgrades',
      skills: 'Skillbaum',
      path: 'Level-Pfad',
      prestige: 'Prestige',
      housing: 'Wohnen',
      style: 'Stil',
      luxury: 'Luxus',
      battles: 'Pack Battles',
      toplists: 'Toplisten',
      players: 'Spieler',
      darkside: 'Schattenwirtschaft',
      megaprojects: 'Megaprojekte',
      profile: 'Profil',
      devui: 'Baukasten',
    },
    lockedLevel: (level: number) => `Ab Level ${level}`,
    soon: 'Bald',
  },

  hud: {
    level: 'Level',
    cash: 'Geld',
    cashTip:
      'Dein Bargeld. Alles im Spiel kostet oder bringt Geld. Liegen lassen lohnt nicht: Die Inflation frisst es langsam auf.',
    pfandbons: 'Pfandbons',
    pfandbonsTip: 'Kleingeld der Gosse. Gibt es für Mini-Quests und Minijobs, einlösbar am Pfandautomaten.',
    ruf: 'Ruf',
    rufTip: 'Dein Ruf, 0 bis 5 Sterne. Ehrliche Geschäfte heben ihn, Betrug und Skandale ruinieren ihn.',
    energy: 'Energie',
    energyTip: 'Brauchst du nur für Minijobs. Lädt sich von selbst auf. Oder mit Döner.',
    price: 'Preisniveau',
    priceTip:
      'Alles, was das Spiel bepreist oder auszahlt, wird damit multipliziert. Steigt langsam mit dem Fortschritt aller. Dein Bargeld steigt nicht mit. Der Döner auch nicht billiger.',
    ep: 'EP',
    epTip: 'Erfahrungspunkte. Gibt es für fast alles. Jedes Level schaltet etwas frei und bringt einen Skillpunkt.',
    maxLevel: 'Max. Level',
    notifications: 'Mitteilungen',
    noNotifications: 'Nichts Neues. Nicht mal Mutti schreibt.',
    settings: 'Einstellungen',
    sound: 'Sound',
    reducedMotion: 'Animationen reduzieren',
    logout: 'Abmelden',
    admin: 'Admin',
  },

  feed: {
    title: 'KARTEN-BILD',
    subtitle: 'Wir berichten. Du verlierst.',
    empty: 'Noch keine Schlagzeilen. Mach halt was.',
    player_joined: (d: Record<string, unknown>) =>
      `NEU IM GESCHÄFT: ${String(d.name)} will reich werden. Experten geben ihm zwei Wochen.`,
    inflation: (d: Record<string, unknown>, doener: string) =>
      `INFLATION: Preise steigen um ${pct(Number(d.from), Number(d.to))} %. Döner jetzt ${doener}. Experten ratlos.`,
    unknown: 'Irgendwas ist passiert. Die Redaktion schläft noch.',
  },

  notifications: {
    level_up: (d: Record<string, unknown>) => `Level ${String(d.level)} erreicht. +1 Skillpunkt. Mutti ist verhalten stolz.`,
    unknown: 'Du hast Post. Was drin steht, weiß keiner.',
  },

  home: {
    greeting: (name: string) => `Moin, ${name}.`,
    subtitle: 'Dein Imperium auf einen Blick. Viel ist es noch nicht.',
    netWorth: 'Vermögen',
    netWorthTip: 'Bargeld plus alles, was du besitzt. Im Moment also: Bargeld.',
    nextTitle: 'Als Nächstes',
    nextBody:
      'Das Fundament steht. Mit dem nächsten Update kommen Kiosk, Booster, Pack-Opening und deine Sammlung. Bis dahin: Leg dein Geld nicht aus dem Fenster.',
    serverTitle: 'Server',
    version: 'Version',
    players: 'Du spielst als',
  },

  locked: {
    levelTitle: (level: number) => `Ab Level ${level}`,
    levelBody: (missing: number) =>
      missing === 1 ? 'Noch 1 Level. Fast da. Streng dich an.' : `Noch ${missing} Level. Das wird schon. Irgendwann.`,
    soonTitle: 'Kommt bald',
    soonBody: 'Dieser Bereich wird gerade gebaut. Gut Ding will Weile haben. Sagt die Deutsche Bahn auch.',
  },

  common: {
    info: 'Was ist das?',
    close: 'Schließen',
    retry: 'Nochmal versuchen',
    errorTitle: 'Das ging schief',
    loading: 'Lädt …',
    newVersion: 'Neue Version verfügbar – neu laden',
  },

  errors: {
    server_error: 'Der Server hat sich verschluckt. Versuch es gleich nochmal.',
    contract_mismatch: 'Der Server antwortet anders als erwartet. Lade die Seite neu.',
    auth_unavailable:
      'Anmeldung nicht möglich. (Admin: In Supabase unter Authentication „Anonymous sign-ins“ einschalten.)',
    not_authenticated: 'Du bist nicht angemeldet.',
    no_player: 'Du bist nicht angemeldet.',
    invalid_request: 'Ungültige Anfrage.',
    rate_limited: 'Langsam, Brauner. Zu viele Klicks.',
    insufficient_funds: 'Dafür reicht dein Geld nicht. Wie immer.',
    username_invalid: 'Der Name passt nicht: 3–16 Zeichen, nur Buchstaben, Zahlen, _ und -.',
    username_taken: 'Den Namen hat schon jemand. Sei kreativer.',
    password_invalid: 'Das Passwort braucht 6 bis 72 Zeichen.',
    invite_invalid: 'Der Einladungscode braucht 4 bis 64 Zeichen.',
    invite_wrong: 'Falscher Einladungscode. Wer hat dich überhaupt eingeladen?',
    login_wrong: 'Name oder Passwort falsch. Einer von beiden lügt.',
    login_locked: 'Zu viele Fehlversuche. Konto ist ein paar Minuten gesperrt. Geh an die frische Luft.',
  },
} as const

function pct(from: number, to: number) {
  return (((to - from) / from) * 100).toFixed(1).replace('.', ',')
}

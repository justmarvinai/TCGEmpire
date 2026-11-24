# Changelog

All notable changes to TCGEmpire. The first full release is `0.0.1` (23 Nov 2026); every update after it counts up
by one: `0.0.2`, `0.0.3`, … Before it came the alphas `0.0.1-alpha_01` to `0.0.1-alpha_12`.

## [0.0.8] — Kiosk und Empiremon (24 Nov 2026)

### Changed

- **Empiremon is a little less brutal:** Ultra 1 in 4.000 boosters (was 1 in 10.000), Grail 1 in 20.000 (was 1 in
  50.000). They are worth correspondingly less (an Ultra about 240.000 €, a Grail about 1,7 million), so a booster is
  worth the same on average.
- **New Kiosk:** the boosters are compact tiles grouped by game, with buttons to show one game; your favourite game
  comes first, then your other games, Empiremon and the games you have no licence for. Ankauf, Lager and the snacks
  now sit below it.

## [0.0.7] — Sammlung, Packs und Slabs (24 Nov 2026)

### Added

- **What's in the pack?** Click any booster or display picture (Kiosk, stores, Booster öffnen, licences, battles) to
  see what it holds, the chances of its hit slot and every card of the set with its chance per booster.
- **Grade reveal:** graded cards come back in a sealed pack from PSA, BGS, CGC or your company. Tear it open, the slab
  slides out with the grade under a seal sticker, the drum roll builds up (BGS shows its sub-grades one by one), the
  sticker peels off and the grade slams in: fireworks for a 9 or 10, a sad thud for the rest. Skippable any time.
- **Slabs move:** hover a slab and it lifts, tilts towards the mouse and catches the light.

### Changed

- **One Sammlung instead of a tab per set:** all your cards in one place, with filters for game, set, owned or
  missing and rarity, a name search, and sorting by value, number, name, rarity or count. Progress, value, selling
  duplicates and the Sammelziele follow what you have filtered.

## [0.0.6] — Dritte Runde Feedback (23 Nov 2026)

### Changed

- **Quests pay money only weekly:** mini quests, daily quests and the bonus for all five dailies now give EP and
  Pfandbons only; the weekly quests keep their money. Fewer boosters bought means slower levelling too, which
  answers "you level up a little too quickly" on its own.
- **Pfandautomat is dearer:** Energie-Bon 5 Pfandbons (was 3), Lern-Bon 6 (was 4), Kiosk-Gutschein 12 (was 8). The
  Glücks-Bon costs 10 (was 5) and gives +5 % Pack-Glück for 5 minutes (was +10 % for 30 minutes).
- **Sammlung sorted by value:** sort by number or by value, highest first; the rarity filter shows only the tiers a
  set has.

### Fixed

- **Phones:** the tutorial pointed at the side menu, which on a phone is hidden, and dimmed everything else, so you
  could not get anywhere. Now it first points at the menu button, then at the entry.

## [0.0.5] — Empiremon (23 Nov 2026)

### Added

- **Empiremon, our own card game:** five sets, all out at once and never out of print: Grundauflage (20 cards),
  Spätschicht (18), Amt & Elend (15), Pfandland (24) and Abstellgleis (30). Each set has 2 Grails, 3 Ultras and the rest
  Commons, all of them our own creatures (Tackerdackel, Der Letzte Döner, Der Pünktliche …).
- **Only at the Kiosk, no licence needed:** an Empiremon booster costs 200 € (twice a normal booster) and holds 5 cards:
  4 Commons and a hit slot that turns into an Ultra 1 in 10.000 times and a Grail 1 in 50.000 times, otherwise into
  another Common. No God Packs, no Doppel-Hits, no Pech-Schutz. Not in stores, Pack Battles or classifieds.
- **Cheap bottom, absurd top:** Commons are worth a few cents, an Ultra about 600.000 €, a Grail about 4 million €
  (before inflation). On average a booster is still worth 72 % of its price.
- The Pull-Raten show the Empiremon odds too; new achievement **Hausmarke** for collecting Empiremon cards.

## [0.0.4] — Seltener (23 Nov 2026)

### Changed

- **Rarer hits:** Alternative 1 in 50 boosters (was 1 in 24), Ultra 1 in 1.000 (was 1 in 200), Grail 1 in 3.500 (was
  1 in 2.000). Each is worth more by the same factor (Alternative ×2,08, Ultra ×5, Grail ×1,75), so a booster is worth
  the same on average and every other card keeps its value.

## [0.0.3] — Zweite Runde Feedback (23 Nov 2026)

### Added

- **Pull-Raten** on the Booster öffnen page: the chance for every rarity in a booster's hit slot, plus Doppel-Hit,
  God Pack and Pech-Schutz.
- **Who's online:** a green dot with the number of players online right now next to "Spieler" in the menu.

### Changed

- **The Kiosk sells as many boosters as you can pay for** (no daily limit any more).
- **Ultras and Grails are much rarer:** Ultra 1 in 200 boosters (was 1 in 72), Grail 1 in 2.000 (was 1 in 720). To
  make up for it they are worth 2,78× as much; every other card keeps its value.
- **Stores restock more often:** Müller every two hours from 8 to 20 o'clock, Smyths at 10, 14 and 18 o'clock.

## [0.0.2] — Erste Runde Feedback (23 Nov 2026)

### Added

- **Cardmarket → Verkaufen:** a new tab lists everything you own, the most valuable first, each with an "Anbieten"
  button that opens the card's sell form. The card window in the collection has "Auf dem Cardmarket verkaufen" too.

### Changed

- **Grading is much faster:** PSA 1 h / 30 min / 10 min, BGS 40 / 20 / 8 min, CGC 20 / 12 / 5 min (Economy /
  Standard / Express).
- **Pfandflaschen sammeln** takes 15 seconds instead of 45; every bottle is worth three times as much, so a round
  pays about the same. Bottle quests and the Flaschensammler achievement need fewer bottles.
- **Pakete ausliefern** is easier: the marker swings slower and stays one clear bar, the delivery windows are wider,
  and a good drop pays a little more.

## [0.0.1] — Release (23 Nov 2026)

The first full version. From here on every update counts up by one: 0.0.2, 0.0.3, …

### Added

- **Guided tutorial:** Mama now marks the exact thing to click, first the menu entry, then the button, and dims the
  rest of the page until the step is done. It can no longer be skipped. Every new feature's first tour does the same:
  each step lights up the part of the page it explains.

### Changed

- **Stil is now called Cosmetics.**

### Fixed

- On the live server, selling cards (duplicates, a single card, the bulk after opening) failed with "Ungültige
  Anfrage."; Mama's selling step got stuck on it.
- The Upgrades page left big gaps between its boxes; in the Skillbaum, texts ran into the buttons.
- Mama's last step sometimes had no quest ready to claim; reaching it now finishes one.

## [0.0.1-alpha_12] — Feinschliff (23 Nov 2026)

The last alpha before 0.0.1: explained, balanced, polished.

### Added

- **Hilfe & Lexikon** in the Start menu: the rules in plain words and a searchable TCG-Lexikon with 33 hobby terms.
  Every panel now has its "i".
- **Animated Grails:** the rainbow foil sweeps over every Grail and little stars twinkle on it.
- **New sounds:** a till when something sells, a sad falling line when you are outbid, a siren when someone attacks
  you, a fanfare for quests and achievements; tearing a pack crinkles first.
- **Admin console:** Server-Gesundheit (database size against the free plan, the largest tables) and Tempo (how many
  levels a day every player makes).
- **E-mail:** you register with e-mail, username and password (and the invite code) and log in with either the e-mail
  or the username. The address is not checked, nobody else sees it and the game never sends mail; change it under
  Profil → Konto. Older accounts can add one there.

### Changed

- **Balance:** quests, the stamp card and achievements give about half the EP, and from level 50 on every level takes
  a little longer. Level 100 now takes two to three weeks of active play.
- Quests you cannot do are no longer handed out (a finished set, all upgrades bought), and the quest list shows the
  EP you really get.
- **Fair play:** second accounts are allowed but barely help. Cardmarket prices between players stay within
  50–200 % of the Marktwert, company prices within 50–300 % of the fair price, a private loan is at most a day of the
  borrower's income and only one runs at a time, what you can receive as gifts or lopsided trades is capped at two
  hours of your own income a day, packs give EP for the first 400 a day, nobody gets more than three helps a day, and
  break spots cost at most 120 %. Every form shows its limit. The admin console shows who sends value to whom.
- One action, one sound: an action and its message no longer both play a sound.
- Faster start: pages load when you open them.
- Reduced motion also stops endless animations.

### Fixed

- A new page opened scrolled down when the last one had been.
- On phones the amounts on the stamp card ran into each other.

## [0.0.1-alpha_11] — Mogul (23 Nov 2026)

The endgame and the reason to start again.

### Added

- **Der Exit** (level 100): sell the empire for Empire-Sterne (10 per exit plus the root of what you give up in
  millions). Level, money, upgrades, skills, bunker, company and home start over; first finish what is still
  running (listings, parcels, grading, loans, battles). Named ranks from Kleinunternehmer to Weltherrscher.
- **Empire-Perks** bought with Sterne, kept forever: more wage, bunker yield, EP, Pack-Glück, a bigger start capital
  and a more generous Oma.
- **Omas Dachboden:** after an exit your cards and sealed product wait there, count for net worth and goals, and
  come back worth a part of a day's income per day.
- **Achievements:** 63 achievements with almost 200 tiers across every part of the game, with new titles.
- **Streaming** (level 45): go live while opening packs; viewers, donations (capped per day), Followers and one
  sponsor deal a day.
- **Luxus** (level 55): cars, watches, yachts and jets with tiny permanent bonuses, shown on the profile and in a
  new Luxus toplist.
- **Höhle der Löwen** (level 60): a weekly pitch for your company; take cash for a share, the Löwen get their cut
  of every payout.
- **Megaprojekte** (level 65): the whole server donates for BER, Stuttgart 21, Schalke and Elbphilharmonie II, one
  after another, each with a bonus for everyone; the top donors go on the plaque.
- **Museum:** the admin auctions 1-of-1 trophies; the winner enters the Hall of Fame.

### Changed

- eBay-Auktionen are planned for after 0.0.1.

## [0.0.1-alpha_10] — Risiko (22 Nov 2026)

The world happens to you, and you happen to your friends.

### Added

- **Events:** every day at midnight a **Tagesereignis** for everyone (Glücksrausch, Kiosk-Rabatt, Freitag der 13. …),
  small random events on the market and for you personally (Oma, GEZ-Brief, Opas alter Ordner …), and three
  **Highlight-Events** a week, announced in the headlines (Doppel-EP-Abend, God-Pack-Nacht, Mega-Restock, Die Blase
  platzt …). All on the home page with countdowns.
- **Schattenwirtschaft** (level 35, only against players from level 35): Bunker knacken, beim Finanzamt anschwärzen,
  1-Stern-Bewertung, Abwerben and Gerüchte that move a card's price. Every action is one roll: base chance plus your
  **Angriff** (every Schlitzohr skill) minus the victim's **Abwehr** (new upgrade ladders: Steuerkanzlei,
  Rechtsschutz, Betriebsklima, Faktencheck, Prüfgerät; Wachhund Rex guards the bunker). Blocked attacks cost a fine,
  half of it goes to the defender as Schadenfreude. Cooldowns, two successes a day per victim, a daily loss cap,
  and 24 hours of cheaper **Rache** for every victim. Everything lands in the headlines and in your **Akte**.
- **Präparierte Booster:** open your boosters, keep the cards, glue them shut again. Only in Direkthandel can you
  pass them on; whoever opens one finds bulk, unless their Prüfgerät catches you. Sell them any other way and the
  buyer protection makes you pay.
- **Kredit platzen lassen** (level 35): keep a friend's money right away. Schufa, Ruf and honour included.
- **Adventskalender** from 1 December: one door a day until Christmas Eve.
- **Sonntags-Flohmarkt:** every Sunday Flohmarkt-Horst puts cheap cards into the Kleinanzeigen, with all the usual
  risks.
- **Bares für Rares** (level 28): once a day bring a hit or a slab to the studio. The expert appraises, three
  dealers bid, and one of them always bids 80 €.

### Changed

- eBay-Auktionen move to the next update.

## [0.0.1-alpha_09] — Firma (22 Nov 2026)

The business sim: your own grading company.

### Added

- **Gewerbeanmeldung** (level 30): application, waiting time and the Passierschein A38 through the Amt's corridors,
  then founding with name, slogan and a slab label in your colours with an 8×8 emblem.
- **The company:** customers send cards, four stations (Annahme, Prüfung, Einschweißen, Versand) work them off, the
  slowest one sets the pace. Customers come by Ruf, price, market hype, marketing and queue length. The company
  runs while you are away (at half speed after 12 hours). **Wo es hakt** shows what costs money per hour and fixes
  it with one click.
- **Staff** from a new applicant pool every day (Praktikant Kevin, Rentner Heinz, Dr. Müller …) with Tempo,
  Genauigkeit and Treue; train, raise, move or fire them. **Equipment** in five levels per station, from the Lupe
  vom Flohmarkt to the KI-Scanner. **Seven legal forms** from Garagenfirma to SE.
- **Company account:** deposits are free; payouts cost 25 % Kapitalertragsteuer. The company counts in net worth.
- **Grading by friends:** other players' companies appear on the grading page. Their slabs carry the company's
  colours, emblem and name; their value follows the owner's Ruf. Owners see incoming orders.
- **VIP orders:** judge the four quality values yourself; the closer, the more money and Ruf.
- **Decision cards** (Reklamation, a bribe, the press, a smoking welder, a Betriebsrat …), **marketing**
  campaigns, the weekly **Umsatzsteuer-Voranmeldung** (or a Steuerberater), **reviews**, and **awards** for honest
  companies (TÜV, Stiftung Warentest, DIN).
- **Grauzone:** Schwarzarbeit, payouts past the Finanzamt, Gefälligkeitsgutachten and Mystery-Boxen, each with its
  own way to blow up (Zoll, Steuerprüfung, scandals that devalue your slabs, angry reviews).
- **Research** from the UG (UV-Schutz-Slab, Hologramm-Label, NFC-Zertifikat, your own Black Label) and the
  **Großhandel** (level 40): displays at the dealer price every week.
- A repaid loan now also earns Ruf.

## [0.0.1-alpha_08] — Freunde (22 Nov 2026)

Playing together, live.

### Added

- **Pack Battles** (level 16): lobbies for 2–4 players, everyone pays the same stake (the boosters' Marktwert).
  The server opens all packs at once with the same odds for everyone; all watch round by round with running
  totals, emotes and spectators. Modes: Klassisch, Krepel-Battle, Top-Karte, Jackpot, Team 2v2 and
  Freundschaftsspiel. Bots fill empty seats; what a bot wins is gone.
- **Box Breaks** (level 18): put a display on the table and sell its packs one by one; buyers watch their packs
  being opened live and keep the cards. Unsold packs stay with the host.
- **Aushelfen** (level 7): once a day per friend, take time off their grading orders and shift; both get a little
  money and EP. **Kaffee und Kuchen:** once a day per friend, both get more EP for two hours.
- **Sammelbestellung** (level 18): fill a case of six displays with friends at the wholesale price; nobody may
  take the whole case alone, six displays per week at most.
- **Privatkredit** (level 10) on a Bierdeckel: amount, interest and days; collected automatically on the due date.
  A loan that bursts costs Ruf, brings a Schufa entry and makes the headlines.
- **Ehre:** every player's record of kept and broken deals with a title from Solide to Judas, shown on the player
  list and on profiles.
- **Live updates:** chat, headlines, notifications, lobbies and battles update at once instead of every few
  seconds.

## [0.0.1-alpha_07] — Leben (22 Nov 2026)

Identity, build choices and the first big money sinks.

### Added

- **Skillbaum** (level 5): one point per level, four branches (Sammler, Händler, Unternehmer, Schlitzohr) with two
  lines each and a keystone: God-Pack-Magnet, Stammkunden, Too Big To Fail (the state rescues you once per run)
  and Der Pate (you see every Kleinanzeigen seller's minimum). Deeper skills cost more; respec costs 500 € per level.
- **Wohnen** (level 20): twelve homes from Mutti's Kinderzimmer to the Privatinsel. Each brings storage, Vitrine
  places, faster energy and furnishing slots; eight slots with five items each give small bonuses and Wohnwert.
  Moving sells the old home for half its price; Nebenkosten are charged every day.
- **Visits and Gästebuch:** other players' profiles show their home, furnishing, Vitrine and trophies; visitors
  write one entry a day.
- **Stil** (level 5): name colours, profile frames, card sleeves, binder skins, colours for the pack-opening burst
  and joke titles. Your profile picture is any card you own.
- **Toplists** Ruf, Bester Pull, Pechvogel and the **Wochenwertung**: growth since Monday in percent, gifts and
  trades between players do not count; the best three win boosters and a trophy.
- **Versicherungen** (level 10): parcels can now get lost (Versandversicherung pays them back), and players with a
  home of their own can suffer a Wasserschaden in the bulk cards (Hausrat pays).

## [0.0.1-alpha_06] — Grading (22 Nov 2026)

The gamble that multiplies value: send your best cards to the graders and pray.

### Added

- **Grading** (from level 13): inspect a hit with the **Lupe** (ranges for centering, corners, edges and
  surface), send it to **PSA**, **BGS** or **CGC** with Economy, Standard or Express service, and wait. Bulk
  cards can be inspected too; they become single copies with their own condition.
- **The graders judge differently:** PSA and CGC give the worst of the four values (and slip by one now and
  then); BGS gives half-point sub-grades and an overall grade near their average, and four perfect sub-grades
  make the rare **Black Label**.
- **The reveal:** the parcel comes back, you tear it open, drum roll, grade. Slabs show their label in the
  grader's style: PSA red, CGC blue, BGS gold, silver or black.
- **Slab values:** Marktwert × grade × rarity of the grade × the grader's brand. A 10 multiplies the value,
  the first 10s of a card most of all; below 7 the slab is worth less than the raw card. Slabs count fully in
  net worth, trades, the Cardmarket and Kleinanzeigen. NPC collectors buy slabs listed below their value.
- **Pop Report** for every card, **crack** a slab to send it again (sometimes a corner pays for it).
- **Vitrine** on your profile with three places for your best slabs and hits; other players' profiles show
  theirs.
- **Master Set** goal per set (every Holo or better as a slab of 9 or better): +2 grading slots.
- Upgrades **Prüfwerkzeug** (narrower Lupe ranges) and **Einsende-Slots**; achievements, daily and weekly
  grading quests, headlines for 10s, Black Labels and expensive disasters.
- **Minijobs Echt oder Fake?** (level 18, Cardmarket) and **Grading-Praktikum** (level 24, PSA), each with
  shifts; a good round sharpens your eye for fakes in Kleinanzeigen or your Lupe for three hours.

### Changed

- Buy orders on the Cardmarket are filled with raw cards only; the binder sells raw cards only.

## [0.0.1-alpha_05] — Vier Spiele (22 Nov 2026)

All four games are in, each with its own look.

### Added

- **Yu-Gi-Oh! Legend of Blue Eyes White Dragon** (86 cards), **One Piece OP-01 Romance Dawn** (89) and
  **Riftbound Origins** (89): their own card frames, boosters (9, 12 and 14 cards) and displays of 24 boosters.
  Every card is drawn; the Ultra and Grail cards are full-art heroes (Grails: Blauäugiger w. Drache,
  the black-and-white manga Shanks, Ahri).
- **Starter choice:** Mama's first message asks for your favourite game; its licence is free and Opa's booster
  and every reward booster come from it.
- **Händlerlizenzen:** the other games open at levels 10, 20 and 28 for a small fee. Kiosk and stores only sell
  licensed games; the markets, Kleinanzeigen and trades are open to every game.
- **Sammelziele:** all Holos of a set, the complete set, and themed goals (all five Exodia pieces, the three
  Basis-Set starters, the whole Strohhut crew, all six runes). Each pays a small permanent bonus.
- **Sammlung** with a tab per game and the goals of each set.
- New achievements and titles per game (Herz der Karten, König der Spiele, Piratenkönig, Herausforderer …),
  Grail headlines and live-chat lines that fit the game being opened.

## [0.0.1-alpha_04] — Flip (22 Nov 2026)

The market is alive: prices move, NPC traders compete with you, stores run out, and your friends can
trade with you, chat with you and overtake you on the toplists.

### Added

- **Marktwert** for every card and sealed product, updated every five minutes: hype per game, supply and
  demand, daily limits, price charts (day, week, month, all).
- **Cardmarket** (from level 10): fixed-price listings and buy orders with money held in escrow, parcels
  that take a few minutes, a 5 % seller fee, seller pages, ten places (more with the Verkaufsfläche upgrade).
- **NPC traders:** Scalper-Sven empties stores and flips on the Cardmarket; collectors, investors and a bulk
  buyer trade with you; Kevin (12) pays too much.
- **Stores** (from level 4): Müller and Smyths restock at fixed times with stock shared by everybody,
  limits per player, closed on Sundays; the Würfelbude keeps a weekly allocation that grows with your Ruf.
  **Displays** with 36 boosters. **Lager** (from level 18): stores only sell you what you can store.
- **Kleinanzeigen** (from level 4): attic finds, normal sellers and dreamers; haggle, get blocked, buy
  fakes or bent cards, sellers who vanish after payment. Your own ads are free; Lars lowballs, Kevin
  overpays and his mum may book it back.
- **Toplisten:** Vermögen, Level, Bargeld and Sammlung, with 40 NPC tycoons who grow every day (you can
  hide them) and "noch X bis Platz N". Overtakes make the news.
- **Net worth** now counts everything you own at Marktwert, also listed, shipped or advertised cards; the
  home page shows its last seven days.
- **Tausch and gifts** (from level 10): offer goods and money to a friend, both sides confirm; gifts and
  lopsided trades are free up to a daily allowance, above it 20 % Schenkungssteuer. New accounts wait an
  hour.
- **Spieler** page with who is online; **Stammtisch** chat with card links and emotes; KARTEN-BILD now
  reports big deals and the day's biggest price moves.
- **Admin console:** set phases (out of print, reprint), instant restocks, invite code, live balance
  values, money flow, players, compensation and announcements.

### Changed

- **New look "Nachtschicht":** dark glass panels on soft colour glows, a floating sidebar with every page,
  stats as pills that explain themselves on click, your level as a ring around your avatar, page search
  with Strg+K, and KARTEN-BILD as a news button. The home page shows your last big pull, net worth, the
  next step, the bunker, quests, the Stempelkarte and the latest headlines at a glance. Cards and boosters
  look exactly as before.

### Fixed

- Unlock messages named some features by their internal key ("Neu freigeschaltet: cardmarket"); they now
  use the real name.

## [0.0.1-alpha_03] — Grind (22 Nov 2026)

There is always something to do now, and something keeps running while you are away.

### Added

- **Tagesquests** (from level 2): five a day, new at midnight, one free reroll per day, a bonus for all
  five. **Wochenquests** (from level 13): five per week, new on Monday, a chest with three boosters for
  all five. "Hin" takes you straight to where a quest gets done.
- **Stempelkarte** (from level 2): stamp once a day for a little more money each day and a booster on day
  7; a weekly joker catches up one missed day.
- **Geldbunker** (from level 3): fills with money on its own, offline too, until it is full. Four upgrade
  tracks: Ertrag, Kapazität, Zinsen (a bonus when you empty it at least 90 % full) and Sicherheit. Seven
  stages from Sparschwein to Geldspeicher.
- **Upgrades** (from level 5): nine upgrades for opening, work, progress and the bunker; each shows
  "jetzt → danach", income upgrades also when they have paid for themselves.
- **New minijobs:** Regale einräumen bei Müller (level 3), Karten sortieren in der Würfelbude (level 6),
  Pakete ausliefern für DHL (level 10).
- **Schichten** (from level 7): 15 minutes to 8 hours, running while you do other things; check in every
  30 minutes for more pay; ranks from Aushilfe to Filialleitung pay more per hour.
- **Snacks and the Pfandautomat:** Döner (lots of energy, but Fettfinger: fresh hits get worse surfaces
  for 10 minutes), Club-Mate and Kaffee at the Kiosk; Pfandbons from quests buy Energie-Bon, Lern-Bon,
  Glücks-Bon and a Kiosk-Gutschein. Running effects sit as icons in the top bar.
- **Profil:** statistics, 18 achievements with tiers, and titles to wear next to your name.
- **Gefahrenzone:** reset your account to a fresh start (once per 24 h) or delete it for good; type your
  name and hold the button.
- **Willkommen zurück:** after ten minutes away you get a summary and collect bunker and finished shift
  with one click.
- **Neu freigeschaltet:** every feature a level unlocks gets a NEU badge in the menu and a short tour
  from Mutti on its page.

### Changed

- Quests, stamps and achievements pay EP relative to your level, so they stay worth it all the way up.
  Level-up money is a little smaller in return.

## [0.0.1-alpha_02] — Rip (22 Nov 2026)

The first real gameplay: earn a little, buy boosters, rip them, collect, sell.

### Added

- **Pokémon Basis-Set** with all 90 cards: Glurak, Turtok, Bisaflor and Mewtu in full detail, every other
  card from the new reusable card model. One card back for every card in the game.
- **Kiosk am Eck:** boosters ×1 / ×5 / ×10, 10 % Kioskzuschlag, daily limit.
- **Booster öffnen:** tear the pack, reveal card by card, suspense on the hit slot (longer the rarer),
  flashes and particles for hits, a fake live chat that roasts your pulls, ×5 / ×10 in one go, and
  **Sofort aufdecken** for the impatient. Summary with verdict, profit or loss, top hits and bulk sell.
  God Packs, Doppel-Hits and Pech-Schutz exist. Exact odds behind the "i" in the shop.
- **Sammlung:** binder for the set with filters, progress, value, card detail with tilt and foil.
- **Kartenladen-Ankauf:** sell single cards or all duplicates at 60 % of the value.
- **Levels:** every level pays money, every fifth a booster; level-up celebration; **Level-Pfad** shows
  what each level brings.
- **Pfandflaschen sammeln:** 45-second minijob for money, EP and Pfandbons; costs energy.
- **Mini-Quests:** always three, endless, every tenth gives a bonus booster.
- **Mamas Tutorial:** Opa's booster, the first steps through the game; skippable after step 3.
- **Big pulls** (Ultra, Grail) are announced to everyone and land in KARTEN-BILD.
- Slab frames for PSA, BGS, CGC and player companies (used from the grading update on).

### Changed

- Prices follow the new price scale: a booster costs 100 € (110 € at the Kiosk).

## [0.0.1-alpha_01] — Fundament (22 Nov 2026)

The foundation: no gameplay yet, but a real, running game shell.

### Added

- **Login:** register with username, password and the shared invite code; the first account sets the code
  and becomes admin. Sign in from any browser, sign out, account lock after too many wrong passwords.
- **Server core:** players, money with a full ledger, levels 1–100 with EP and skill points, the
  Preisniveau (daily, tied to the group's progress), notifications, news feed, the server tick with daily
  reset at 00:00, and automatic clean-up of old data.
- **App shell:** sidebar with every planned area (locked ones show their level, unfinished ones say
  "Bald"), top bar with money, level, Ruf, energy and Preisniveau, the KARTEN-BILD feed, start page.
  Every stat has an "i" that explains it.
- **Look and sound:** dark pixel-framed design, 56 pixel icons, sound effects generated in code, settings
  for volume and reduced animations.
- **Card art pipeline:** cards, card backs, boosters and slabs are drawn by code. Quality sample: Glurak
  (Grail) and Turtok (Ultra) in full detail, three lower-tier cards plus the red-cheeks Pikachu, a
  Glurak booster, and PSA-, BGS- and CGC-style slabs.
- **Operations:** local mode (the whole game runs in one browser for development), automatic tests,
  database migrations and a daily keep-alive for the free Supabase plan, setup guide `docs/SETUP.md`.

## [Unreleased]

### Planning

- Complete project plan: game design, economy, architecture, data model, art direction, humour bible
  and decision log under `docs/`.
- Curated card lists for the four launch sets under `docs/sets/`: Pokémon Basis-Set, Yu-Gi-Oh! Legend of
  Blue Eyes White Dragon, One Piece OP-01 Romance Dawn, Riftbound Origins.
- Roadmap with twelve alpha milestones up to release 0.0.1.
- Guides for coding agents (`AGENTS.md`, `CLAUDE.md`) and the list of open questions for the owner
  (`USER_QUESTIONS.md`).

- Owner decisions of 21 Nov 2026 worked into the plan: level 100 in 2–3 weeks, own price scale (booster
  100 €) with a slow server-wide Preisniveau, blockable attacks (Abwehr upgrades vs. Angriff skills),
  one shared invite code, first account is admin, daily reset at 00:00, daily and highlight events,
  darker tone, Gefahrenzone (account reset and deletion), multi-pack opening with instant reveal from
  level 1, pixel art concentrated on cards and products.

No game code exists yet. Coding starts with the owner's go for alpha_01.

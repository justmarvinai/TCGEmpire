# TCGEmpire — Game Design Document

> Status: **PLAN, not yet approved.** Nothing here is implemented. Numbers are starting values that the
> balance simulation (see `ECONOMY.md` §12) will tune. Open choices are collected in `/USER_QUESTIONS.md`;
> wherever this document says **(Q-n)**, the stated behaviour is the recommended default for that question.

Documents are written in English. Everything the player reads in the game is **German**; German in-game
terms are used here as proper names (Geldbunker, Ruf, Firma …).

---

## 1. Vision

**Vom Pfandflaschen-Sammler zum Karten-Mogul.**

You start broke in your Kinderzimmer at Mutti's place with 20 € Taschengeld, a booster from Opa and a
dream. You rip packs, flip cards, scalp restocks, send cards to PSA, open your own grading company, move
out (finally, says Mutti), and build a trading-card empire — together with and against your friends.

TCGEmpire is a private, German, desktop-first multiplayer browser game for one friend group:
an **incremental business sim** with idle elements, a living card market and a lot of humour.

### Design pillars

| # | Pillar | What it means in practice |
|---|--------|---------------------------|
| 1 | **Rip** | Opening packs must feel fantastic: tear, reveal, suspense, sound, fireworks, bragging rights. |
| 2 | **Flip** | A real market: prices move, sets go out of print, players and coded NPC traders compete. |
| 3 | **Build** | Own a grading company and run it like a business: staff, equipment, reputation, scandals. |
| 4 | **Always one more thing** | Every level gives something. There is always a visible next unlock, upgrade or goal. |
| 5 | **Idle respects your time** | Bunker, shifts, grading queues, company and listings keep working while you are away — with caps. |
| 6 | **Friends make it funny** | Help, trade, battle, betray. Everything notable lands in a tabloid-style feed. |
| 7 | **Risk is real** | You can lose money: crashes, fakes, bad grades, fines, heists. Never everything, never unexplained. |
| 8 | **Explained in one sentence** | Every mechanic has an "i" that explains it in plain German. The UI always states causes. |

### What it is not

- No real money, no purchases, no ads. Ever.
- No card-vs-card battling. We simulate the *hobby and the business*, not the games' rules.
- No LLM behind NPCs. All NPC behaviour is deterministic code with seeded randomness.
- No public game. Invite-only, not indexed, real brand and person names are used as private parody
  (rules for that: `HUMOR.md` §2).

---

## 2. The player's journey

| Phase | Levels | You are… | Main activities | New systems |
|-------|--------|----------|-----------------|-------------|
| **Schulhof** | 1–7 | a kid with Pfandflaschen | Minijobs, first packs, sell to the Kartenladen, quests | Packs, Sammlung, Minijobs, Geldbunker, Kleinanzeigen, Upgrades |
| **Flohmarkt** | 8–19 | a hobby trader | Cardmarket trading, restock runs, grading, pack battles, first flat | Cardmarket, Schichten, Grading, Pack Battles, Sealed, Wohnen, Auktionen |
| **Gewerbe** | 20–49 | a business owner | Run the grading company, wholesale, streaming, dirty tricks | Firma, Großhandel, Schattenwirtschaft, Streaming, Bares für Rares |
| **Mogul** | 50–99 | a tycoon | Company expansion, luxury, megaprojects, museum auctions | Megaprojekte, Museum, Luxus, Franchise |
| **Exit** | 100 → Prestige | a legend | Sell the empire, restart stronger, chase master sets | Prestige, Empire-Perks |

Target pace (Q-6): an active player (2–3 h per day plus idle) reaches level 10 on day 1, level 20 in
about 4 days, level 50 in about 2.5 weeks and level 100 in about 6–7 weeks. Each prestige run is faster.

### Session structure

| Time scale | What happens |
|------------|--------------|
| Seconds | Open a pack, play a minijob round, snipe a listing, collect the bunker. |
| Minutes | Mini-quests (endless), haggle on Kleinanzeigen, a pack battle, a shift check-in, a restock run. |
| Session | "Willkommen zurück" recap → collect idle earnings → daily quests → spend → set up the next idle block. |
| Day | 5 daily quests, Stempelkarte, store restocks at fixed times, company daily report, feed drama. |
| Week | Weekly quests, Wochenwertung (league), Sunday Flohmarkt, market cycle, admin-triggered happenings. |
| Weeks | Sets going out of print, company stages, housing ladder, prestige. |

**"Willkommen zurück"**: on return after ≥ 10 minutes the game shows one recap sheet: what the bunker,
shift, company, listings, grading orders and events did while you were away, with one **Alles einsammeln**
button. This is the idle game's main reward moment and gets full juice.

**Start screen rule:** the home page shows at most four things: status (net worth, level), **exactly one
"Als Nächstes" recommendation**, things to collect, and the live feed. Everything else lives on its page.

---

## 3. Currencies and stats

| Name | Type | Earned by | Spent on / effect |
|------|------|-----------|-------------------|
| **Geld (€)** | Main currency | Everything | Everything. Stored in cents. |
| **EP / Level** | Progress, 1–100 | Almost every action | Unlocks features, +1 Skillpunkt per level, level rewards. |
| **Skillpunkte** | Build currency | Level-ups, some weekly quests and achievements | Skill tree (§12). Respec costs money. |
| **Ruf** | Reputation, 0–1000, shown as ★ 0.0–5.0 with review count | Honest business, fast service, kept deals | Customer flow, slab brand premium, NPC offers. Shady actions and scandals reduce it. |
| **Pfandbons** | Small side currency | Endless mini-quests, minijobs, recycling bulk cards | Pfandautomat shop: consumables, small boosts, simple cosmetics. Keeps mini-quest rewards out of the € economy. |
| **Empire-Sterne** | Prestige currency | Prestiging (§20) | Permanent Empire-Perks. |
| **Energie** | 0–100, regenerates | Time, Döner / Club-Mate / Kaffee | Limits minijob rounds only. Nothing else in the game costs energy. |
| **Follower** | Audience size | Streaming pack openings | Stream income, sponsor deals (§17). |

Net worth (**Vermögen**) = cash + bunker content + market value of cards, slabs and sealed
+ company value + 50 % of housing and decor. Used for the main toplist.

---

## 4. Cards, sets and sealed product

### 4.1 Games and sets in 0.0.1

| Game | First set | In-game set size | Packs per display | Booster UVP |
|------|-----------|------------------|-------------------|-------------|
| Pokémon | Basis-Set (Base Set, 1999) | 90 | 36 | 4,99 € |
| Yu-Gi-Oh! | Legend of Blue Eyes White Dragon (2002) | 86 | 24 | 3,99 € |
| One Piece Card Game | OP-01 Romance Dawn (2022) | 89 | 24 | 4,99 € |
| Riftbound (League of Legends TCG) | Origins (2025) | 89 | 24 | 4,99 € |

Full curated card lists with tier mapping, German names, art briefs and real-world lore: `docs/sets/*.md`
(overview and pack odds: `SETS.md`). No beloved card is cut; set sizes stay within 30–100.

German card names are used where an official German print exists (Pokémon, Yu-Gi-Oh!: *Glurak*,
*Blauäugiger w. Drache*); One Piece and Riftbound use the official English names (Q-9).

### 4.2 Rarity tiers

The game uses its own seven tiers for every game and set:

| Tier | Colour language | Share of a set | Role |
|------|-----------------|----------------|------|
| **Common** | grey | ~36 % | Bulk. Energy and rune cards are the running joke. |
| **Uncommon** | green | ~25 % | Bulk plus a few playable favourites. |
| **Rare** | blue | ~15 % | The guaranteed slot of every pack. |
| **Holo** | cyan prism foil | ~12 % | The classic shiny hit. |
| **Alternative** | violet foil, alternate artwork | ~6 % | Second, different artwork of a fan favourite. |
| **Ultra** | gold foil, full art | ~4 % | The big chases. |
| **Grail** | animated rainbow-gold, full art | 1 (max 2) per set | The card everybody wants (Glurak, Blauäugiger w. Drache, Manga-Shanks …). |

A Grail pull is a server event: full-screen celebration, broadcast to everyone online, headline in the feed.

### 4.3 What a card is (data model in player terms)

- **Bulk cards** (Common, Uncommon, Rare) are stacked: "Glumanda ×14".
- **Hits** (Holo and above) are **individual copies**. Each copy has four hidden quality values —
  **Zentrierung, Ecken, Kanten, Oberfläche** (1–10) — rolled when the pack is opened. They decide the grade
  the card can get (§8). A bulk card becomes an individual copy the moment you decide to grade it.
- A graded copy is a **Slab**: grader, grade, certificate number, and it appears in the public
  **Pop Report** ("PSA 10: 3 Stück im Spiel").
- Hidden flags exist for the dark side: **Fälschung** (fake, from shady NPC sellers) and for sealed product
  **gewogen** (weighed) and **resealed** (§16).

### 4.4 Sealed products

| Product | Content | Notes |
|---------|---------|-------|
| **Booster** | 9–14 cards depending on the game | 2–3 pack artworks per set; the artwork is cosmetic. |
| **Display** | 24 or 36 boosters | Guaranteed minimum hits per display, so a sealed display is worth more than its loose packs. |
| **Case** | 6 displays | Wholesale only (from level 28). |
| **Special products** | e.g. Themendecks, Starter Decks | Later alphas / later sets, listed per set file. |

Sealed can be **opened**, **held** as an investment, **sold** or **traded**. Opening a display gives you its
boosters; you can stop any time and keep the rest sealed.

### 4.5 Set lifecycle (admin-controlled)

```
Angekündigt → Vorbestellung → Im Druck (Restock-Wellen) → Letzte Welle → Out of Print → Vintage
```

- No set enters or leaves a phase by itself. The admin (the owner, in the in-game admin console or together
  with Claude in a session) triggers every transition (Q-17). New sets are added by a code/content update.
- **Im Druck:** stores restock on a schedule. Supply keeps growing, singles drift down towards a floor.
- **Out of Print:** stores sell out and never restock. From now on every opened pack shrinks the remaining
  sealed supply for good. Sealed and singles rise with scarcity and time (`ECONOMY.md` §4).
- **Reprint** is an admin event too (and a risk for investors — rumours about it are an event type).

### 4.6 Pack structure and luck

Each booster has filler slots (Common/Uncommon) and one **Hit-Slot** that always holds at least a Rare
and can upgrade to Holo / Alternative / Ultra / Grail with set-specific odds (starting values:
Holo 1:5, Alternative 1:24, Ultra 1:72, Grail 1:720 — auto-calibrated per set so that the average pack
is worth about 72 % of its price). The larger One Piece and Riftbound boosters have one extra fixed Rare
slot. Exact structure per set: `SETS.md`.

- **Pech-Schutz (pity):** an invisible counter raises hit odds slightly after a long dry streak.
- **Doppel-Hit** and the very rare **God Pack** (every card Holo or better) exist as jackpot moments.
- Odds are public: every pack has an "i" with the exact chances and what you still miss.
- **Pack-Glück** bonuses (skills, upgrades, events) multiply hit odds and are capped (max +50 %).

---

## 5. Pack opening (the core dopamine loop)

The server decides the pack's content the moment you confirm; the client only replays. Closing the tab
loses nothing. Skip is always available.

1. **Pick.** Pack floats in 3D tilt with foil sheen. Counter 1 / 5 / 10 (bulk sizes are upgrades).
2. **Tear.** Drag across the top to rip the foil (or press Space / click). Crinkle sound, light burst.
3. **Reveal.** Cards come as a stack. Click / Space / drag to flip through. Bulk goes fast.
4. **Suspense on the Hit-Slot.** The last card waits face down. Its glow leaks the tier colour, the pack
   shakes, a charge sound rises. Tiers escalate: Holo (short), Alternative, Ultra (screen shake, flash),
   Grail (blackout, heartbeat, white flash, rainbow beams, fanfare, value counts up).
5. **Summary.** Pack value vs. price with a verdict line ("Müll.", "Geht so.", "BANGER!"), new-card badges,
   quality hint for hits, buttons: *Alles behalten*, *Bulk verkaufen*, *Nochmal*.

Extras that make it a game:

- **Fake Twitch chat** next to the opening reacts to your pulls ("L", "W", "OMEGALUL", "Scam!",
  "Glurak wann?"). When streaming is unlocked this chat becomes income (§17).
- **Fettfinger:** eating a Döner refills energy but gives a 10-minute Fettfinger debuff — hits opened during
  it roll worse Oberfläche. Upgrade "Baumwollhandschuhe" removes it.
- **Bulk opening** (×10, later ×36 display mode): summary leads with profit/loss, top hits as a highlight
  reel, value-sorted grid.
- **Auto rules** (upgrades): auto-sell Commons you own ≥ 4 times, auto-sleeve hits.
- Every reveal has keyboard control; all effects respect "Animationen reduzieren".

---

## 6. Collection (Sammlung)

- **Ordner (binder) per set**: every card in set order, missing cards greyed with their number, duplicates
  as ×N, value under each card, filters (tier, owned/missing, graded), sort, bulk-select mode.
- **Card detail**: large tilt view with foil, price chart, Pop Report, your copies with quality hints,
  actions (sell, list, grade, put in Vitrine).
- **Set goals** give permanent, capped account bonuses:
  - *Tier complete* (e.g. all Holos of the Basis-Set),
  - *Set complete* (one of each card),
  - *Master Set* (every Holo+ as a slab of grade 9 or better).
- **Themed goals** with jokes: all five Exodia pieces ("Du hast automatisch gewonnen. Nichts. Aber
  gewonnen."), all three Basis-Set starters' final evolutions, the whole Strohhut crew.
- **Vitrine**: a few display slots on your profile and at home. Displayed slabs give Ruf and prestige with
  visitors — and can be stolen in a burglary if you have no security (§16).
- **Lager**: capacity for cards and sealed comes from housing (§14). Over capacity you cannot buy more
  sealed until you sell, open or rent a Lagerbox.

---

## 7. Markets

Four venues with different rules. Each is a real, named platform parody with its own humour.

| Venue | Unlock | Counterpart | Fee | Character |
|-------|--------|-------------|-----|-----------|
| **Kartenladen-Ankauf** | 1 | NPC shop | — (pays ~60 % of value) | Instant, safe, bad price. "Ich muss ja auch von was leben." |
| **Kleinanzeigen** | 4 | NPC private sellers and buyers | 0 % | Bargains, haggling, lowballers, fakes, no protection. "Was letzte Preis?" |
| **Cardmarket** | 8 | Players and NPC traders | 5 % seller fee | Listings and buy orders, buyer protection, price charts. The main market. |
| **eBay-Auktionen** | 18 | Players and NPC bidders | 10 % | Timed auctions for high-end items, sniping, bidding wars. |
| **Direkthandel** | 8 | A specific player | Gift tax above an allowance | Trade window; both confirm. Basis for helping and for deals between friends. |
| **Bares für Rares** | 22 | NPC dealer panel | — | Once per day: expert appraisal, then dealers bid. One of them always bids 80 €. |
| **Sonntags-Flohmarkt** | 14 | NPC stalls | 0 % | Every Sunday: random bargains and junk boxes, haggling. |

### 7.1 Market value (Marktwert)

Every card (ungraded) and every sealed product has one **Marktwert**, updated by the server every few
minutes from: base value × set scarcity × market cycle (Hype-Index) × card-specific hype × recent buy/sell
pressure. Slabs derive their value from the raw value, the grade, the Pop Report and the grader's brand.
Full model: `ECONOMY.md` §4. The Marktwert drives NPC behaviour, net worth, instant-sell prices and charts.
Actual player-to-player prices are free.

### 7.2 Kleinanzeigen

- A feed of NPC ads that refreshes over time: attic finds ("Dachbodenfund, keine Ahnung was die wert
  sind"), overpriced dreamers ("Glurak 5.000 € VB, weiß was ich hab"), bundles, and occasional scams.
- **Haggling** is a small game: you send an offer; the seller's patience and stubbornness decide whether
  they accept, counter or block you ("Für 20 € steh ich nicht mal auf"). Händler skills improve it.
- **Risks:** fake cards, "Karte hatte doch einen Knick" (quality lower than stated), seller ghosts you
  after payment (small chance, refunded only with the "PayPal Käuferschutz" upgrade).
- You can post your own ads; NPC buyers write in with offers — including lowballers and **Kevin (12)**, who
  pays too much with Mama's credit card and sometimes causes a chargeback.

### 7.3 Cardmarket

- Listings (fixed price), buy orders ("Gesuche"), price history chart, cheapest-listing view, seller Ruf.
- NPC traders list their own stock and buy listings they consider cheap (§18). Players compete with them.
- Listing slots are limited and grow with upgrades. Sold items are paid out after "Versand" (a short
  timer; shipping can be insured — uninsured parcels can get lost or damaged by event).
- **Käuferschutz:** a buyer who received a fake or resealed product can report it → refund, and the
  seller loses Ruf. This is what makes Cardmarket safer than Kleinanzeigen and Direkthandel.

### 7.4 Auctions

- Listing an auction costs a small fee; duration 1 h / 6 h / 24 h; anti-snipe extension of 30 s.
- NPC whales take part based on the item's value and current hype. Auctions are announced in the feed.
- **Museum auctions** (from level 50): the admin can put unique **1-of-1 trophy cards** up for auction
  (e.g. *Pikachu Illustrator*). They are the game's most tempting money sink (§15).

### 7.5 Retail: the restock run

In-print sealed product is bought at UVP in **stores** — and stock is limited:

| Store | Flavour | Mechanic |
|-------|---------|----------|
| **Kiosk am Eck** | Always open, tiny range, slightly overpriced | Small personal daily allowance. Also sells Rubbellose, Club-Mate. |
| **Müller** | "Maximal 2 pro Kunde" | Shared stock, restock twice a day, per-customer limit. |
| **Smyths Toys** | Big deliveries, queue at the door | Shared stock, one big restock per day, first come first served. |
| **Kaufland** | Random pallets | Unannounced restocks (event), cheap. |
| **Pokémon Center Online** | "Sie befinden sich im Warteraum" | Queue mini-interaction; exclusive pack artworks. |
| **Local Game Store "Würfelbude"** | Fair, knows you by name | Personal allocation that grows with Ruf; preorders for new sets. |
| **Großhandel** (level 28) | Distributor account for businesses | Weekly allocation of displays and cases at EK price, based on company stage. |

Shared stock means friends and the NPC scalper **Scalper-Sven** race each other. Restock times are known
(or announced by the upgrade "Restock-Alarm"), so restocks become appointments. On Sundays stores are
closed — Sunday is Flohmarkt day.

---

## 8. Grading

Unlock: level 10. Grading turns a raw card into a slab and is the main value multiplier — and a gamble.

1. **Vorprüfung (pre-grading).** With the Lupe you inspect a copy and see ranges for its four quality
   values (e.g. "Zentrierung 8–10"). Better tools and Sammler skills narrow the ranges. Picking the right
   cards to grade is a skill.
2. **Einsenden.** Choose a grader and a service level, pay the fee, wait (real time, idle).

| Grader | Character | Speed | Brand factor on value |
|--------|-----------|-------|-----------------------|
| **PSA** | The standard. Expensive, slow, upcharges on valuable cards. | slow | 1.00 |
| **BGS (Beckett)** | Sub-grades on the label; the rare **Black Label 10** is worth far more than a PSA 10. | medium | 0.95 |
| **CGC** | Cheap and fast. | fast | 0.85 |
| **Player companies** | Your friends' (or your own) company. Fee, speed and brand depend on them. | varies | 0.40–1.10 by Ruf |

3. **Ergebnis.** The slab comes back as a sealed parcel; you reveal the grade with a drum roll.
   A 10 multiplies the value (the fewer 10s exist, the more); a 9 is solid; grades below 7 are worth
   less than the raw card. Fee and waiting time are gone either way.
4. **Afterwards.** Slabs can be sold, displayed, or **cracked** and re-submitted elsewhere (risky, costs
   the fee again). Cracking a slab from a player company that was graded too generously exposes them (§9.6).

Service levels: Economy (hours), Standard, Express (minutes), each with its own fee. A random event can
lengthen all queues ("PSA: Bearbeitungszeit aktuell 6–8 Monate" — in game time that means ×2).

---

## 9. The company (Firma)

Unlock: level 20, after the bureaucracy quest chain **"Gewerbeanmeldung"** (Passierschein A38 included).
In 0.0.1 the company is a **grading company**; the system is built so further business units (Kartenladen,
Auktionshaus, Automaten) can be added later.

### 9.1 Founding and stages

You choose name, slab label design (colours, logo from a pixel editor), and a slogan. Your label is
printed on every slab your company grades — your brand ends up in your friends' collections.

| Stage | Legal form (flavour) | Unlocks |
|-------|----------------------|---------|
| 1 | Garagenfirma (Einzelunternehmen) | 2 staff, basic tools, Economy service |
| 2 | GbR | 4 staff, marketing, Standard service |
| 3 | UG (haftungsbeschränkt) | 8 staff, research, Express service, bulk submissions |
| 4 | GmbH | 16 staff, second shift, B2B contracts with stores |
| 5 | GmbH & Co. KG | 30 staff, second site, international customers |
| 6 | AG | 60 staff, Höhle-der-Löwen investors, dividends |
| 7 | SE | endless expansion levels |

Each stage costs money and a short bureaucracy quest (Notartermin, Handelsregister, IHK-Beitrag).

### 9.2 How it earns money

Customers (NPC collectors, stores, and **real players**) submit cards. Every order runs through a pipeline:

```
Annahme → Prüfung → Einschweißen (Slabbing) → Versand
```

- Each station has a capacity from **staff × equipment**. The slowest station is the bottleneck, and the
  company page says so in words ("Engpass: Einschweißen. Ein zweites Schweißgerät bringt +38 €/h").
- **Demand** = market hype × Ruf × your prices × marketing × speed (long backlogs scare customers away).
- **Revenue** = orders finished × fee of the service level. **Costs** = wages, rent, materials, electricity.
- The pipeline runs in real time, also while you are offline (with a cap after which staff "macht Dienst
  nach Vorschrift").

### 9.3 What you actively do

- **Selbst graden:** a mini-game for VIP orders — inspect the card at zoom, judge the four quality values.
  The closer you are to the truth, the more bonus fee and Ruf.
- **Decisions** that pop up as cards: complaints, bribe offers, a journalist's inquiry, a customer whose
  card "was definitely a 10", a broken Schweißgerät, a Betriebsrat being founded.
- **Set prices and service levels**, run **marketing** campaigns (Flyer, Instagram, sponsor a YouTuber,
  Stand auf der Kartenmesse).
- **Hire and manage staff** from a daily applicant pool: every applicant has Genauigkeit, Tempo,
  Loyalität, a salary wish and a funny CV (Praktikant Kevin works for "Erfahrung"; Rentner Heinz is on
  Minijob basis; Dr. Müller is overqualified and bored). Training, raises, firing, and being poached by
  friends (§16).
- **Buy equipment** (Lupe → Mikroskop → KI-Scanner "Made in Germany", Schweißgerät, Etikettendrucker,
  Tresorraum) and **research** (UV-Schutz-Slab, Hologramm-Label, NFC-Zertifikat, own "Black Label").
- **Company health panel "Wo es hakt":** each weak point (Bekanntheit, Tempo, Genauigkeit, Preis, Team,
  Kasse) is shown with its cost in €/h and a one-click way to fix it.

### 9.4 Ruf (reputation)

Ruf is the company's lifeblood and the player's public trust score. It is shown as stars with a growing
list of generated customer reviews ("Schnelle Bearbeitung, gerne wieder!!1!", "Karte kam als 9 zurück, war
safe eine 10. 1 Stern.").

- **Up:** accurate grades, short turnaround, solved complaints, kept deals with players, awards.
- **Down:** wrong grades, long queues, ignored complaints, exposed scandals, reported scams, loan defaults.
- **Effects:** customer flow, the brand factor of your slabs (what they are worth on the market), store
  allocations, NPC offers, access to investors.
- **Awards as milestones:** "TÜV-geprüft", "Stiftung Warentest: SEHR GUT (1,3)", "DIN-Norm für Slabs".

### 9.5 Money and taxes

Company profit collects in the company account. Paying it out to yourself costs **Kapitalertragsteuer**.
Once per in-game quarter the **Umsatzsteuer-Voranmeldung** is due: do it in time (a 20-second form
mini-game) or pay a late fee. A tax advisor (staff role / skill) automates it.

### 9.6 Shady business

Tempting shortcuts with real downside (all optional, all explained by the "i"):

| Action | Gain | Risk |
|--------|------|------|
| **Gefälligkeitsgutachten** — bump a grade by +1 for a customer or friend | Bribe money; the friend's card is worth more | Each bumped slab is a time bomb: if it is cracked and re-graded elsewhere, or drawn in a random audit, the scandal costs Ruf and devalues all your slabs for a while. |
| **Schwarzarbeit** — pay staff off the books | Lower wages | Zoll-Kontrolle event: fine and Ruf loss. |
| **Steuern "optimieren"** | Keep the tax | Steuerprüfung: back payment plus penalty; friends can report you (§16). |
| **Mystery-Boxen verkaufen** ("PSA 10 garantiert*") | Sell bulk at a premium | Reviews turn sour over time. |

The system never forces shady play; an honest company is fully viable and gets the awards.

---

## 10. Jobs

Two kinds of work, both themed with real employers.

### 10.1 Minijobs (active, 30–60 s mini-games)

Cost energy, pay immediately by performance, give Pfandbons for great rounds.

| Minijob | Unlock | Game | Perk while it is your main minijob |
|---------|--------|------|-------------------------------------|
| **Pfandflaschen sammeln** | 1 | Catch/click bottles; Einweg 0,25 €, Mehrweg 0,15 €, Bierflasche 0,08 € | — |
| **Regale einräumen (Müller)** | 3 | Sort products to the right shelf under time pressure | You hear about Müller restocks 5 min early |
| **Karten sortieren (Würfelbude)** | 6 | Sort cards by tier/set fast | Better Ankauf prices |
| **Pakete ausliefern (DHL)** | 9 | Timing/route game; don't leave it "beim Nachbarn" | Faster shipping for your sales |
| **Kasse (Smyths Toys)** | 12 | Change and barcode memory | Staff discount on sealed |
| **Echt oder Fake?** (Cardmarket-Prüfer) | 16 | Spot the fake card | Fake warning on Kleinanzeigen |
| **Grading-Praktikum (PSA)** | 19 | Judge card quality | Narrower Vorprüfung ranges; prepares for the Firma |

### 10.2 Schichten (idle shifts)

Pick a job and a shift length (15 min / 1 h / 4 h / 8 h), come back and collect wage and EP. One shift at
a time. Each job has ranks (Aushilfe → Festangestellt → Schichtleitung → Filialleitung) earned through
hours worked; higher ranks pay more and unlock perks. Optional check-ins during a shift give an
"Überstunden" bonus. From level 20 you can send **staff** instead of yourself.

Job income matters early and fades into pocket money later — by design; the "i" says so.

---

## 11. Geldbunker (idle income)

Unlock: level 3 (it starts as a Sparschwein).

- Generates money **per minute**, also offline, up to a **capacity** (hours). Full bunker = no more income,
  so collecting is the heartbeat of every session. Collecting is a big, satisfying animation.
- Upgrade tracks: **Ertrag** (€/h, practically endless levels), **Kapazität** (4 h → 24 h),
  **Sicherheit** (against heists), **Zinsen** (bonus on collect when the bunker is ≥ 90 % full).
- Visual tiers: Sparschwein → Schuhkarton → Tresor → Kellerbunker → Hochsicherheitsbunker → Fort Knox →
  **Geldspeicher** (you can dive in).
- The bunker panel lists every source of passive income per hour and what would raise it.
- Only the **uncollected** bunker content can be stolen by other players (§16). Your wallet is safe.

---

## 12. Player upgrades and skill tree

### 12.1 Upgrades (money → permanent, many levels)

Groups: **Öffnen** (opening speed, bulk sizes, Pack-Glück, auto rules), **Sammlung** (binder comfort,
Vorprüfung tools), **Markt** (listing slots, fees, shipping, Restock-Alarm, allocation "Vitamin B"),
**Jobs** (wage, energy, shift length), **Bunker** (see above), **Sicherheit** (insurance, alarm, dog).
Prices grow exponentially per level; the UI always shows "jetzt → danach" and the payback time.

### 12.2 Skill tree (Skillpunkte → build identity)

One point per level (99 per run) plus bonus points; about 90 nodes, so nobody can have everything —
respec costs money. Four branches, each ending in a keystone:

| Branch | Fantasy | Examples | Keystone |
|--------|---------|----------|----------|
| **Sammler** | Luck and eye | Pack-Glück, Vorprüfung precision, set bonus strength, quality of pulled hits | **God-Pack-Chance ×3** |
| **Händler** | Deals | Fees, haggling, more and better offers, price trend preview, auction anti-snipe | **Insider:** see tomorrow's market event one hour early |
| **Unternehmer** | Scale | Company efficiency, staff, bunker, wages, tax advisor | **Too Big To Fail:** once per run the state bails you out |
| **Schlitzohr** | Dirty tricks and defence | Heist success, scam chance, detection resistance — or security, insurance, lie detection | **Der Pate:** sabotage cooldowns halved, bribes always work once per day |

---

## 13. Quests

| Type | Count | Reset | Reward size | Notes |
|------|-------|-------|-------------|-------|
| **Kapitel (story/tutorial)** | Chain | — | Unlocks, packs, money | Mutti and Opa guide you through every new system. |
| **Mini-Quests** | 3 always active, endless | Replaced instantly | Tiny: a little money, EP, 1 Pfandbon | "Öffne 3 Booster", "Sammle den Bunker ein". Every 10th gives a small bonus chest. |
| **Tagesquests** | 5 | Daily 04:00 | Medium | One free reroll per day; never impossible for your level or wallet. |
| **Wochenquests** | 5 | Monday 04:00 | Large + weekly chest (pack/display of choice) | One of them is social (trade, battle, help). |
| **Erfolge (achievements)** | ~200 in tiers | — | Titles, cosmetics, Skillpunkte at milestones | Includes joke achievements for failures ("Pechvogel", "Auf Fake reingefallen"). |
| **Sammelziele** | Per set | — | Permanent bonuses | §6. |
| **Event-Quests** | During events | — | Event rewards | §19. |
| **Stempelkarte** | 7-day login card | Weekly | Growing rewards, day 7 = booster | One free "Joker" per week so a missed day is not punished. |

All quests are data-driven (event type + filter + target + reward), check that they are doable before they
are offered, and deep-link to the page where they are solved.

---

## 14. Housing (Wohnen)

Unlock: level 15 ("Mutti: Wann ziehst du endlich aus?"). Housing is a status ladder, a money sink and has
real function: **storage capacity, Vitrine slots, energy regeneration, security and a small living bonus**.

| # | Home | Flavour |
|---|------|---------|
| 0 | Kinderzimmer bei Mutti | Free. Mutti takes "Kostgeld" from your bunker. |
| 1 | WG-Zimmer in Berlin-Neukölln | The flatmate eats your food. |
| 2 | 1-Zimmer-Wohnung in Gelsenkirchen | Cheap. Very cheap. |
| 3 | Altbauwohnung in Leipzig | Stuck, ceilings high, heating bill higher. |
| 4 | Reihenhaus in Bielefeld | Officially does not exist. |
| 5 | Einfamilienhaus mit Garten | "Schaffe, schaffe, Häusle baue." |
| 6 | Loft in der Hamburger HafenCity | |
| 7 | Villa in München-Grünwald | |
| 8 | Penthouse in Frankfurt | |
| 9 | Schloss in Bayern | |
| 10 | Finca auf Mallorca | |
| 11 | Privatinsel | |

- **Einrichtung:** each home is a pixel-art room scene with decor slots (Vitrine, Schreibtisch, Sofa,
  Wand, Teppich, Gaming-Setup, Haustier, Deko …). Every slot has many items from cheap to absurd
  (goldene Kloschüssel). Items give small bonuses and a **Wohnwert** score.
- **Besuch:** friends can visit, see room and Vitrine, sign the Gästebuch, and once a day leave
  "Kaffee und Kuchen" (small buff for both).
- Running costs (Nebenkosten) are a small recurring sink; the yearly **Nebenkostenabrechnung** is an event.

---

## 15. Money sinks and status

Tempting by design: each sink is **visible to friends** and gives a **small real benefit**.

| Sink | Examples | Why it tempts |
|------|----------|---------------|
| **Upgrades, skills respec** | §12 | Power. |
| **Housing and decor** | §14 | Capacity, comfort, flex on visits. |
| **Cosmetics** | Avatar outfits, card sleeves, binder skins, playmats, pack-opening effects, profile frames, slab label styles, titles, pets | Seen in chat, battles, toplists, and on every slab you grade. |
| **Luxus** (level 40) | Cars (Golf GTI → AMG → Lambo), watches, yacht, private jet | Shown on the profile; each gives a tiny permanent bonus; a "Luxus" toplist. |
| **Megaprojekte** (level 50) | **BER fertigbauen**, Stuttgart 21, Schalke 04 retten, Elbphilharmonie II | Whole-server donation goals that take weeks; server-wide permanent bonus on completion; donor ranking and plaque. |
| **Museum auctions** | 1-of-1 trophy cards (Pikachu Illustrator, …) | Unique, named in a Hall of Fame; the ultimate flex. |
| **Rubbellose & Lotto** | At the Kiosk | Small gambling sink with rare big wins. |
| **Running costs** | Wages, rent, insurance, fees, taxes, fines | Keep money moving. |

---

## 16. Friends: help and betrayal

Everyone on the server is in one world. Social features unlock early; the dark ones at level 25 (Q-7
sets how hard they hit; default **medium**: fun, capped, never ruinous).

### 16.1 Helping

- **Direkthandel**, gifts (daily allowance; above it **Schenkungssteuer**), **Privatkredit** with interest
  and due date, written on a virtual Bierdeckel.
- **Sammelbestellung:** pool money for a case at wholesale price and split the displays.
- **Box Break:** one player opens a display live, others buy spots (by pack number or by card type) and
  get those cards. Spectators and emotes included.
- **Aushelfen:** once per friend per day, speed up their grading order or shift; both get a small reward.
- **Stille Teilhaberschaft:** invest in a friend's company for a share of its profit.
- **Kaffee und Kuchen** on visits.

### 16.2 Betraying

Every hostile action costs money, has a cooldown, can fail, and can be defended against. Losses are capped
per day. The victim always learns *what* happened, gets a discounted **Rache** option for 24 h, and the
story lands in the feed.

| Action | Effect | Counter |
|--------|--------|---------|
| **Bunker knacken** | Steal a share of the target's *uncollected* bunker money | Collect regularly; Sicherheit upgrades; Wachhund Rex; on failure the thief pays a fine and loses Ruf |
| **Beim Finanzamt anschwärzen** | Triggers a Steuerprüfung at the target | If the target is clean, *you* pay for "falsche Verdächtigung" |
| **1-Stern-Bewertung** | Small Ruf damage to a rival company | Can be exposed; answered reviews recover Ruf |
| **Gerücht streuen** | Moves one card's price for a short time (pump or dump) | Händler skill "Faktencheck"; the rumour is unmasked after a while |
| **Abwerben** | Poach an employee with a better offer | Loyalty, raises, counter-offer window |
| **Resealed / gewogene Booster verkaufen** | Sell opened-and-reglued or weighed packs as fresh | Buyer protection on Cardmarket; none in Direkthandel ("Privatverkauf, keine Garantie, keine Rücknahme") |
| **Kredit platzen lassen** | Keep the borrowed money | Schufa entry: big Ruf loss, no new loans for a while |
| **Einbruch** | Steal one slab from the target's Vitrine (rare, expensive, hard) | Alarmanlage, insurance pays the value |

**Ehre:** every player has a public record of kept and broken deals and gets a title from it
(Ehrenmann/Ehrenfrau … Schlitzohr … Judas).

### 16.3 Pack Battles

Unlock: level 12. Lobby for 2–4 players (NPC opponents can fill seats, Q-13), 1–10 packs each from any
released set; everyone pays the same stake. The server opens all packs at once; clients replay in sync,
round by round, with running totals, emotes and spectators.

| Mode | Winner |
|------|--------|
| **Klassisch** | Highest total pull value takes **all** cards |
| **Krepel-Battle** | *Lowest* total wins |
| **Top-Karte** | Best single card wins |
| **Jackpot** | Random winner, chance proportional to pull value |
| **Team 2v2** | Combined totals |
| **Freundschaftsspiel** | Everyone keeps their own pulls; just for the show |

### 16.4 Communication

- **Stammtisch:** global chat with emotes and shareable items (link a card, slab or listing).
- **KARTEN-BILD:** auto-generated tabloid feed about everything notable ("SKANDAL! {name} verkauft
  resealed Booster an besten Freund!", "Pechvogel der Woche: 312 Booster, kein Holo").
- **Mitteilungen:** personal notification centre styled like a messenger; Mutti writes there, too.
- Optional Discord webhook for big moments (Q-19).

---

## 17. Streaming (level 30)

Go live while opening packs. Viewers come from Followers and from what you open; hits cause donation
bursts and new Followers; a boring stream loses viewers. The fake Twitch chat is now your audience.
**Sponsoren** offer deals with conditions ("Öffne 50 Booster im Stream", sponsor line shown in chat).
Streaming turns the core loop into mid-game income and gives Followers as an extra progression axis.

---

## 18. NPCs ("KI-Spieler")

All coded, no LLM. Each NPC is an **archetype** (rules + parameters) with a name, portrait, budget,
inventory, tastes and a set of German text lines.

| Archetype | Example | Behaviour |
|-----------|---------|-----------|
| Scalper | **Scalper-Sven** | Buys store stock shortly after restocks, lists at a premium. |
| Whale | **Logan Paul** (cameo), **Whale-Wolfgang** | Rarely appears, buys top slabs above value, bids in auctions. |
| Investor | **Investor-Ingo** | Hoards sealed, panic-sells in a crash. |
| Collector | **Sammler-Sabine** | Buys what she is missing at fair prices; steady demand. |
| Bargain hunter | **Letzter-Preis-Lars** | Sends lowball offers on your ads. |
| Clueless seller | **Dachboden-Doris** | Underprices attic finds; sometimes it is a fake. |
| Kid | **Kevin (12)** | Overpays; chargeback risk. |
| Bulk buyer | **Bulk-Bernd** | Buys commons by the kilo. |
| Dealer | **Händler Horst** | Flohmarkt stall, haggles hard. |
| Dealer panel | **"Bares für Rares"** cast incl. the 80-€ bidder | Daily appraisal and bidding. |
| Rivals | ~40 NPC tycoons | Sit on the toplists with slowly growing wealth so there is always someone just ahead of you (labelled as NPC, filterable). |
| Battle bots | "Pack-Peter" etc. | Fill pack battle seats on request. |
| Customers | Generated | Submit cards to grading companies, write reviews. |
| Staff | Generated | Applicants and employees of companies. |

NPCs act in the server tick with seeded randomness, limited budgets and daily activity windows, so the
market stays alive at any time of day without being an infinite money source.

---

## 19. Events

An event has a scope (global / personal), a duration, modifiers and often its own quests. The scheduler
rolls random events with cooldowns; the admin can trigger any event manually.

| Kind | Examples |
|------|----------|
| **Market (good and bad)** | Hype-Welle (+30 % on one game), **Die Blase platzt** (−40 %, slow recovery), Reprint-Gerücht, "Influencer zieht Glurak im Stream", Turnier-Wochenende, Fälschungswelle auf Kleinanzeigen |
| **Supply** | Überraschungs-Restock bei Kaufland, Lieferengpass, Zoll-Streik, Deutsche Bahn: "Verzögerungen im Betriebsablauf" (all shipping slower) |
| **Grading** | PSA-Stau, PSA-Preiserhöhung, Grading-Skandal bei einem NPC-Grader |
| **Personal luck** | Glückstag (+Pack-Glück), Opa schenkt einen alten Ordner, Steuerrückerstattung |
| **Personal trouble** | Wasserschaden im Keller (bulk damaged unless insured), GEZ-Brief, Nebenkostennachzahlung, Hermes verliert ein Paket, Kevin-Chargeback, Steuerprüfung |
| **Company** | Großauftrag, Warnstreik, Journalistenanfrage, Messe-Einladung |
| **Recurring** | Sonntags-Flohmarkt, monthly Kartenmesse weekend, weekly league end |
| **Calendar (framework in 0.0.1)** | Adventskalender, Karneval, Ostern, Sommerloch, Black Friday, Silvester (Q-18) |

Negative events are always survivable, explained, and usually insurable. An **insurance** system
(Hausrat, Versand, Rechtsschutz, Betriebshaftpflicht) is a recurring sink that reduces their damage.

---

## 20. Prestige: "Der Exit" (Q-12)

At level 100 you can sell your empire.

- **You get Empire-Sterne** based on what you earned in this run plus company value and achievements.
- **Reset:** level, money (you restart with a seed capital), upgrades, skills, job ranks, bunker, company,
  housing. Ruf carries over at 50 %.
- **Kept:** your card collection and sealed product — moved to **Omas Dachboden**. Items in the attic
  count for collection goals and net worth; to sell or trade them you bring them back into your (reset,
  small) storage. Also kept: cosmetics, titles, achievements, Followers (50 %), friends, statistics.
- **Empire-Perks** (bought with Sterne): permanent income and luck multipliers, start bonuses (start at a
  higher level, features pre-unlocked), auto-collect, larger bulk opening, extra quest slots, more store
  allocation, exclusive homes, prestige-only cosmetics and frames.
- Prestige ranks are endless and named: Kleinunternehmer → Mittelständler → Hidden Champion →
  DAX-Vorstand → Oligarch → …
- Each run should feel different: new skill build, faster early game, new perks to aim for.

---

## 21. Toplists and competition

- **Vermögen**, **Level**, **Bargeld** (the three required lists), plus **Sammlung** (completion),
  **Ruf**, **Bester Pull**, **Firmenwert**, **Luxus**, **Ehre**, and joke lists (**Pechvogel der Woche**,
  **Verräter des Monats**).
- **Wochenwertung:** weekly league on percentage growth, so latecomers can win; small rewards and a
  trophy on the profile.
- NPC rivals fill the lists (Q-13). The list always shows "noch X € bis Platz N".
- Rank changes produce feed headlines.

---

## 22. Onboarding, unlocks and help

- **Tutorial:** Mutti (messages) and Opa Günther (gifts you his old binder) lead through the first
  session with real actions: collect bottles, buy a booster at the Kiosk, open it, put cards in the
  binder, sell one, finish a mini-quest. About 3 minutes, skippable after step 3, progress stored on the
  server. It ends exactly on level 2.
- **Unlock moments:** every feature unlock shows an overlay ("Neu: Cardmarket!"), a 2–4 step mini-tour and
  a **NEU** badge in the navigation.
- **Level-Pfad:** a track that shows what every upcoming level unlocks. Locked features stay visible in
  the navigation with their level, so there is always something to look forward to.
- **"i" everywhere:** every panel, stat and price has an info icon with a two-sentence explanation and,
  where useful, a worked example with live numbers. Pages have a "So funktioniert's" drawer.
- **TCG-Lexikon:** glossary of hobby terms (PSA, Slab, OOP, Pop Report, Scalper …) written with humour.
- Rules: one recommended next step on the home page; errors say what to do; no dead stats.

### Feature unlocks by level

| Lv | Unlock | Lv | Unlock |
|----|--------|----|--------|
| 1 | Kinderzimmer, Pfandflaschen, Kiosk, Pack-Opening, Sammlung, Mini-Quests, Stammtisch, Toplisten | 18 | eBay-Auktionen |
| 2 | Tagesquests, Stempelkarte | 20 | **Firma** |
| 3 | Geldbunker | 22 | 4. TCG-Lizenz, Bares für Rares |
| 4 | Kleinanzeigen | 25 | Schattenwirtschaft (heists, sabotage, shady deals), insurance |
| 5 | Upgrades, Skillbaum | 28 | Großhandel (displays and cases at EK) |
| 6 | Schichten (idle jobs) | 30 | Streaming |
| 8 | Cardmarket, Direkthandel, 2. TCG-Lizenz | 35 | Firma: research, second site |
| 10 | Grading, Wochenquests | 40 | Luxus |
| 12 | Pack Battles | 45 | Höhle der Löwen (investors) |
| 14 | Lager, displays, Sonntags-Flohmarkt | 50 | Megaprojekte, Museum auctions |
| 15 | Wohnen (move out), 3. TCG-Lizenz | 60 / 75 / 90 | Company stages 5–7, top homes and luxury tiers |
| 16 | Box Breaks, Privatkredit | 100 | **Prestige (Exit)** |

Every level in between gives at least one smaller unlock (a new job or rank, store, home, decor line,
upgrade tier) plus a level reward.

**TCG licences (Q-10):** at the start you pick your favourite of the four games and get a starter bundle
for it. The other three unlock as "Händlerlizenzen" at levels 8, 15 and 22 (small fee), in the order you
choose.

---

## 23. Admin console

For the owner only (role flag on the player):

- Set lifecycle transitions, restock overrides, print-run settings.
- Start/stop events, schedule museum auctions, set megaproject goals.
- Economy dashboard: money created/destroyed per source and sink, per day; pack EV; price index.
- Live-tune balance values (stored in config tables, no deploy needed).
- Invite codes, player overview, compensation gifts, server announcements in the feed.
- Job run log and error list of the server tick.

---

## 24. Scope of 0.0.1

**Must (the release is not 0.0.1 without it):** §3–§16 core (packs, collection, all four games, Kartenladen-
Ankauf, Kleinanzeigen, Cardmarket, retail, grading with NPC graders and player companies, company stages
1–4, minijobs and shifts, bunker, upgrades, skill tree, all quest types, housing with decor slots,
cosmetics basics, trades/gifts, pack battles, bunker heists and Finanzamt, chat, feed), §18 NPC traders
and rivals, §19 event engine with at least 25 events, §20 prestige, §21 toplists, §22 onboarding and "i"
help, §23 admin console.

**Should (planned for 0.0.1, first to slip to 0.0.2 if needed):** eBay auctions, Bares für Rares,
Flohmarkt, streaming, box breaks, loans, luxury, megaprojects, museum auctions, company stages 5–7,
calendar events.

**Later (0.0.2+):** further business units (Kartenladen, Automaten, Auktionshaus), free-placement room
editor, more sets, tournaments, guilds/Vereine, music.

The build order is in `/ROADMAP.md`.

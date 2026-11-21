# Questions for the owner before coding starts

You do not have to answer everything. **Every question has a recommended default** — if you write
"defaults are fine", I build exactly what is marked ✅ below. Answer inline (replace the `→` line) or just
tell me in chat.

Nothing gets coded until you explicitly say go.

---

## A. Go / no-go

**Q-1 — Approval and rhythm.** Is the plan approved, and how do you want to be involved?
- ✅ Default: you approve the plan → I build **alpha_01** → I report and wait for your go before each
  next alpha.
- Alternative: one go for everything; I only stop when a decision needs you.
→

**Q-2 — Accounts and deployment.** Do a Supabase project and a Vercel project already exist?
- ✅ Default: you create both (Supabase region Frankfurt, Vercel connected to this GitHub repo) and add
  three GitHub secrets I will name; from then on every merge to `main` deploys site and database
  automatically.
- Alternative: no secrets; I generate one SQL file per release that you paste into the Supabase SQL
  editor.
- Also: do you want a custom domain, or is `*.vercel.app` fine?
→

**Q-3 — How many players?** This sizes shared store stock, NPC activity and the free-plan budget.
- ✅ Default: 4–10 friends, designed to hold up to 15.
→

**Q-4 — Login.**
- ✅ Default: username + password + single-use invite code (you create codes in the admin console). No
  e-mail needed.
- Alternative: "Login with Discord" (needs a Discord app that you create once).
→

**Q-5 — Admin.** Who may use the admin console (set phases, events, balance, invites)?
- ✅ Default: only you.
→

---

## B. Game feel

**Q-6 — Speed of progress.** How long should the first run to level 100 take for an active player
(2–3 hours a day plus idle)?
- ✅ Default: about 6–7 weeks; level 10 on day one, level 20 after about four days.
- Alternatives: faster (~3 weeks) / slower (~3 months).
→

**Q-7 — How mean may betrayal be?** (Bunker heists, reporting to the Finanzamt, resealed packs, review
bombs, poaching staff, burglary.)
- Mild: jokes and tiny amounts.
- ✅ Default **medium**: it hurts a bit, never ruins anyone. Only uncollected bunker money can be stolen;
  losses to other players capped at 10 % of net worth (without collection) per day; every attack has a
  defence and a discounted revenge.
- Brutal: higher caps, collection items can be at risk.
→

**Q-8 — Humour limits and insider material.**
- Swearing: ✅ mild ("Mist", "Alter") / none / anything goes.
- Party politics and politicians: ✅ no / yes.
- Real public figures as cameos (collector celebrities as whale buyers, German pack-opening streamers as
  rivals, the *Bares für Rares* dealers, the *Höhle der Löwen* investors, an esports legend for
  Riftbound): ✅ yes, always good-natured and only in their public role / no real people, only brands.
  Tell me names you definitely want or do not want.
- **Insider jokes:** nicknames, running gags, legendary moments of your group that should appear as NPCs,
  achievements, item names or feed headlines — send me whatever you like. This is what will make the game
  feel like *yours*.
→

**Q-9 — Card names.**
- ✅ Default: official German names where a German print exists (Pokémon: Glurak, Turtok; Yu-Gi-Oh!:
  Blauäugiger w. Drache), official English names for One Piece and Riftbound (Luffy, Zoro).
- Alternatives: everything English / German fan names for One Piece (Ruffy, Zorro, Lysop).
→

**Q-10 — Four games from the start?**
- ✅ Default: at the start you pick your favourite game and get a starter bundle; the other three unlock
  as "Händlerlizenzen" at levels 8, 15 and 22 in the order you choose. Gives three extra "new game"
  moments.
- Alternative: all four available from level 1.
→

**Q-11 — Price scale.**
- ✅ Default: real-feeling prices that stay put (booster 4,99 €, Glurak a few hundred euros raw and far
  more as a PSA 10). Cards rise through scarcity after "Out of Print" and through market hype, and can
  fall in a crash. Income grows about ×2.000 from level 1 to 100; prestige adds more.
- Alternative: classic idle-game inflation with numbers in the trillions.
→

**Q-12 — Prestige ("Der Exit") at level 100.**
- ✅ Default: level, money, upgrades, skills, company and home reset; you keep your **card collection and
  sealed product** (stored in "Omas Dachboden"), cosmetics, titles and achievements, and gain permanent
  Empire-Perks.
- Alternative: collection is sold too (harder reset, more Empire-Sterne).
→

**Q-13 — NPC "players".** May coded NPC rivals appear on the toplists and fill seats in pack battles
(always labelled as NPC)?
- ✅ Default: yes — with few real players the lists and lobbies stay lively.
→

**Q-14 — Phones.**
- ✅ Default: desktop-first. Phones work (you can collect the bunker and open packs on the bus) but are
  not polished.
- Alternative: desktop only / equal priority.
→

**Q-15 — Sound.**
- ✅ Default: sound effects on at moderate volume, all generated in code, with volume sliders. No music in
  0.0.1.
→

---

## C. Content and operations

**Q-16 — Set size and art.** I propose about 85–90 cards per set (lists in `docs/sets/`). Every Holo and
above gets individually crafted pixel art; commons and uncommons are built faster from templates and
polished later. Before mass production I show you 10 finished Basis-Set cards, a booster and a slab.
- ✅ Default: as described.
- Alternative: smaller sets (~60) so every card gets full polish sooner.
- Please skim the four lists for cards you miss. Choices worth a look:
  - **Pokémon (90):** 18 real cards are left out (e.g. Magmar, Rossana, Rattfratz/Rattikarl, Jurob/Jugong,
    Tangela); the six Alternative cards are Pikachu "Rote Wangen" plus new alt arts of Vulnona, Arkani,
    Garados, Simsala and Dragonir.
  - **Yu-Gi-Oh! (86):** Grail Blauäugiger w. Drache; all five Exodia pieces are in; alt arts of
    Blauäugiger, Dunkler Magier, Rotäugiger, Exodia, Wiedergeburt and Topf der Gier.
  - **One Piece (89):** Grail manga-art Shanks; the eight Leaders sit in the Rare tier, the big names
    return as Alternative/Ultra parallels.
  - **Riftbound (89):** Grail is the Signature **Ahri** (currently the most valuable card of the set);
    Signature Kai'Sa, Miss Fortune, Jinx and Lee Sin are Ultra. Say so if you would rather have Jinx or
    Kai'Sa as the Grail.
→

**Q-17 — Releasing sets.** Which set is "in print", "out of print" or reprinted is always your decision.
- ✅ Default: buttons in the admin console for the phases; brand-new sets come with a game update that we
  plan together in a session.
→

**Q-18 — Calendar events.** Do you want real-calendar events (Adventskalender, Karneval, Black Friday)?
- ✅ Default: the framework ships in 0.0.1 with one or two events; more later.
→

**Q-19 — Discord.** Should big moments (Grail pulls, scandals, restocks) also be posted to a Discord
channel of yours via webhook?
- ✅ Default: not in 0.0.1; in-game chat (Stammtisch) and feed only.
→

**Q-20 — Language of the planning docs.** They are in English (the game itself is German).
- ✅ Default: keep English.
→

**Q-21 — Save data during alphas.** While we are in alpha, a rework may require wiping progress.
- ✅ Default: wipes are allowed during alpha, always announced in the changelog; at the 0.0.1 release
  everyone starts fresh.
- Alternative: never wipe; I write data migrations (slower development).
→

**Q-22 — Daily reset time.**
- ✅ Default: 04:00 German time (dailies, restocks schedule, Stempelkarte); weeklies on Monday 04:00.
→

**Q-23 — Anything missing?** Is there a feature, joke, company, card or mechanic you had in mind that you
do not see in `docs/GAME_DESIGN.md`? Is anything in there that you do not want?
→

---

## D. Things I need from you once coding is approved

1. The answers above (or "defaults are fine").
2. Supabase project + Vercel project + the three GitHub secrets (I will give exact click-by-click steps).
3. Your wished username for the admin account.

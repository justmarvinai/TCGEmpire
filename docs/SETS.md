# TCGEmpire — Sets, Tiers and Pack Odds

> Status: **approved plan; all four sets are in the game data since alpha_05** (`content/sets/*.ts`, products in
> `content/catalog.ts`; displays of the three new sets hold 24 boosters). Odds and values are starting points; the calibration script fixes each set's
> numbers so that an average booster is worth 72 % ± 3 % of its price (`ECONOMY.md` §5.1). Prices are
> Basis-€ and rise with the Preisniveau (`ECONOMY.md` §4).

## 1. Launch sets

| Game | Set | Year | Cards | Grail | Ultra | Curated list |
|------|-----|------|-------|-------|-------|--------------|
| Pokémon | Basis-Set (Base Set) | 1999 | 90 | Glurak | Bisaflor, Turtok, Mewtu | [`sets/pokemon-base-set.md`](./sets/pokemon-base-set.md) |
| Yu-Gi-Oh! | Legend of Blue Eyes White Dragon (LOB) | 2002 | 86 | Blauäugiger w. Drache | Dunkler Magier, Exodia, die Verbotene, Rotäugiger schwarzer Drache | [`sets/yugioh-lob.md`](./sets/yugioh-lob.md) |
| One Piece Card Game | OP-01 Romance Dawn | 2022 | 89 | Shanks (manga art) | Luffy Leader parallel, Zoro parallel, Shanks parallel, Yamato parallel | [`sets/onepiece-op01.md`](./sets/onepiece-op01.md) |
| Riftbound (League of Legends TCG) | Origins | 2025 | 89 | Ahri, Nine-Tailed Fox (Signature) | Signature Kai'Sa, Miss Fortune, Jinx, Lee Sin | [`sets/riftbound-origins.md`](./sets/riftbound-origins.md) |
| Empiremon (our own TCG, 0.0.5) | Grundauflage, Spätschicht, Amt & Elend, Pfandland, Abstellgleis | 2026 | 20 / 18 / 15 / 24 / 30 | 2 per set | 3 per set | [`sets/empiremon.md`](./sets/empiremon.md) |

The lists were researched from public card databases and price trackers in November 2026. Entries the
research could not confirm are marked "(?)" in the set files and collected under each file's "Open
points"; they are re-checked when the set's content is built (some German Yu-Gi-Oh! names and some
Riftbound card numbers are the main ones).

Each set file contains: real-world fact box, tier summary, the full card table (our number, names, real
reference, tier, type, desirability 1–10, art brief), sealed products, hobby lore for humour and events,
and open points that still need checking. The set files are the source for the content data and for the
art briefs.

## 2. The seven tiers

| Tier | Target share | Individual copy? | Foil / frame |
|------|--------------|------------------|--------------|
| Common | ~36 % | Stack | Classic frame |
| Uncommon | ~25 % | Stack | Classic frame |
| Rare | ~15 % | Stack | Classic frame, tier marker |
| Holo | ~12 % | Yes | Foil art window |
| Alternative | ~6 % | Yes | Alternate artwork, textured foil frame |
| Ultra | ~4 % | Yes | Full art, gold foil |
| Grail | 1 (max 2) | Yes | Full art, animated rainbow-gold |

Curation rules used for every set:

1. 30–100 cards; our launch sets have about 85–90.
2. No beloved, iconic or valuable card of the real set is left out.
3. The single biggest chase is the Grail; the next three or four are Ultra.
4. An Alternative is a second, different artwork of a fan favourite that also exists in another tier.
5. Lines and groups stay complete where it matters (evolution lines, all Exodia pieces, the crew).
6. Energy and rune cards are in, as the lowest-value commons.
7. German official names where a German print exists; otherwise official English names.
8. Our own numbering 001…N; Alternative, Ultra and Grail are the "secret" numbers at the end.

## 3. Booster structure

| Set | Cards per booster | Filler | Rare slot | Hit-Slot | Guaranteed joke |
|-----|-------------------|--------|-----------|----------|-----------------|
| Pokémon Basis-Set | 11 | 7 Common, 3 Uncommon | — | 1 (Rare or better) | At least 1 Energie |
| Yu-Gi-Oh! LOB | 9 | 5 Common, 3 Uncommon | — | 1 (Rare or better) | — |
| One Piece OP-01 | 12 | 7 Common, 3 Uncommon | 1 Rare | 1 (Rare or better) | — |
| Riftbound Origins | 14 | 8 Common, 4 Uncommon | 1 Rare | 1 (Rare or better) | At least 1 Rune |
| Empiremon (each set) | 5 | 4 Common | — | 1 (Common, Ultra or Grail; house odds) | — |

Real-world pack facts per set are in the set files; the in-game structure follows them where it fits the
seven tiers.

### Hit-Slot odds (starting values, before luck bonuses)

| Result | Chance | About 1 in |
|--------|--------|------------|
| Rare | 77.9 % | — |
| Holo | 20.0 % | 5 |
| Alternative | 2.0 % | 50 |
| Ultra | 0.1 % | 1.000 |
| Grail | 0.029 % | 3.500 |

Since `0.0.4` (decision 119). **Empiremon** has its own odds (`pack.house_hit_odds_ppm`, decision 120): Common 99.88 %,
Ultra 0.01 % (1 in 10.000), Grail 0.002 % (1 in 50.000); no Doppel-Hit, God Pack or Pech-Schutz.

- Within a tier, cards are drawn with weights (most cards equal; a Grail tier with two cards may weight
  them differently).
- **Doppel-Hit:** 1 in 40 packs upgrades one Uncommon slot to a Holo.
- **God Pack:** 1 in 5.000 packs — every slot Holo or better.
- **Pech-Schutz:** after 12 packs of one set without Holo or better, the Holo chance rises by 3
  percentage points per further pack until a hit; the counter is per set and invisible.
- **Pack-Glück** bonuses multiply the Alternative/Ultra/Grail chances, capped at +50 %.
- No duplicate cards inside one pack.

## 4. Displays and cases

| Product | Content | Guarantee |
|---------|---------|-----------|
| Display (36) | 36 boosters | ≥ 6 Holo, ≥ 1 Alternative or better |
| Display (24) | 24 boosters | ≥ 4 Holo, ≥ 1 Alternative or better |
| Case | 6 displays | ≥ 1 Ultra or better |

The guarantee is applied when the display's packs are generated, so loose packs taken from an opened
display keep their content. The skill "Display-Mapping" (Sammler branch) hints where the hits sit.

## 5. Prices at launch

| Set | Booster | Display | Case (wholesale) |
|-----|---------|---------|------------------|
| Pokémon Basis-Set | 100 € | 3.200 € | 18.200 € |
| Yu-Gi-Oh! LOB | 80 € | 1.700 € | 9.700 € |
| One Piece OP-01 | 100 € | 2.100 € | 12.000 € |
| Riftbound Origins | 100 € | 2.100 € | 12.000 € |
| Empiremon (each set, kiosk only) | 200 € | — | — |

Boosters can be bought and opened 1, 5 or 10 at a time from level 1; a display can be opened in one go
with the display-mode upgrade.

## 6. Lifecycle

`Angekündigt → Vorbestellung → Im Druck → Letzte Welle → Out of Print → Vintage`, always switched by the
admin (`GAME_DESIGN.md` §4.5). At launch all four sets start **Im Druck** unless the owner decides
otherwise.

## 7. Checklist: adding a new set later

1. Research file in `docs/sets/` with the same structure (facts, tiers, card table, products, lore).
2. Owner approves the list and the Grail/Ultra choices.
3. Content data (cards, products, odds) and calibration run (pack EV in band).
4. Art: frame variants if the game's layout changed, pack and display art, P1 hero art, P2 template art,
   contact-sheet review.
5. Collection goals, achievements, events and feed lines for the set.
6. Release as a game update; the owner switches the phase in the admin console.

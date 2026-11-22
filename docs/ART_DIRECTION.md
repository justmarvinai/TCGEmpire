# TCGEmpire — Art Direction, Pixel Art Pipeline and UI

> Status: **approved plan** (owner decisions of 21 Nov 2026 included). Sizes, fonts and colours are
> confirmed in alpha_01 on a showcase page (`/dev/ui`) and with contact sheets, before volume production.

## 0. Pixel-art budget (owner rule)

**Card and product artwork gets the full effort. Everywhere else: little pixel art — but what exists is
excellent.** Pixel art costs a lot of production effort, so it is spent where players look longest.

| Full effort | Small, fixed set | Not drawn (clean UI instead) |
|-------------|------------------|-------------------------------|
| Card artworks, card frames and backs, boosters, displays, cases, slabs | Game logo, ~40 UI and navigation icons, currency and tier icons, 7 Geldbunker stages, one emblem set for companies and NPCs (generated symmetric 8×8 emblems) | Avatars (the profile picture is the artwork of a card you own), room scenes and furniture, store and job illustrations, NPC portraits, mini-game scenery (icons and simple shapes) |

New pixel art outside the first column needs a reason; the default answer is typography, colour and
layout.

## 1. Look and feel — "Nachtschicht" (owner's pick, 22 Nov 2026; decision 056)

**"A sleek night-time app, with real pixel art where it counts."**

- **UI: modern, dark, calm.** Frosted-glass panels on soft violet, pink and cyan glows; large rounded
  corners; generous spacing; big bold numbers. Data is always in the body font with tabular figures.
- **Pixel art: the personality — concentrated on cards and products** (§0), plus the small icon set.
  Always integer-scaled, never blurred. Cards and boosters may glow in their tier colour behind them.
- **The pixel font is for game moments only:** pack opening, level-up, minigames, card overlays, avatar
  letters. Titles, prices and numbers use the body font.
- **Juice with restraint:** big effects for big moments (hit reveal, level-up, Grail, bunker); everyday
  actions get small, fast feedback.

Things we avoid: emoji as icons, stock illustration, blurry upscaled pixels, pixel fonts for body text
or numbers, glass on top of glass without a solid enough floating layer (`panel-float`).

## 2. Design tokens

| Token group | Values |
|-------------|--------|
| Background | ink `#07070c` with three soft glows (violet top left, pink top right, cyan bottom) |
| Surfaces | glass `rgb(255 255 255 / 5 %)` + 1 px line `rgb(255 255 255 / 9 %)` + blur; floating layers (popovers, dialogs, toasts) `rgb(22 20 32 / 94 %)` |
| Text | primary `#f4f3f9`, secondary `#b3b2c8`, muted `#83829c` |
| Accent | gradient violet `#7d5cff` → pink `#ff4fa3` (primary buttons, active navigation, rings); solid accent `#a98bff`; gold `#ffc94d` (money) |
| Semantic | gain `#3fe08f`, loss `#ff5a5f`, warning `#ffb547`, info `#34d3ff` |
| Rarity | Common `#9aa3b5`, Uncommon `#4fc97a`, Rare `#4f9dff`, Holo `#4fe3e0`, Alternative `#b47bff`, Ultra `#ffcf5a`, Grail `#ff6ad5` |
| Radii | panels 22 px, buttons 12 px, rows 12–16 px, chips full |
| Motion | 80 / 150 / 220 / 320 / 480 ms; transform and opacity only |

Utilities: `panel` (page panels), `panel-float` (popovers, dialogs, toasts), `panel-inset` (fields),
`bg-grad` (accent gradient), `eyebrow` (small caps panel titles). Tailwind's default palette is removed.

**Typography:** body and numbers **Space Grotesk**; game moments **Pixelify Sans**. Self-hosted.

## 3. Layout (desktop-first)

```
┌──────────────┬────────────────────────────────────────────────────────────────────────────┐
│ ╭──────────╮ │ [Suchen oder springen … Strg K]   [€ Geld] [⚡ Energie] [★ · Bons · ×P]      │
│ │ Sidebar  │ │                                    [Buffs] [KARTEN-BILD] [🔔] [Avatar+EP]   │
│ │ (glass,  │ ├────────────────────────────────────────────────────────────────────────────┤
│ │ floating)│ │ Group / Page (breadcrumb)                                                  │
│ │ every    │ │ Big title, one-line explanation, "i"                                       │
│ │ page,    │ │ Glass tiles (home: last hit, net worth, next step, bunker, quests, stamps, │
│ │ grouped  │ │ headlines)                                                                 │
│ ╰──────────╯ │                                                                            │
└──────────────┴────────────────────────────────────────────────────────────────────────────┘
```

- Navigation groups: **Start · Sammeln** (Shop, Öffnen, Sammlung, Grading) **· Handeln** (Cardmarket,
  Kleinanzeigen, Auktionen, Tausch) **· Verdienen** (Jobs, Geldbunker, Firma, Streaming) **· Aufsteigen**
  (Quests, Upgrades, Skills, Level-Pfad, Prestige) **· Leben** (Wohnen, Stil, Luxus) **· Freunde**
  (Battles, Toplisten, Spieler, Megaprojekte). Active page: gradient pill; counts: pink badges; new
  unlocks: green NEU; unbuilt: "Bald"; locked: lock and level.
- Every stat pill opens its explanation on click; the avatar menu holds level, EP, profile, settings,
  version and sign-out. KARTEN-BILD lives in a popover and on the home page.
- Target 1280–1920 px. Usable down to 390 px: the sidebar becomes a drawer behind the menu button and the
  top bar keeps money, notifications and the avatar.
- Every page: skeleton loading in the shape of its content, a designed empty state, a designed error
  state. No bare spinners.
- Every action has hover, pressed, focus, disabled, loading and success states. Full keyboard support
  for pack opening and dialogs.

## 4. Pixel art specifications

| Asset | Art size (px) | Typical display scale | Notes |
|-------|---------------|-----------------------|-------|
| UI icon | 12×12 / 16×16 | ×2 | Single colour (inherits text colour) or max 6 colours. |
| Item / decor icon | 24×24, 32×32 | ×2–×3 | Max 16 colours. |
| **Card** | **80×112** (5:7) | ×2 binder, ×4 opening, ×6 inspect | Art window 68×48 (classic) or full art 80×112. Max ~32 colours per card. |
| **Booster pack** | 84×132 | ×3–×4 | Crimped top and bottom, foil bands, set logo, hero creature. |
| **Display** | 144×104 | ×2–×3 | Open-top box with pack fronts visible. |
| **Case** | 128×112 | ×2 | Brown carton, tape, shipping label. |
| **Slab** | 96×152 | ×2–×4 | Acrylic case with highlights, label area 80×22, card inset 80×112. |
| Geldbunker stage | 48×48 | ×3 | Seven stages, Sparschwein to Geldspeicher. |
| Emblem (company, NPC) | 8×8 generated | ×4–×6 | Symmetric, seeded from the name, two colours. |
| Profile picture | crop of a card artwork | — | Any card the player owns. |

House style rules:

- Light from the top left. Outlines are a darker shade of the local colour, not pure black; the silhouette
  gets a consistent dark outline so cards read at thumbnail size.
- Shading with 3–5 step colour ramps per material; hue-shifted (shadows cooler, highlights warmer).
- Dithering only for large gradients (skies, foil bands), ordered 4×4 Bayer.
- No anti-aliasing against transparent backgrounds. No orphan pixels.
- Readability test: every card must be recognisable at ×2 in the binder grid.

## 5. Cards: looking like the real thing — but our own

Each game gets its own **card frame family** that evokes the real layout without copying artwork or
logos pixel for pixel:

| Game | Frame cues |
|------|------------|
| Pokémon | Yellow border, type-coloured body, name and KP at the top, art window, attack lines, weakness/resistance bar, set symbol. |
| Yu-Gi-Oh! | Card-kind coloured frame (normal yellow-brown, effect orange, spell teal, trap magenta), attribute orb, level stars, square art window, text box, ATK/DEF. |
| One Piece | Full-bleed art, cost badge top left, power top right, colour band, name plate at the bottom, type line. |
| Riftbound | Modern full-art frame, domain-coloured gem, energy cost, might value, slim name bar. |

- **Text on cards** is drawn with our own bitmap fonts (5×7, condensed 4×6, micro 3×5) directly into the
  pixel image, with automatic condensing for long names ("Blauäugiger w. Drache"). Cards are therefore
  complete images that can be shared as PNG.
- **Tier treatments:** Common–Rare classic frame; Holo foil art window; Alternative new artwork with
  textured frame; Ultra full art with gold accents; Grail full art, animated rainbow-gold border, serial
  style numbering.
- **Foil:** per-card foil mask (which pixels shine) plus animated, pixel-stepped gradient layers that
  follow the pointer. A recipe per tier (strength, pattern: cosmos dots, linear rainbow, cracked ice,
  gold sweep). Cheap: transforms and blend modes only.
- **Card back** per game, own design in the spirit of the original.
- **Artwork** is an original pixel-art interpretation of the character described by the art brief in the
  set file — recognisable, on-model in colours and silhouette, in a new pose and scene.

**Slabs** imitate the real cases: PSA-style red-white label, BGS-style gold/silver/black label with four
sub-grades, CGC-style blue label, and player-company labels built from the owner's colours and an
emblem. Label text (grade, card name, cert number) is rendered at runtime.

## 6. The pipeline: art as code

```
art/toolkit      painter library: canvas of indexed pixels + primitives + post-passes
art/<domain>/    one small TypeScript file per artwork, exporting draw(painter)
scripts          build → PNG atlases + JSON index per set   (runs in `pnpm build`, deterministic)
                 sheet → contact-sheet PNGs for review       (cards at ×1, ×2 and ×4 on dark and light)
client           loads one atlas per set on demand; composes slabs and dynamic labels at runtime; caches
```

**Painter toolkit** (built first, in alpha_01/02):

| Capability | Purpose |
|------------|---------|
| Primitives: ellipse, blob, capsule/limb, polygon, bezier stroke, line, rect | Build bodies from shapes instead of typing pixel grids. |
| Symmetry and transforms | Mirrored creatures, rotated parts. |
| Auto-shading: light direction, ramp lookup, rim light | Consistent volume without hand shading. |
| Auto-outline (selective, coloured) and silhouette outline | Readability. |
| Dither fills, gradients, noise, sunbursts, speed lines, sparkles | Backgrounds and energy effects. |
| Material presets: flame, water, lightning, smoke, rock, metal, scales, fur | Reused across creatures. |
| Stamps: small hand-authored grids for eyes, mouths, claws, logos | Precision where it matters. |
| Palette management: ramps, hue shift, max-colour check | Cohesion. |
| Cleanup pass: remove orphan pixels, fix double lines | Quality. |
| Bitmap fonts and text layout | Card text, labels. |
| Templates: quadruped, biped, serpent, bird, humanoid, item, spell scene | Faster production of non-hero cards. |

**Review loop (mandatory for every artwork):** write draw code → build contact sheet → *look at the
image* → compare against the art brief and the checklist → refine. An artwork is done only when it passes
the checklist at ×2 and ×4. Automated gates: colour count, orphan pixels, minimum silhouette coverage,
atlas size.

Atlases are built from code on every build and are not committed. Art source is lazy-loaded per set and
never bundled into the main app.

## 7. Production plan for ~350 cards

| Priority | What | When |
|----------|------|------|
| P0 | Toolkit, card frames for all four games, card backs, pack and display art for the first set, slab frames, the small icon set | alpha_01–02 |
| P1 | **Hero art only for the two rarest tiers: Ultra and Grail** (4–5 cards per set). Individually crafted, full-art, up to four review rounds each. | With each set's alpha |
| P2 | **Everything else (Common, Uncommon, Rare, Holo, Alternative): simple and cheap.** Built from shared templates and material presets with few shapes, a plain background and a small palette; recognisable and clean, not elaborate. Produced in batches, **one contact-sheet review per batch**, fixes only for clear flaws. Holo and Alternative get their value from the frame treatment and foil, not from extra art detail. | With each set's alpha |
| P3 | Optional later polish: upgrade favourite P2 cards, alternative pack artworks, animated Grails | after 0.0.1 |

Owner rule (22 Nov 2026): **only Ultra and Grail cards get the detailed treatment; all lower tiers are
deliberately simpler to save development time and tokens.** Guide values per P2 card: 30–60 lines of draw
code, one subject built from a template, at most ~16 colours, no bespoke background scene. Templates and
material presets are built once and reused; art batches are well suited to parallel subagents with a
precise brief and a hard cap on review rounds.
Quality sample shown to the owner before volume production (alpha_01): Glurak (Grail) and Turtok (Ultra)
at full detail, Pikachu, Professor Eich and Feuer-Energie as lower-tier cards, a booster and a slab.

## 8. Motion and feedback

| Moment | Feedback |
|--------|----------|
| Money gained | Coins fly to the wallet, number ticks up, soft coin sound. |
| EP gained | EP orbs to the level ring. |
| Level-up | Full overlay: level number bounces in, unlock list staggers, confetti, fanfare, then the mini-tour. |
| Hit reveal | Tiered charge, flash, shake, particles, value count-up (see `GAME_DESIGN.md` §5). |
| Grail | Blackout, heartbeat, white flash, rainbow beams, server-wide toast. |
| Bunker collect | Coin fountain, big number. |
| Quest done | Stamp animation, reward pop. |
| Error / loss | Short shake, low thud; losses are shown clearly but without humiliation effects. |

Rules: animate transform and opacity only; appearing is slower than disappearing; "Animationen
reduzieren" and the system setting are respected; nothing blocks input for more than 300 ms except
deliberate reveals (which can always be skipped).

## 9. Sound

- All sounds are synthesised in code at runtime (small WebAudio synth with named presets): chip-style
  pulse and triangle voices, noise bursts, short envelopes, one musical scale so everything harmonises.
- Sound families: UI ticks, coins, pack (crinkle, tear), reveal ladder by tier (2 notes → fanfare with
  drum → long Grail sequence), level-up, quest, market (sold, outbid), company (stamp, printer), alarms
  (heist, restock), mini-games.
- Throttling and slight pitch variation prevent fatigue. Separate volume sliders for effects and (later)
  music; default on at moderate volume (Q-15).

## 10. Showcase and quality gates

- `/dev/ui` shows every component and state, all tokens, all sound presets, and a gallery of card frames,
  packs and slabs. New components land there first.
- Visual changes are checked with one Playwright screenshot at 1440 px per feature; 390 px once per
  milestone.
- Card and product art is always reviewed on its contact sheet before it is committed.

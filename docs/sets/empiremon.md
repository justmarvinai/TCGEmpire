# Empiremon — the game's own TCG (0.0.5)

> **Status:** in the game since `0.0.5` (`content/sets/empiremon.ts`, boosters in `content/catalog.ts`).
> **What it is:** TCGEmpire's own trading card game, a creature game full of German everyday misery. Five sets, all
> in print from the start and for good, sold **only at the kiosk**, no Händlerlizenz needed (owner request,
> 23 Nov 2026; decision 120).
> **Booster:** 5 cards = 4 Commons + 1 hit slot · 200 € Basis (twice a normal booster) · no displays.
> **Odds of the hit slot:** Ultra 1 : 10.000, Grail 1 : 50.000, otherwise a Common (`pack.house_hit_odds_ppm`).
> No God Pack, no Doppel-Hit, no Pech-Schutz. That is 10 to 14 times rarer than the licensed games.
> **Values:** Commons 0,04–0,15 €, Ultra about 590.000–640.000 €, Grail about 4,0–4,3 Mio. € (Basis-€, in print,
> neutral market); a booster is still worth 72 % of its price on average (`ECONOMY.md` §5.1).

## Identity

- **Name and logo:** "EMPIREMON" in heavy gold capitals with a small crown over the first M; our own design.
- **Elements** (one per card, colour of the frame's name bar and bottom strip, and the scene of a kit card):

| Element | Meaning | Colour | Kit scene |
|---------|---------|--------|-----------|
| Glut | fire, heat, grease | orange-red | Feuer |
| Flut | water, rain, puddles | blue | Wasser |
| Kraut | plants, mould, weeds | green | Pflanze |
| Strom | electricity, neon, cables | yellow | Elektro |
| Beton | stone, concrete, offices | grey | Kampf |
| Spuk | ghosts, night, paperwork from hell | violet | Psycho |

- **Frame (Common):** dark indigo border with a thin gold line, name bar in the element colour, a large art window,
  a type line ("Strom-Empiremon") and a number strip with a pixel set symbol and the rarity mark (white dot).
  No text is baked in: name, type and number are written at runtime in a real font (decision 065) into the slots of
  `art/frames/empiremon-layout.ts`.
- **Ultra:** full art, silver-prism border, the whole artwork shines (foil), rarity mark a silver diamond.
- **Grail:** full art, gold border, the whole artwork shines and sparkles, rarity mark a gold crown.
- **Rule for every artwork:** our own creatures. Nothing may copy or imitate a creature, logo or frame of another
  card game.

## The five sets

Numbering per set: the Commons first, then the 3 Ultras, then the 2 Grails (`emp1-001` …).

| Set | Code | Cards | Theme |
|-----|------|-------|-------|
| Grundauflage | emp1 | 20 | The first generation: classic wild creatures, bright and friendly. |
| Spätschicht | emp2 | 18 | Night shift: Späti, Döner, neon, night bus. |
| Amt & Elend | emp3 | 15 | Bureaucracy: stamps, forms, waiting numbers, fax. |
| Pfandland | emp4 | 24 | Deposit and recycling: bottles, crates, cans, the Pfandautomat. |
| Abstellgleis | emp5 | 30 | Rail chaos: delays, replacement buses, signal failures. |

Common names are puns that describe the creature (Funkfuchs = an electric fox, Tackerdackel = a dachshund
made of a stapler); the kit turns each into a simple creature (`art/kit/`), one contact-sheet review per batch.

## Ultra and Grail briefs (hand-made, full art)

**Grundauflage**
- *Vulkanwolf* (Ultra, Glut): a charcoal-black wolf, its fur cracked with glowing lava, howling on a volcanic ridge;
  embers rise into an orange-red sky.
- *Gewitterhirsch* (Ultra, Strom): a white stag whose antlers are forked lightning, on a hill in a night storm,
  rain streaks, yellow glow.
- *Abgrundwal* (Ultra, Flut): a huge deep-sea whale with glowing spots and a lantern lure, rising from black depths
  into a shaft of light, small fish around it.
- *Imperadon* (Grail, Glut): the golden emperor dragon and mascot of Empiremon: crown-shaped crest, crimson wing
  membranes like a royal cape, coiled round a pillar in front of a gold sunburst.
- *Mondkaiserin* (Grail, Spuk): a ghostly empress moth with huge pale wings patterned like a full moon and a tiara of
  stars, floating over a misty lake at night; violet and silver.

**Spätschicht**
- *Spätikönig* (Ultra, Beton): a chubby raccoon king with a bottle-cap crown, enthroned on a glowing drinks fridge,
  city night behind.
- *Neonphönix* (Ultra, Strom): a phoenix of bent neon tubes in pink and cyan over a dark street, reflections on wet
  asphalt.
- *Kebabkrake* (Ultra, Glut): a red octopus juggling döner skewers and a long knife, steam, warm shop light.
- *Der Letzte Döner* (Grail, Glut): a legendary serpent-dragon whose body is a turning meat cone, its scales golden
  lettuce and onion, floating over the sleeping city at 3 a.m. under a huge moon.
- *Neonyx* (Grail, Spuk): a shadow cat goddess with neon-violet eyes, a neon halo and several thin glowing tails,
  sitting on a rooftop antenna above the skyline.

**Amt & Elend**
- *Bürokrator* (Ultra, Beton): a grey dragon in shirt, tie and sleeve garters with a giant rubber stamp in each claw,
  towers of files, cold office light.
- *Aktenhydra* (Ultra, Spuk): a hydra whose heads are folded file folders with paper tongues, rising from an
  avalanche of paper.
- *Faxdrache* (Ultra, Strom): a dragon of curling fax paper streaming out of an old fax machine, sparks and beeping
  waves.
- *Der Ewige Antrag* (Grail, Spuk): an endless serpent made of one never-ending form (lines and checkboxes, no
  readable words) coiling through a violet void into infinity, glowing seals on it.
- *Stempelgott* (Grail, Beton): a colossal golden rubber-stamp deity with a stern face on its handle, descending
  from bright clouds and leaving a glowing seal mark on the ground; gold and white rays.

**Pfandland**
- *Pfandautomaten-Titan* (Ultra, Beton): a giant robot built from a reverse vending machine, a conveyor-belt mouth
  swallowing bottles, green display eyes.
- *Glasdrache* (Ultra, Flut): a translucent dragon of green and brown bottle glass, light breaking through it, in a
  bottle-bank yard.
- *Recyclingphönix* (Ultra, Glut): a phoenix reborn from melting glass and cans, its wings looping like the
  recycling arrows, orange-green fire.
- *Goldflaschengeist* (Grail, Spuk): a genie of golden smoke rising from a golden deposit bottle, crown of bottle
  caps, holding a glowing golden receipt; treasure sparkle.
- *Pfandkönig* (Grail, Beton): a stocky boar king with a bottle-cap crown and a shrink-wrap mantle on a throne of
  stacked beer crates, a bottle opener as his sceptre.

**Abstellgleis**
- *Zugausfall-Hydra* (Ultra, Spuk): a three-headed hydra whose heads are split-flap departure boards (no readable
  text) with red eyes, on an empty platform at night.
- *Stellwerk-Golem* (Ultra, Beton): a golem built from an old signal box, levers for arms and signal lights for
  eyes, standing in gravel between rails.
- *Schnellzugphönix* (Ultra, Glut): a phoenix shaped like the nose of a sleek express train, wings of fire
  streaming back, speed lines over a viaduct.
- *Signalstörung* (Grail, Strom): an eldritch tangle of signal cables with dozens of red and green signal lights for
  eyes, crackling over the tracks in a storm.
- *Der Pünktliche* (Grail, Strom): the mythical punctual train: a golden locomotive-dragon with a clock face on its
  chest (hands at twelve), arriving in divine light on rails that curve up into the sky.

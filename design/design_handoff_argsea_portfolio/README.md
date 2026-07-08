# Handoff: argsea.com Portfolio Redesign

## Overview
A full redesign of Justin Smith's personal portfolio (argsea.com). Replaces the previous SPA/space-theme/particle-effect site with a set of lightweight static pages. The visual identity is "night harbor": dark navy, editorial serif type, a lighthouse mark, postcards, boats, and a running joke about abandoned hobbies. Tone: professional copy, whimsy in the details.

## About the Design Files
The `.dc.html` files in this bundle are **design references created in an HTML design tool**: prototypes showing intended look and behavior, NOT production code. They contain tool-specific markup (`<x-dc>`, `<sc-for>`, `<sc-if>`, `x-import`, `style-hover` attributes, a `support.js` runtime) that will not run standalone. **Recreate these designs in the target codebase's environment.** The developer has access to the user's current site repo and API repo; use their established patterns. If starting fresh: plain static HTML/CSS/JS or a minimal static-site generator is the right weight; the user explicitly does NOT want an SPA.

`image-slot.js` is a design-tool component (drag-drop image placeholder in the project overlay); in production replace it with a plain `<img>` from the project's `images[]` data.

## Fidelity
**High-fidelity.** Colors, typography, spacing, copy, and animations are final design intent. Recreate pixel-perfectly. All copy is real and approved by the user (the projects/hobbies/notes content matches their existing site data).

## Design Tokens

### Colors
| Token | Value | Use |
|---|---|---|
| bg-top | `#11131f` | page gradient start |
| bg-bottom | `#131628` | page gradient end (`linear-gradient(180deg, #11131f 0%, #131628 100%)`) |
| card | `#1a1e33` | postcard background |
| card-alt | `#161a2c` | graveyard/hobby entry background |
| overlay-card | `#1c2036` | modal background |
| text-strong | `#f0f2fc` | headlines |
| text-head | `#eef0fb` / `#e8ebfa` | card titles / nav name |
| text-body | `#a5aed4` | body copy |
| text-body-strong | `#b8c0e0` | overlay body copy |
| text-dim | `#7a83ad` | muted italic |
| periwinkle | `#93a0e8` | links, accents, primary button bg, stamps |
| periwinkle-deep | `#5f6ec4` | faint mono text, wave strokes, boat hull mast |
| gold | `#f0d9a8` | active states, CTA button, lighthouse light, wakes |
| button-text-dark | `#151830` / `#1b2033` | text on periwinkle / gold buttons |
| borders | `rgba(150,160,220,.2)` cards · `rgba(150,160,220,.3)` chips · `rgba(240,217,168,.4–.6)` gold dashed |

### Typography
- **Gloock** (Google Fonts): display serif. Headlines, card titles, logo name.
- **Newsreader** (Google Fonts, weight 300–600 + italic): body serif. Default page font.
- **IBM Plex Mono** (400/500): nav links, labels, chips, tags, footers, buttons.
- Scale: hero `clamp(34px, 6.5vw, 58px)`; page titles `clamp(32px, 5.5vw, 46px)`; overlay titles `clamp(24px, 4vw, 30–32px)`; card titles 20–21px; body 15–20px; mono labels 11.5–14px, section labels uppercase with `.14em` letter-spacing.

### Spacing & Shape
- Page gutters: `clamp(20px, 5vw, 52px)`.
- Card radius 12px; overlay radius 14px; buttons 8px; chips 999px (pill).
- Card shadow: `0 10px 24px rgba(0,0,0,.35)`; overlay: `0 30px 80px rgba(0,0,0,.6)`.
- Signature button shadow: `3px 3px 0 rgba(240,217,168,.85)` (gold offset under periwinkle button) and inverse `3px 3px 0 rgba(147,160,232,.6)` (periwinkle under gold button); grows to `5px 5px 0` on hover.
- Whimsy rule: postcards/buttons/chips carry tiny rotations (−1.5° to +1.2°); they straighten (`rotate(0)`) on hover.

## Shared Chrome (all pages)

### Nav (borderless, no bottom border)
- Left: lighthouse SVG mark (24×28, rotated −4°, gold lamp `#f0d9a8`, periwinkle body strokes, wave under it) + "Justin Smith" in Gloock 19px.
- Right: mono 13px links `hello · projects · hobbies · notes · resume ↗` in periwinkle; active page in `#e8ebfa` with `border-bottom: 2px solid #f0d9a8`.
- `resume ↗` links to the resume PDF (placeholder `#` in mocks). Wraps to two rows on narrow screens (accepted behavior).

### Footer
Three items, space-between, wrapping: `© 2026 · argsea.com` (mono 12) · an italic per-page quip (Newsreader 15) · `github · linkedin · email` links (mono 12, placeholder hrefs). Quips: Hello "The boats run on schedule. Ish." / Projects "Every project was, at some point, a terrible idea that worked." / Hobbies "Flowers welcome. Watering optional." / Notes "Written by a human, edited by deadline." / 404 "You are the first person to find this exact wrong URL. Probably."

### Motion
- Page-load: header/hero elements fade-up (`opacity 0→1, translateY(16px)→0`, .7s ease, staggered .05/.15/.25/.35s).
- `@media (prefers-reduced-motion: reduce)`: all animations and transitions disabled. REQUIRED on every page.

## Screens

### 1. Hello (homepage): `Hello.dc.html`, screenshots `01–04-hello.png`
Sections top to bottom:
1. **Hero**: mono kicker `HIYA, SENIOR SOFTWARE ENGINEER, PITTSBURGH PA`; Gloock headline "I help keep the lights on behind the news."; body paragraph ("Backend engineering at the Post-Gazette: building, planning, a healthy amount of boxes-and-arrows. Dad the rest of the time. Serial picker-upper of hobbies."); buttons **the projects** (periwinkle bg, gold offset shadow, −.5° tilt) and **say hi** (outlined, mailto). Decorations: 4 firefly dots (4–5px, gold/periwinkle, glow box-shadow, `drift` keyframe: gentle 9–14s translate loops, staggered delays); a 110px dashed postmark circle top-right reading `PITTSBURGH / PA · EST 2014 / ARGSEA.COM` (rotated ~12°, sways 9–15° over 9s; **hidden below 760px**).
2. **Wave divider with boat**: 18px-tall repeating wave line (SVG data-URI, 53×18 tile, stroke `rgba(147,160,232,.3)`), **static** (no background scroll). A 30×24 sailboat SVG (periwinkle hull, gold sail) crosses left→right over 70s (linear, infinite), bobbing ±3px/±2° (3s ease-in-out). Behind it trails a **wake**: 110px strip of the same wave tile in gold `rgba(240,217,168,.5)`, rippling (background-position 2.2s linear loop), masked to fade out with distance from the boat.
3. **Postcards from production**: section label + `all projects →` link (gold). 3 cards (grid `auto-fit minmax(250px,1fr)`), each linking to Projects. Cards **idle-bob**: unique keyframes per card combining its resting tilt with a ±3–5px vertical float, 6.5–8s, staggered delays, never synchronized. Corner decorations wiggle independently (stamp with lighthouse; dashed postmark circle `DAILY SINCE 1786`; stamp with ☀). Hover: card lifts 5px. Content: "The Great Un-monolithing" (kubernetes · python · rabbitmq), "Newsroom plumbing" (rest · mongodb · nginx), "100k good mornings" (php · redis · linux); descriptions in the files.
4. **The cargo manifest**: label + italic "tools currently aboard". 3 columns (border-top rule each): languages `java · python · node.js · go · php`; data & queues `mongodb · redis · rabbitmq · varnish`; infrastructure `kubernetes · docker · nginx · linux`.
5. **Hobbies, past & present**: label + `the full graveyard →` link. Two panels: **Currently learning** (gold-tinted bg `rgba(240,217,168,.06)`, gold dashed border, −.3° tilt): "The home lab / plex · htpc", "CachyOS tinkering / linux · always", italic "One tweak from perfect, forever." **The hobby graveyard** (card-alt bg, +.3°): pill chips `piano † got good enough`, `music theory † see piano`, `game dev † shipped one`, `running † it was a phase`, each chip sways ±1° (5–6.5s, staggered); italic "Nothing here is dead. It's just resting until the next season of me." Below: mono comment `// the graveyard only grows. that's fine.`
6. **Contact band**: centered: lighthouse mark, Gloock "Need a hand keeping your lights on?", italic "Backend, architecture, planning, or just to talk shop.", gold **say hi** button (mailto) + outlined **resume ↗**.
7. **Dictionary entry**: centered, max-width 520px, top border rule: **argsea** `/ˈɑːrɡ·siː/ · noun`: "1. the Argo, but for one. 2. `argc`, but forever. 3. a sea of water, or of stars. 4. *informal*: what a method signature becomes if I'm not supervised." (numerals in `#5f6ec4`; `argc` in mono).

### 2. Projects: `Projects.dc.html`, screenshots `01–04-projects.png`
- Header: "The projects" + "Things I've built, shipped, or babysat into stability. Sorted by how proud I am, roughly. Click a postcard to flip it over."
- **Filter chips** (mono pills): `all · backend · games · this website · tinkering`. Active chip: gold text + 1.5px gold dashed border; inactive: periwinkle-gray. Right-aligned count line: `showing N of 6, <quip>` (quips per filter: all "nothing hidden yet" / backend "the day-job greatest hits" / games "undefeated: one for one" / this website "it counts" / tinkering "the hobby that survives every purge").
- **Grid**: `repeat(auto-fill, minmax(250px, 1fr))`, auto-FILL so a single result doesn't stretch. On filter change, visible cards re-enter with a fade (.45s, staggered 70ms per card). Cards idle-bob like the homepage. 6 projects (full copy in the file): the 3 above + "Meo Wave Race" (games; unity · c# · blender), "This website" (meta · html · whimsy), "The home lab" (plex · linux · cachyos).
- **Postcard-back overlay** (click a card): fixed backdrop `rgba(8,10,20,.72)` + 5px blur, fade in .25s; card `min(860px,100%)`, max-height 86vh, enters rotating −3°→0 + rise + scale .96→1 (.35s). Header row: `POSTCARD · FROM PRODUCTION` + pill `close ✕`. Two columns split by dashed vertical rule: left = title + 2 paragraphs + italic "Moral: …" line; right = wiggling lighthouse stamp, a photo print (off-white `#e8e6df` paper frame, −1.5° tilt, thick bottom border like an instant photo) containing the project image, then mono address block `to: / from: / postmarked:` (playful values, e.g. to "100,000 people who are not awake yet" from "a cron job with ambition") and tag list. Close on ✕, backdrop click, or Escape.
- All 6 projects' overlay copy (paragraphs, morals, to/from/postmarked) is final; extract from the file.

### 3. Hobbies: `Hobbies.dc.html`, screenshots `01–02-hobbies.png`
- Header: "The hobby graveyard" + intro ("I pick things up, learn them until they stop being mysterious, and wander off. Every hobby gets a headstone and a short eulogy. Nothing here is dead, just resting until the next season of me.")
- **Logbook entries** (stacked cards, alternating tiny tilts, straighten on hover). Each: left column (~190px) with uppercase mono status + date range; right column with Gloock name + eulogy. Active entry ("The home lab", status `● currently learning`, 2021–present) uses the gold-tinted/dashed treatment; retired entries (card-alt bg): Piano `† got good enough` 2023–2024, Game development `† shipped one` 2020, Running `† it was a phase` "one summer". Eulogy copy in file.
- Footer row: `// the graveyard only grows. that's fine.` + a gold dashed chip **`next: ???`**: clicking cycles suggestions: ??? → blacksmithing? → sourdough? → birdwatching? → 3d printing? → kayaking? → chess? → fermenting things? → ham radio? → "no. surely not." → loops. Chip scales 1.04 on hover, .96 on press.
- Data note: hobbies are one list with a status flag; active → "currently learning" treatment, otherwise graveyard. The user wants to manage this as data (their API) so entries move between states without markup changes.

### 4. Notes: `Notes.dc.html`, screenshots `01–02-notes.png`
- Header: "Notes" + "Occasional writing about systems, software, and whatever the current hobby is. No schedule. No newsletter. No promises."
- **List rows** (bottom-border separated): mono date (110px col) · Gloock title + one-line teaser · gold `read →`. Hover: faint bg + 6px translateX.
- Clicking opens a **letter overlay** (same backdrop/motion pattern as Projects, card `min(680px,100%)`, tilts +1.5°→0 on entry): header `NOTE · <date>` + close pill; title, 3 paragraphs, signed `- j` in mono. Escape/backdrop/✕ close.
- 3 notes with full text in the file. Closing line under the list: *Three notes so far. The bar for "blog" is five. We'll see.*

### 5. 404: `404.dc.html`, screenshots `01–02-404.png`
- Centered copy: kicker `404 · UNCHARTED WATERS`; headline "This tunnel doesn't go anywhere. Yet."; body "Tunnels are gateways to other worlds. This one is a gateway to a page that doesn't exist, which is technically also another world."; buttons **back to the light** (→ home, periwinkle/gold-shadow) + **the projects** (outlined).
- **Tunnel**: bottom-anchored, `min(720px, 92vw)` wide, ~300px tall. 5 concentric arch outlines (semi-ellipse borders, no bottom edge) from faint outer `rgba(147,160,232,.14)` to bright inner `rgba(180,164,240,.58)`, each fading/scaling in sequentially (.8s, delays .1–.5s). Innermost mouth: radial gold glow pulsing opacity .55→1 over 5s, with mono `no exit found` inside pulsing in sync. 3 fireflies drift.
- Serve for unknown routes.

## Interactions & State Summary
- Projects: `filter` state (5 values) → visible set + count line + staggered re-entry; `openProject` state → overlay.
- Notes: `openNote` state → overlay.
- Hobbies: `nextIdx` state → cycles the suggestion chip.
- All overlays: close on Escape, backdrop, ✕. No other JS state. No routing library needed; these are separate pages.

## Data
Content maps to the user's existing API (they have the repo): projects carry name/slug/description/images/skills/links; the postcard fields (to/from/postmarked, moral) and hobby statuses/eulogies are new editorial fields worth adding to the data model rather than hardcoding.

## Assets
- Lighthouse mark, sailboat, wave tile: inline SVG (extract from files; wave tile is a URL-encoded SVG data-URI).
- Fonts via Google Fonts: Gloock, Newsreader, IBM Plex Mono.
- Project images come from the user's existing media store (e.g. argsea.com/media/images/…).
- No other external assets.

## Files
- `Hello.dc.html`, `Projects.dc.html`, `Hobbies.dc.html`, `Notes.dc.html`, `404.dc.html`: the five pages (design-tool markup; templates near the top of each file, logic classes at the bottom of Projects/Hobbies/Notes).
- `screenshots/`: desktop captures of each page, including Projects' filtered state + open overlay and Notes' open overlay.

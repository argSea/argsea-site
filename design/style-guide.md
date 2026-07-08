# argsea design style guide

The rules for building and extending argsea.com so it stays one coherent thing.
This is the **prescriptive** layer: do/don't, tokens, gotchas. For the full
per-screen design intent (every section, every string, every animation), the
source of truth is
[`design_handoff_argsea_portfolio/README.md`](design_handoff_argsea_portfolio/README.md).
Lore and easter-egg rulings live in [`CLAUDE.md`](CLAUDE.md). When any of these
disagree, the handoff wins on look, this file wins on rules.

Identity in one line: **night harbor**, dark navy, editorial serif, a lighthouse
mark, postcards and boats, professional copy with the whimsy kept in the details.

## Palette

Use these tokens. Don't introduce new hexes: if something needs a shade that
isn't here, it's a sign to reuse, not to invent.

| Token | Hex | Where |
|---|---|---|
| `bg-top` | `#11131f` | page gradient start |
| `bg-bottom` | `#131628` | page gradient end, `linear-gradient(180deg,#11131f,#131628)` |
| `card` | `#1a1e33` | postcard / card background |
| `card-alt` | `#161a2c` | graveyard / retired-entry background |
| `overlay-card` | `#1c2036` | modal background |
| `text-strong` | `#f0f2fc` | headlines |
| `text-head` | `#e8ebfa` | card titles, nav name |
| `text-body` | `#a5aed4` | body copy |
| `text-body-strong` | `#b8c0e0` | overlay body copy |
| `text-dim` | `#7a83ad` | muted / italic asides |
| **`periwinkle`** | `#93a0e8` | links, accents, primary button, stamps |
| `periwinkle-deep` | `#5f6ec4` | faint mono text, wave strokes, hull/mast |
| **`gold`** | `#f0d9a8` | active states, CTA button, the light, wakes |
| `button-text-dark` | `#151830` | text on periwinkle/gold buttons |

Borders are always periwinkle at low alpha: `rgba(150,160,220,.2)` on cards,
`.3` on chips; gold dashed accents at `rgba(240,217,168,.4–.6)`. The sand shoal
on the 404 is the one warm exception (`#59503a` / `#6e6248`) and it's deliberate;
don't reuse it elsewhere.

**The two-accent rule:** periwinkle is the default accent; **gold is earned**:
it marks the active/current/primary thing (the live hobby, the CTA, the
lighthouse lamp, a wake behind a boat). If everything is gold, nothing is. Keep
gold rare.

## Type

Three families, no more:

- **Gloock**: display serif. Headlines, card titles, the logo name. Never body.
- **Newsreader** (300–600 + italic): body serif, the default page font. Italic
  carries the whimsy asides.
- **IBM Plex Mono** (400/500): nav, labels, chips, tags, footers, buttons,
  coordinates. Section labels are uppercase with `.14em` letter-spacing.

Fluid scale, already set: hero `clamp(34px,6.5vw,58px)`, page titles
`clamp(32px,5.5vw,46px)`, overlay titles `clamp(24px,4vw,32px)`, card titles
20–21px, body 15–20px, mono labels 11.5–14px. Reach for a clamp, not a media
query, for type size.

> Mono has a narrow glyph set. **ASCII only** in mono strings: use `+`, not the
> fullwidth `＋` (U+FF0B); it renders as tofu without a fallback font. Em dashes
> are banned everywhere on this site, prose included; use a colon, comma,
> semicolon, or parentheses instead.

## Shape, shadow, motion

- Radii: cards 12px, overlays 14px, buttons 8px, chips/pills 999px.
- Shadows: card `0 10px 24px rgba(0,0,0,.35)`, overlay `0 30px 80px rgba(0,0,0,.6)`.
- **Signature button:** periwinkle bg + a hard **gold offset shadow**
  `3px 3px 0 rgba(240,217,168,.85)`, tilted `-.5°`, growing to `5px 5px 0` and
  straightening on hover. The gold-bg variant inverts (periwinkle offset). This
  offset-shadow button is the brand: use it for primary actions, don't restyle it.
- **Whimsy tilt:** postcards, buttons, chips carry a tiny resting rotation
  (`-1.5°` to `+1.2°`) and straighten to `rotate(0)` on hover. Idle-bobs are
  per-element keyframes with staggered delays, **never synchronized**; a row of
  things bobbing in lockstep reads as a bug, not life.

### Motion rules (these are also perf rules)

- **Animate `transform` and `opacity`, nothing else.** A continuous animation on
  `left`/`top`/`width`/`margin` invalidates layout every frame for the life of the
  page (the boat's `left`-based sail was exactly this bug). Move things with
  `transform: translateX`. Repeating-background scrolls (`background-position`)
  are a repaint, tolerable but composite them if you can.
- **`prefers-reduced-motion: reduce` disables all animation/transition: required
  on every page.** And because the kill-switch freezes elements at their *base*
  style, put resting poses (the wreck's list tilt, a card's rest rotation) in the
  base rule as a `transform`, so a stopped element still looks right instead of
  snapping to upright or parking off-screen.

## Components: reuse, don't reinvent

The vocabulary already exists. New work composes these; it does not fork them.

- **Buttons:** the signature offset-shadow button (primary) or the outlined mono
  button (secondary). Always a real `<button>`/`<a>`.
- **Chips/pills:** mono, 999px radius, periwinkle-gray idle / gold-dashed active
  (filter chips, hobby tags, the `next: ???` cycler).
- **Cards & overlays:** `overlay-card` bg, the backdrop is `rgba(8,10,20,.72)` +
  5px blur, enter with rotate→0 + rise + scale; **close on ✕, backdrop click, and
  Escape**: all three, every overlay, via the shared `useEscapeKey`.
- **The lighthouse mark, sailboat, wave tile** are inline SVG: extract from the
  mockups, don't redraw.
- **The harbor cat** is a single island (`HarborCat`) with a `context` prop
  (`postcard`/`note`/`wreck`) selecting its quip set. One cat, many perches; don't
  clone it per surface.

## Responsive & a11y (the audit punch-list, as rules)

Mobile (test at **390px**) and keyboard are where this design breaks if you're not
looking. Each of these is a finding we already hit once:

- **Close pills and their kickers get `flex-shrink:0` / `nowrap`.** A wrapping
  "POSTCARD · FROM PRODUCTION" squeezed the `close ✕` into a two-line blob at 390.
- **Anything pinned to an element's edge with `nowrap` must clamp to the
  viewport.** The cat's speech bubble (`left: calc(100% + 8px)`) ran off-screen on
  the mobile 404: flip it to the other side when it would overflow.
- **The postmark circle hides below 760px**: decorative flourishes that don't fit
  small screens should disappear, not overlap.
- **Interactive means a real control.** Toggles, add/remove, poke targets are
  `<button>` (or `role` + `tabindex` + Enter/Space); never a bare `onClick` div.
  Toggles expose `aria-pressed`.
- **Style `:focus-visible`, suppress the UA outline on pointer.** A keyboard ring
  is required; the default yellow box around an SVG sprite is not it.

## Delights (easter eggs)

Governed by [`CLAUDE.md`](CLAUDE.md); the load-bearing rules:

- **Three live eggs, hard cap** (bottle · cat · light list). Scarcity is the joke.
  Adding a fourth means retiring one; don't let the site turn into a toy box.
- **Every egg is admin-toggleable and bakes in at build** (next lantern hoist).
  Off degrades gracefully to the plain element; an egg with no payload never
  teases (empty proverbs → boat sails but doesn't drop; empty light list → plain
  `last position: 404`).
- **The cat is occasional** on postcard/note overlays (~1 in 3 opens), always
  present on the 404. Never make it furniture.
- **Admin-entered egg strings render as text, never HTML.** Proverbs, lighthouse
  lines, quips go to text sinks only; the only `dangerouslySetInnerHTML` on the
  site is the API-sanitized project/note body. Keep it that way.
- **Seed content ships through the admin, not fixtures.** Fixtures are the
  no-API dev fallback; a real copy doc that's never been edited should still come
  up with the design's starter proverbs/lighthouses, or the eggs land empty on
  first deploy.

## Islands & performance

- Static-first. The site is Astro `output: 'static'`; interactivity is React
  islands, and **islands never import `src/lib/api.ts`** (build-time only); data
  comes in as props from page frontmatter.
- **Hydrate by need.** Core above-the-fold interaction (postcard grid, filters,
  notes list) is `client:load`. Decorative/below-the-fold delights are
  `client:visible` or `client:idle`; a page whose only island is a decorative cat
  should ship ~zero eager JS (the 404 shouldn't pull 180KB of react-dom to blink).
- Fonts are the page's real weight; no other external assets. No image is shipped
  that isn't from the media store.

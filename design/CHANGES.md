# CHANGES.md · portfolio evolution review round

A record of everything changed since reviewing the shared "Portfolio Evolution" doc. Newest work last; latest session is §14.

## 1. Takeaways adopted from the shared doc (translated into our style)
- **Evidence over voice**: real numbers now live on the site, attached to the things they describe, never as floating stat strips.
- **Ownership claim**: hero and flagship copy say solo work in first person. "We took it apart" became "I took it apart."
- **Flagship + 2**: Hello restructured from three equal cards to one flagship (with fact rows) and two smaller featured cards. Honest hierarchy.
- **Section-head pattern**: plain mono label first, italic lore aside second ("Selected work · *lights I keep burning*"), applied site-wide (Hello, Notes, Hobbies, Projects headers).
- **Footer definition**: the argsea dictionary entry compacted to a one-liner in every page's footer; the dedicated Hello block removed.
- **Skipped on purpose**: their restraint gospel, Newsreader-only type, sweeping-beam hero, floating stat strips.

## 2. Shared data layer
- `site-data.js` created: single source of truth for the light list (projects). All pages load it in their helmet and read `window.ARGSEA_DATA`.
- New light no. 007 (register no. 014): "The old publishing stack", dark, decommissioned 2025, "put out by light no. 001."
- Projects carry: `facts` (array of heading→fact pairs, up to 6, per-project headings), `images` (up to 6, keyed, first = entry picture), `notes` (journal entry titles tucked into this light), `caseStudy` (markdown, keeper's dialect).
- Register numbering is even-only (no. 002, 004, 006...).

## 3. Case studies ("the full log")
- `CaseStudy.dc.html` renders any project's `caseStudy` markdown at `?light=<slug>`: numbered sections, from-the-log asides, fact grids, outcome cards, amber `[? fact needed ?]` chips, fenced code, and **mermaid diagrams** themed to the palette.
- Un-monolithing has a full draft case study with placeholders for facts only the keeper knows.
- "read the full log →" links from: flagship card, register rows (gold), both overlays.
- Admin project editor: case-study markdown field + "hoist a .md file" upload.

## 4. Shared project overlay
- `ProjectOverlay.dc.html`: one overlay component, mounted by Hello and Projects. Projects-page look is canonical (tower lamp, No. header, facts grid, polaroid, moral + signoff).
- Overlay signoff: "- j, the keeper" (removed "keeper: j. smith" meta line).
- Polaroid scales to fit its frame; up to 6 images per project (thumb strip for 2..6, unfilled thumbs hidden from visitors).
- "notes found here" block above facts links to the journal page.
- Nudge when a light has no notes and no case study: "no notes here yet. the keeper has been meaning to."

## 5. Hello page
- Name in the hero kicker ("Justin Smith · senior software engineer"); tagline stays the star; Dad-line keeps full billing.
- One proof sentence in hero prose (solo platform, 29 services, ~2M visits/month).
- Coast in miniature: beacons on the existing wave, blinking their real characteristics from site-data, dark lights dark. Unclickable.
- Flagship card: fact rows capped at 2×2, beacon light next to the characteristic, no border glow, polaroid pulls the first project image.
- Featured cards: fleshed out (no., characteristic + dot, est., tags, read →), plus "✎ N journal entries" when notes exist.
- Writing section: journal-entry cards match the site's card vocabulary.

## 6. Projects page
- Boat swapped for the cuter Hello boat.
- Register rows: "full log →" (gold) vs "read →" column; even-only numbering.
- Overlay via the shared component.

## 7. Journal (Notes page)
- Entry overlay: "found in" block linking back to the light(s) holding the note. Circular with the light overlay.
- Site-data ties drive both directions; they cannot drift.

## 8. Admin (the keeper's office)
- **Light list editor**: facts array editor (heading→fact, up to 6); pictures box is the single picker (darkroom prints only, search, up to 6, first = entry picture); case-study field + .md upload; "notes found here" search-to-tie picker (tied = gold chips with ✕, rest behind search — tested at 50 entries); amber nudge when no note and no log.
- **Note editor**: "kept in" box — tap a light to tuck the entry into its log; same tie, both directions.
- **Darkroom**: search field, count line, tested at ~100 prints.
- **Carving shop** (was figurehead shop): full SVG catalog grouped by page (lighthouse logo, boat, bottle, tower stub, paw, wave/wake patterns, plus catalog-only notes for stamp, wreck, cat), live-editing bench with big canvas, chisel rack (mock), "+ a fresh block", "bolt it to [location]" assign flow (mock).
- **The cat everywhere**: per-page perches + quips (watch room fishing, light list window bar, graveyard stones, log book doodle, signal flags hero, cove guarding its own switch, darkroom search bar, marginalia inkwells, carving shop supervising, keeper name field). Speech bubble auto-flips left near the right screen edge; `bubble` prop overrides.
- Office page removed (wasn't a real thing).

## 9. Copy rules (now in project notes)
- **No em-dashes anywhere** — swept from all copy, data, comments, tooltips.
- Plain language first, lore second.
- Numbers attach to things, never float.
- Note↔light framing: notes are *found in* towers ("notes found here" / "found in"), nothing "shines on" anything.

## 10. This session · jul 11, 2026
- **Cat speech bubble, both sides**: the cat measures where it sits when poked; within ~220px of the right screen edge the bubble opens left, else right. `bubble="left|right"` prop still forces a side.
- **Notes ↔ lights, the whole loop**:
  - Light overlay: "notes found here" block above facts, linking to the journal page; nudge ("no notes here yet. the keeper has been meaning to.") when a light has no notes and no full log.
  - Hello cards: flagship shows tucked entries as ✎ chips; small cards show "✎ N journal entries".
  - Journal overlay: "found in" block linking back to the holding light(s).
  - Admin project editor: search-to-tie picker (tied = gold chips with ✕; the rest behind "search the book...", capped scrollable tray). Stress-tested at 50 entries; the flat chip wall failed, the picker held.
  - Admin note editor: "kept in" box, tap a light to tuck the entry in; same tie, both directions.
  - Copy reframed then tightened: notes are *found in* towers; nothing "shines on" anything; labels cut to "notes found here" / "found in" / "kept in".
- **Data**: projects carry `notes: [entry titles]`; flagship holds its two entries.
- **Pull the note out (option A)**: clicking ✎ in a light's entry swaps the card in place for the journal paper (cream, same frame, no stacked overlays) with "← tuck it back into no. NNN" to return. Footer line credits where it was found.
- **Journal single-sourced**: entries moved into `site-data.js` (`journal`); Notes and Hello now read the same book (they had already drifted on one line, which settles grill Q1). Admin's copy stays intentionally separate (mock).
- CHANGES.md written; review grill delivered (open questions in §11).

## 12. This session · the full-log system (case studies rebuilt)
- **Authoring moved out of the project form** into a block-based editor in the admin. A "full log" is now its own document with a draft/lit lifecycle, independent of the light's card. The old raw-markdown field is retired.
- **The logs shelf**: a third pill on the light list ("the logs"). Flat list of every log with state (draft / lit), the light it belongs to (no. + name), and rev + freshness. Row actions: open the desk, publish / unpublish, duplicate as draft, scrap. +New picks a light (lights with a lit log are marked), then a template (standard log or blank), seeds the header from the light, and opens the desk.
- **The log desk** (full-screen block editor):
  - Read-only kicker from the light: registry no., light badge, slug.
  - Header split into editable, log-owned blocks: title, subhead, facts, established/tags, seeded from the light (edits do not write back to the card).
  - Full block vocabulary at public fidelity: heading, paragraph, from-the-log quote, list (bulleted / ordered), code, mermaid (live preview), facts, outcomes, figure, comparison, timeline, callout (note / warning / dead end).
  - Per-block move / duplicate / insert / delete; insert palette with every type (incl. title, subhead, established/tags); inline marks (bold, italic, code, link, keeper chip); undo / redo; save-state.
  - Images from the darkroom: figure and comparison open a picker over the media library; develop (upload) a print without leaving the desk (it auto-places); uploaded prints show their real image.
  - Block sets: select blocks with the ○ toggle, save the selection as a named set; it joins the palette under BLOCK SETS (seeded with a "header" set).
- **Publish** enforces one lit log per light with a confirm that spells out the swap; nothing is public until the hoist.
- **Model**: logs are separate documents on a project; the body is typed blocks, serialized to the keeper's markdown dialect. Wiring and imagery are mock / illustrative.
- **Shipped next session**: the six new public-page blocks on `CaseStudy.dc.html` (inline links + link row, ordered lists, syntax-highlighted code, comparison figure, timeline, callouts) all landed and verified. See §13.

## 13. This session · mobile integration + the Hobbies sea chart
- **Mobile folded into every page**: the throwaway `mobile/` mocks (Android-framed, 1b bottom-tab nav, reviewed and approved) were baked into the live pages as a `@media(max-width:600px)` tier, one responsive file per page. No JS width-switch, no second file to drift. The `mobile/` directory and the old graveyard file were deleted.
  - Nav swaps at 600 (the site's ratified breakpoint): desktop link row hides, a fixed bottom tab bar (hello / projects / hobbies / notes / contact) shows, resume moves into the header.
  - Prose pages (Notes, Contact, CaseStudy, 404) already reflowed via `clamp` / `flex-wrap`; they only needed the nav swap. Projects and Hello carry mobile-specific layout in the same file.
- **Hobbies rebuilt as a sea chart** ("off course, not overboard", replacing the hobby graveyard): every hobby is a ship plotted on a portolan-style chart, not a headstone. The register below is a ship's log.
  - **Coordinate-driven**: each hobby carries one real Hebridean coordinate that drives both its plotted mark and its log line. The light "characteristic" was dropped (that vocabulary belongs to lights / projects; ships do not have characteristics), keeping the two registers honest.
  - Chart furniture: dotted wake trails (each wandering hobby's drift from where it slipped moorings to where it went quiet), per-mark soundings keyed to seasons spent, Cat's Holm (the rock the harbor cat keeps watch from), a compass rose planted on the rhumb-line hub, rhumb-line web, scale bar, "here be dragons" corner.
  - **The memorial**: a title cartouche reading "EILEAN MÒR · DECEMBER 1900 · TAP TO READ", opening the Flannan Isles keepers' memorial. Deduped against the floating Flannan marker so the dedication lives in one place.
- **Flares** ("signal the keeper you want a hobby back"):
  - Real signal-flare animation: the shell arcs up and bursts into a red parachute flare (red so it reads against the parchment).
  - Recorded per-hobby to a shared `argsea-flares` key. The Admin watch room shows a red "flares from the coast" card, and clicking it opens a roll-call overlay: every flared hobby sorted by count, scaled bars, total, and "most wanted back".
  - Front-end flare count removed (visitors should not be nudged by how many others flared). The per-hobby chart glow is session-only: it lights only for the current visitor's flares this session and clears on refresh, so a persisted count never resurrects a red glow for everyone.
- **Mobile Hobbies fixes** (this session's tail):
  - Log rows stack at ≤600 (pill, then title, then bearing prose full-width, then odds), fixing one-word-per-line prose and the odds column clipping off the right edge. The prose column's `flex: 1 1 300px` was reset on mobile so it stops reserving 300px of height once the row goes vertical.
  - Chart drops the fixed `height: 600px` mobile override for `aspect-ratio: 5/6` (capped 520px), so it shrinks with width and keeps the plotted constellation's proportions instead of stretching into a portrait.
  - Nav icon: the retired graveyard headstone was swapped for a compass rose (echoing the chart's own rose), updated across all seven pages for a consistent bottom tab bar.

## 14. This session · the split watch home + the light-list register
- **Hello rebuilt as the split watch**: hero and letter fuse into one first viewport (the tagline flows into the dateline), the watch card chrome is retired, the seal signs the letter bottom-right (now on mobile too), the bearings strip wraps instead of truncating.
- **The rack**: two operator prints (`watch-postcard`, `watch-postcard-2`), the second tucked smaller below the first; captions stamp from the save. The cat perches on the first print and carries the ten-poke finale.
- **The wave strip promoted to coast wayfinding**: four beacons (no. 002 · flagship, no. 004, no. 006, the chart) anchor down the page; arriving flares the entry's lamp once.
- **Selected work is the light-list register**: ruled ledger entries, no cards. Real notation (Fl W 8s / Oc W 6s / F W) with period-true lamp rhythm (`flashBloom` / `occultDip`; F W never blinks; 45% floor so lit never reads dead), hover beam sweep, per-entry snapshots that collapse cleanly when a light has no image, and a "corrected to" line from the latest journal date.
- **Chart + log share one side-by-side band** (collapses to one column under 900).
- **The Gull Post**: poke the watch cat ten times and the page phases to paper, then the morning edition arrives (`Hello Gazette.dc.html`, delivered by seabird, payment expected on the spot). Listed in smuggler's cove.
- **Hobbies externalized to `site-data.js`**; hobbies ↔ journal cross-links land (the `?bearing=` contract, ◈ mark on hobby links, journal overlay on the chart page). The contact nav cut finally reaches Hobbies and Notes.
- **Admin**: the watch desk grows two hooks on the rack; the office brand line reads the keeper's name.
- **Sync-backs at the bank**: the contact band restored (the ruling stands), `/resume.pdf` restored on both nav links, the writing-desk strings re-amended (third export regression of that ruling), and the gazette phase wired to the cat's finale instead of a hard cut.

## 11. Open items / known state
- Flagship numbers (29 services, ~2M/mo, timelines) still unconfirmed by the keeper.
- Amber `[? fact needed ?]` placeholders in the Un-monolithing case study await real facts.
- Journal notes in a light's entry now open in place (option A); the journal page's "found in" still links to the projects page, not the specific light.
- Admin is a mock with intentionally separate seeded data; carving shop assign/bolt is visual only.
- Resume link in nav is still `#`.
- Contact links (github, linkedin) still `#`.
- Journal note↔light ties reference titles as strings; renaming an entry orphans ties (Admin rename-remap still open, grill Q2).
- Hero numbers and case-study placeholders await the keeper's real figures (grill Q3/Q4).

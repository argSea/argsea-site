# Argsea portfolio redesign — project notes

## Lore / characters
- **The harbor cat** is a resident of the lighthouse. Keep its character consistent with this: it belongs to / lives at the lighthouse, and its quips and placements should reflect that home base. It roams the site (perches on postcards, notes, and the 404 wreck placard) but the lighthouse is where it lives.

## Copy rules
- **"Argsea" stays out of all visible copy.** It is the private name of the site, a play on words, not a brand. Code identifiers (`ARGSEA_DATA`, `argsea-*` localStorage keys) and the functional `hello@argsea.com` address stay as-is. Use "the lighthouse", "home waters", or "the lamp room" where a place name is needed.
- **No em-dashes ("—") anywhere**, in any copy, code comment, or data string. The user dislikes them. Use commas, colons, periods, middots (·), or plain hyphens for ranges/signatures instead.
- Plain language first, lore second: section heads are a plain mono label ("Selected work") followed by an italic lore aside ("lights I keep burning"). Jargon is never load-bearing.
- Numbers/stats live attached to the thing they describe (fact rows on a project, prose claims), never as floating stat strips.

## Data
- `site-data.js` is the single source of truth for the light list (projects) and the wandering chart (`ARGSEA_DATA.hobbies`). A hobby's `notes` array ties it to journal entries by title (same as projects); Notes links back via `Hobbies.dc.html?bearing=<name>`. Pages load it in their helmet and read `window.ARGSEA_DATA`. Case studies are markdown strings in the keeper's dialect (see comments in that file); `CaseStudy.dc.html` renders them (with mermaid support) at `CaseStudy.dc.html?light=<slug>`.
- The Admin's seeded data is a mock and intentionally separate; its project editor includes the case-study markdown field.
- Hello is now the imported "keeper's landing" page (20 jul): conventional portfolio bones (hero + now letter, projects, notes, off watch, manifest) with living atmosphere: a faint nautical chart under the page (contours, soundings that include project years, compass rose), a cursor lamp that brightens nearby linework and reveals invisible-ink secrets (sea monster, "here be dragons", cat paw prints), a dashed plotted course connecting the sections, the sea footer with bottle proverbs, and a "set sail" door in the hero linking to `TheChart.dc.html`. The sea footer is permanent and stays the last thing on the page, nothing goes after it. `TheChart.dc.html` is the banked interactive sea-chart build, kept as an easter egg / project-within-a-project, not the first interaction. Other builds: `backup-2026-07-20/Hello.moonlit-sea.dc.html` (canvas night-sea with nav marks), and in `backup-2026-07-19/`: `Hello.night-watch.dc.html`, `Hello.keepers-console.dc.html`, plus the pre-sweep `Hello.dc.html`.
- `ProjectOverlay.dc.html` is the single shared light-list entry overlay. Hello and Projects mount it via `<dc-import name="ProjectOverlay" light="{{ open }}" no="{{ openNo }}" closing="{{ ... }}" on-close="{{ ... }}">`; edit the overlay there only, never inline in the pages. The Projects-page look is canonical.

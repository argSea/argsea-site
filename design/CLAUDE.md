# Argsea portfolio redesign — project notes

## Lore / characters
- **The harbor cat** is a resident of the lighthouse. Keep its character consistent with this: it belongs to / lives at the lighthouse, and its quips and placements should reflect that home base. It roams the site (perches on postcards, notes, and the 404 wreck placard) but the lighthouse is where it lives.

## Copy rules
- **No em-dashes ("—") anywhere**, in any copy, code comment, or data string. The user dislikes them. Use commas, colons, periods, middots (·), or plain hyphens for ranges/signatures instead.
- Plain language first, lore second: section heads are a plain mono label ("Selected work") followed by an italic lore aside ("lights I keep burning"). Jargon is never load-bearing.
- Numbers/stats live attached to the thing they describe (fact rows on a project, prose claims), never as floating stat strips.

## Data
- `site-data.js` is the single source of truth for the light list (projects). Pages load it in their helmet and read `window.ARGSEA_DATA`. Case studies are markdown strings in the keeper's dialect (see comments in that file); `CaseStudy.dc.html` renders them (with mermaid support) at `CaseStudy.dc.html?light=<slug>`.
- The Admin's seeded data is a mock and intentionally separate; its project editor includes the case-study markdown field.
- `ProjectOverlay.dc.html` is the single shared light-list entry overlay. Hello and Projects mount it via `<dc-import name="ProjectOverlay" light="{{ open }}" no="{{ openNo }}" closing="{{ ... }}" on-close="{{ ... }}">`; edit the overlay there only, never inline in the pages. The Projects-page look is canonical.

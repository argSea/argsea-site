# Argsea portfolio redesign — project notes

## Lore / characters
- **The harbor cat** is a resident of the lighthouse. Keep its character consistent with this: it belongs to / lives at the lighthouse, and its quips and placements should reflect that home base. It roams the whole site but the lighthouse is where it lives.

## The harbor cat — placement model (supersedes the old 3-spot / 1-in-3 ruling)

The cat is no longer three fixed spots. It's a **catalog of perches** across every
page, appearing **exactly once per page view**, admin-toggleable per spot and per
page. `HarborCat.dc.html` is the character (two poses); this section is the rules.

**Behavior (load-bearing):**
- **Exactly one cat per page view — never two.** On each page load, gather the
  spots enabled for that page and pick **one** at random (client-side per view, so
  a refresh can move it — same idea as the 404 lighthouse pick).
- **Static spots** render on load; **overlay spots** (opening a postcard/note)
  render only when that overlay opens. Because it's one instance, the guaranteed
  cat is a static perch whenever the pick lands on one.
- It stays **pokeable** — clicking pops a context-appropriate quip (see the
  `context` sets in `HarborCat.dc.html`).
- Off (spot or whole page) degrades to no cat there. Nothing else changes.
- **Reduced motion + mobile:** a cat pinned to an element's edge must clamp inside
  the viewport. The nav links wrap to two rows on narrow screens — the header
  perch can't ride off-screen when they reflow.

**Two poses** (`pose` prop on `HarborCat`), reused across spots:
- **perched** — front paws on an edge, tail draped. Cards, tags, chips, overlay
  tops, list rows, the hero, the contact lighthouse, the 404 placard.
- **lying** — draped along a horizontal element. The current page's nav link only.
- *(A curled pose was designed and cut — it didn't read as the same cat. Don't
  reintroduce it; use perched for "quiet corner" spots.)*

**The catalog** — the spot ids the code defines and the copy doc toggles. Header
spot = the **current page's own nav link**.

| Page (`catPages`) | Spot (`catSpots`) | Pose | Placement |
|---|---|---|---|
| hello | `hello.header` | lying | on the "hello" nav link |
| hello | `hello.hero` | perched | peeking beside the hero headline |
| hello | `hello.postcard` | perched | on an opened postcard (overlay) |
| hello | `hello.manifest` | perched | at the end of the cargo-manifest list |
| hello | `hello.graveyard` | perched | among the hobby-graveyard chips |
| hello | `hello.contact` | perched | by the contact-band lighthouse |
| projects | `projects.header` | lying | on the "projects" nav link |
| projects | `projects.filterTag` | perched | on the active filter chip |
| projects | `projects.card` | perched | on a project card corner |
| projects | `projects.overlay` | perched | postcard-back overlay |
| hobbies | `hobbies.header` | lying | on the "hobbies" nav link |
| hobbies | `hobbies.entry` | perched | on a logbook headstone |
| hobbies | `hobbies.nextChip` | perched | on the `next: ???` chip |
| notes | `notes.header` | lying | on the "notes" nav link |
| notes | `notes.row` | perched | on a note row |
| notes | `notes.overlay` | perched | letter overlay |
| p404 | `p404.wreck` | perched | the placard (default on — the 404's guaranteed cat) |

**Data model (contract):** two maps on the site-copy singleton, both **absent =
on** like the other egg fields — `catPages: {hello, projects, hobbies, notes,
p404}` (page master) and `catSpots: {<spotId>: bool}` (per spot). The cat shows at
spot S on page P iff `eggs.cat && catPages[P] && catSpots[S]`. This replaces the
old flat `catLocs {postcards, notes, p404}`. The catalog above lives in code (each
spot = id + page + pose + anchor); the copy doc only stores on/off, so a new perch
later is a code change that then appears in the admin automatically.

**Admin (smuggler's hold, cat card):** the flat 3-toggle list becomes a **page →
spots tree** — a page master toggle (collapses/disables its spots) with the spots
nested under it, each with its own smaller toggle and a "where it is" hint. Reuse
the existing hold vocabulary; keep a counter in the spirit of "N spots loose
across M pages."

## Easter eggs (the smuggler's hold)
Three live eggs, all admin-toggleable; scarcity is the point — don't add more without cutting one:
- **Message in a bottle** — poke the drifting boat on the homepage, a proverb washes ashore. Proverbs are admin-edited.
- **The harbor cat** — see the placement model above; one per page across a catalog of perches, toggleable per spot and per page.
- **The light list** — the 404 placard's "last position" is the real coordinates of a real lighthouse (random pick per wreck). Clicking flips the line in place to the light's name + a one-liner. The list (name / position / line) is admin-edited.

## 404 rulings
- The scene is "run aground": listing boat on a sandbar, buoy, gull, choppy water. The shoal is *sand-toned* (warm, desaturated) so "shallows" reads — not a grey shadow.
- The lighthouse beam was cut (`beamSweep`); the scene doesn't need it. Don't reintroduce it.
- The placard keeps clearance below the headline so the perched cat never collides with the copy.

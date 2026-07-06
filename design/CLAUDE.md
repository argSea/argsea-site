# Argsea portfolio redesign — project notes

## Lore / characters
- **The harbor cat** is a resident of the lighthouse. Keep its character consistent with this: it belongs to / lives at the lighthouse, and its quips and placements should reflect that home base. It roams the site (perches on postcards, notes, and the 404 wreck placard) but the lighthouse is where it lives.
- **Cat frequency (ruling):** on postcard/note overlays the cat is *occasional* — shows up on roughly 1 in 3 opens, so it stays a discovery instead of furniture. On the 404 it is always present. The mockups show it always so the design stays reviewable; the 1-in-3 behavior is an implementation rule.

## Easter eggs (the smuggler's hold)
Three live eggs, all admin-toggleable; scarcity is the point — don't add more without cutting one:
- **Message in a bottle** — poke the drifting boat on the homepage, a proverb washes ashore. Proverbs are admin-edited.
- **The harbor cat** — see above; per-location toggles (postcards / notes / the wreck).
- **The light list** — the 404 placard's "last position" is the real coordinates of a real lighthouse (random pick per wreck). Clicking flips the line in place to the light's name + a one-liner. The list (name / position / line) is admin-edited.

## 404 rulings
- The scene is "run aground": listing boat on a sandbar, buoy, gull, choppy water. The shoal is *sand-toned* (warm, desaturated) so "shallows" reads — not a grey shadow.
- The lighthouse beam was cut (`beamSweep`); the scene doesn't need it. Don't reintroduce it.
- The placard keeps clearance below the headline so the perched cat never collides with the copy.

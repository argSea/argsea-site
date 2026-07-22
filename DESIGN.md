# argsea — design direction

## The problem to solve
The lighthouse-keeper world currently lives only in the copy and the 
labels. The visuals are flat night-harbor navy with nautical captions 
bolted on. Make the world SEEN, not captioned: real color, real 
texture, one painted element.

## Palette — commit to these as PRESENCE, not tint
- Harbor navy (deep, near-black blue) — the ground, and already real: 
  the page runs #11131f to #131628. Keep it.
- Fog grey-green — secondary, atmosphere. Missing entirely today; the 
  secondary in its place is periwinkle #93a0e8, a blue-violet.
- Manila — paper STOCK, not a base: postcard backs, the prints, the 
  keeper's wall. The tokens exist (--manila and its inks) and surface 
  nothing structural today.
- Lamp amber — the single warm accent; lit lights, links, focus. Today 
  it only tints type, never lights an object.
- Weathered brass — hairlines, rules, chart marks. Not a material here 
  yet: every hairline is rgba(150,160,220,.2), periwinkle at 20%.
Rule: fog and brass must appear as real surfaces and real marks, not as 
another tint of the navy. The ground is already dark everywhere, so the 
inversion that earns its keep runs the other way — at least one section 
inverts to LIT PAPER, manila under lamplight, against the night.

## Texture — the biggest lever, currently missing entirely
Weathered chart-paper grain, subtle fog gradients, the depth of a 
physical logbook. No flat fields on any ground. Fight digital flatness 
on every surface that is paper; deep water stays flat on purpose, and 
that restraint is what makes the paper read as material. Watch for tilt 
standing in for texture: the rotations on the panels, the prints, and 
the seal are doing material's job today.

## Typography
Keep the display serif. Lean harder into the mono for chart 
annotations. Steal real nautical-chart texture: condensed caps 
labels, italic hydrographic notes, depth-sounding numerals. The mono 
today is the generic uppercase letterspaced eyebrow, which reads as 
tech credibility rather than chart.

## Motion — make it real, not decorative
Each project's light must blink its ACTUAL characteristic at its 
stated period:
  Iso = equal on/off · Fl = brief flash, mostly dark · 
  Oc = mostly lit, brief eclipse · F = fixed, no blink
Get the timing exactly right — this is the signature detail.
Built, and correct: src/lib/lightChar.ts runs the real timelines 
through WAAPI, phase-locked to a shared clock so every lamp agrees on 
the instant. The gap is what the engine drives — it computes true 
light and spends it on 2px dots.

## Anti-defaults (reject these)
Inter/geometric sans as personality face; safe grey/cream-only 
neutrals, or the periwinkle-only monoculture standing in for them; 
flat cards on any ground; generic SVG line-icon illustrations standing 
in for the hand-painted element.

## Reference register
Coastal Ghibli — Ponyo, Porco Rosso. Hand-painted, warm, weathered, 
a little melancholy. NOT literal cartoon whimsy. Painted, not drawn: 
every world element in the build today is crisp line art.

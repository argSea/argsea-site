# AGENTS.md

## Purpose
The argSea site/frontend: the public-facing "night harbor" site that consumes
the `argsea-site-api` backend at build time. It owns the site's UI and client
behavior; it does not own the API or its data model. Stack: Astro v5 static
output with React islands, TypeScript, npm.

## Instruction Priority
Resolve instructions in this order:
1. an external session path assigned by the caravan primary integrator
2. local `SESSION.md`, if present
3. this `AGENTS.md`
4. task-relevant repo docs
5. source code
If instructions conflict, pause and ask.

## Boot Sequence
1. `AGENTS.md`
2. assigned external session path, if one was given
3. local `SESSION.md`, if present
4. `design/design_handoff_argsea_portfolio/README.md`: the design contract
   (tokens, per-page specs, approved copy) when touching anything visual
5. only the files the task requires
Read narrowly. Do not wander the repo.

## Hierarchical Workflow
- An assigned external session is the authoritative task contract.
- Keep edits scoped to this repo unless the session explicitly allows more.
- Prefer a worktree over the primary checkout for a new branch.
- Branch name: `type/scope/short-desc`.
- Return implementation + verification evidence to the primary integrator.

## Operating Rules
- Stay inside the declared scope and exclusions.
- Preserve existing behavior unless the task changes it.
- Keep diffs reviewable and tied to the task.
- Update durable docs only when architecture/contracts materially change.
- Plain English in responses and session notes.
- `design/` is a read-only reference: the `.dc.html` files are design-tool
  prototypes, not production code. Extract copy/values from them; never
  reuse their markup or `support.js`.

## Repo Map
- `astro.config.mjs`: static output + the React integration; nothing else.
- `src/pages/`: the five routes: `index` (Hello), `projects`, `hobbies`,
  `notes`, `404`.
- `src/layouts/BaseLayout.astro`: shared shell: fonts, tokens, nav, footer.
- `src/components/`: Astro chrome (`Nav`, `Footer`, `LighthouseMark`,
  `WaveDivider`).
- `src/components/islands/`: the only client-side JS: `ProjectsBoard`
  (filter + grid), `HomePostcards` (homepage preview), the shared
  `PostcardOverlay` and `Stamp` (per-project stamps/postmarks from data),
  `NotesList` (letter overlay), `NextHobbyChip` (cycling chip), plus their
  CSS and the shared Escape hook.
- `src/lib/api.ts`: the data seam. The ONLY module that fetches. Build-time
  only; never import it from an island (`src/lib/media.ts` is the
  client-safe helper).
- `src/data/fixtures/`: checked-in content matching the API wire format
  exactly; used whenever `ARGSEA_API_URL` is unset.
- `src/styles/global.css`: design tokens, shared classes, keyframes, and the
  reduced-motion kill-switch (wins via `!important` over inline and
  component/island styles; file position is convention, not the mechanism).
- `design/`: the design handoff (read-only reference).

## Architecture Defaults
- Astro v5, `output: 'static'`: no SSR, no Node process in production.
- React islands only where client state exists; everything else ships as
  static HTML/CSS. New motion is CSS/SVG, not JS.
- All API access goes through `src/lib/api.ts` (`ARGSEA_API_URL` set →
  build-time fetch, `?published=true` on collections; unset → fixtures).
  `ARGSEA_KEEPER_ID` rides alongside it: the keeper's user id for the public
  profile route that feeds the say-hi email, footer socials, and the note
  sign-off; a live build without it fails loud rather than shipping the
  fixture profile. Footer quips, hero copy, and the dictionary come from the
  `SiteCopy` singleton (`GET /1/copy`, plain text, per-field design-copy
  fallback). Honor the API contract caveats documented in that module's header.
- Rich text from the API is pre-sanitized HTML: render as-is, never
  re-sanitize.
- `prefers-reduced-motion: reduce` must disable all animation/transitions on
  every page. Elements whose resting pose is a transform carry it as a base
  style so the kill-switch never breaks layout.
- Fonts are self-hosted via `@fontsource` packages: no CDN fonts.

## Verification Rules
- `npm run build`: must be green and emit all five pages into `dist/`.
- `npm run check`: `astro check`, must report zero errors.
- `npm run test:e2e`: the Playwright suite; bakes three static builds under
  `e2e-dist/` (fixtures, plus featured/fallback against `e2e/mock-api.mjs`)
  and asserts stamps, note prints, the featured mantel and its fallback,
  keeper-driven copy, and reduced motion. Needs a one-time
  `npx playwright install chromium`.
- For visual/interactive changes: serve `dist/` and spot-check the affected
  page (overlays open/close, filters, reduced-motion honored).

## Session Discipline
- Small tasks: one agent.
- Multi-agent: the assigned external session (or local `SESSION.md`) is the
  parent contract; one primary integrator owns consolidation.
- With no session and no explicit implementation request, stay in planning mode.

## Final Output Expectations
Report: what changed, files changed, verification run, known limitations/
follow-ups, and assumptions a human should review. Plain English.

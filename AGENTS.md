# AGENTS.md

## Purpose
The argSea site/frontend — the public-facing web app that consumes the
`argsea-site-api` backend. It owns the site's UI and client behavior; it does
not own the API or its data model. Stack is not yet chosen: this repo is
bootstrapped but does not yet contain an application scaffold.

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
4. the repo-specific docs to read first (none yet — repo is a bootstrap)
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
- The task that introduces the app scaffold must also update this `AGENTS.md`
  (Repo Map + Verification Rules) and pin `language`/`tags` in the caravan
  registry to match the chosen stack.

## Repo Map
Bootstrap only — no application code yet:
- `README.md` — what the repo is.
- `.gitignore` — stack-agnostic ignores; extend when the scaffold lands.
- `AGENTS.md` — this contract.

## Architecture Defaults
Undecided until the stack is chosen. Consumes the `argsea-site-api` HTTP API;
keep API access behind a small client seam rather than scattering fetch calls.

## Verification Rules
No build tooling exists yet — say so rather than claiming a run. Once the
scaffold lands, replace this with the smallest useful lint/typecheck/test/build
for the changed surface.

## Session Discipline
- Small tasks: one agent.
- Multi-agent: the assigned external session (or local `SESSION.md`) is the
  parent contract; one primary integrator owns consolidation.
- With no session and no explicit implementation request, stay in planning mode.

## Final Output Expectations
Report: what changed, files changed, verification run, known limitations/
follow-ups, and assumptions a human should review. Plain English.

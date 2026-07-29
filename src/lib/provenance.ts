// The maker's line: provenance is a fact, not a sticker. Three states and one
// wording for all of them, because the flagship rows, the light-list register
// and the entry overlay all print the same brass "built" row (design/
// Hello.dc.html, design/Projects.dc.html, design/ProjectOverlay.dc.html), and a
// third copy of the ternary is how they drift apart. Mirrors the
// one-helper-per-concern shape of lightChar.ts/carvings.ts, and is client-safe
// on purpose (type-only import from api.ts, erased at build time) so the
// overlay island can read it directly.

import type { Assist } from './api';

/**
 * How the light was built. Absent assist is the keeper alone; assist without
 * `only` is the keeper with an AI alongside; `only` is the AI on its own, with
 * the keeper checking after. The harness names the tool, never the model: the
 * model is the fine print, and it rides the title instead.
 */
export function builtLine(assist: Assist | undefined): string {
	if (!assist) {
		return 'by hand';
	}
	const harness = assist.harness || 'AI';
	if (assist.only) {
		return `by ${harness}, checked by hand`;
	}
	return `by hand, with ${harness} alongside`;
}

/** The fine print behind the built row: harness and model, whichever of them the wire actually carries. */
export function builtTitle(assist: Assist | undefined): string {
	if (!assist) {
		return '';
	}
	return [assist.harness, assist.model].filter(Boolean).join(' ');
}

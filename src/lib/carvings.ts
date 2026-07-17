// The single point that turns the carvings list into "what renders at spot
// X": a bolted carving's markup, or null when nothing's bolted there (the
// caller's built-in JSX/markup then stands, byte-identical to today). Mirrors
// the one-helper-per-concern shape of lightChar.ts/catSpots.ts. Client-safe on
// purpose (only a type-only import from api.ts, erased at build time): every
// island that swaps a built-in svg for a bolted one imports this directly.

import type { Carving } from './api';

export type CarvingSpot =
	| 'lighthouse-logo'
	| 'boat'
	| 'bottle'
	| 'tower-stub'
	| 'paw'
	| 'wave-line'
	| 'boat-wake'
	// the 2026-07-16 promote wave: hello
	| 'morse-seal'
	| 'panel-rose'
	| 'fleet-wake'
	// the wandering chart (the diorama boat/wake are their own swap points on
	// purpose, never the v1 boat/boat-wake spots, even though the geometry
	// matches today; the Flannan memorial trio is deliberately not a spot)
	| 'chart-rose'
	| 'sea-serpent'
	| 'moored-lamp'
	| 'adrift-boat'
	| 'adrift-wake'
	| 'marooned-palm'
	| 'port-anchor'
	| 'signal-flare'
	| 'compass-rose-star'
	| 'sail-tent'
	// 404
	| 'gull'
	| 'route-line'
	| 'buoy'
	// the phone-line tab bar (the hello tab rides lighthouse-logo)
	| 'compass'
	| 'notes-letter'
	// the Gull Post
	| 'delivery-gull';

// A bolted carving's animateable light element: the lighthouse-logo's pulsing
// flame, the tower-stub's beacon core, or any of the promote wave's lamps
// (morse-seal, moored-lamp, buoy; adrift-wake tags "wake" instead). A carving
// that doesn't tag one degrades to static art (graceful, loose-rules: never a
// crash over a missing shape). The per-spot [data-carving-anchor] rules in
// global.css/ShipsLog.css are what actually keep the CSS pulses running for a
// bolted carving; the characteristic engine's mounts (tower-stub) read this
// same flag to decide whether to hold their halo/core steady instead of
// igniting them.
const LAMP_ANCHOR = 'data-carving-anchor="lamp"';

/**
 * The markup bolted to `spot`, or null when nothing is. The bolt operation
 * writes two carvings (bolt the new holder, strip the old); a crash between
 * those writes can transiently leave a spot claimed by two carvings in the
 * GET list, so ties break on newest updatedAt, rather than either wire order
 * or an error over content that's momentarily ambiguous, never broken.
 */
export function boltedSvg(spot: CarvingSpot, carvings: Carving[]): string | null {
	const claimants = carvings.filter((carving) => (carving.boltedTo ?? []).includes(spot));
	if (claimants.length === 0) {
		return null;
	}
	return claimants.reduce((newest, carving) => (carving.updatedAt > newest.updatedAt ? carving : newest)).svg;
}

/**
 * The drawable children of a raw `<svg>...</svg>` string, stripped of the
 * outer tag: every mount keeps its own svg element (and its width/height/
 * viewBox, the thing that actually sizes it on the page) and only borrows a
 * bolted carving's inner drawing commands, so a carving's own outer
 * attributes never have to agree with the spot's sizing contract.
 */
export function innerMarkup(svg: string): string {
	const match = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
	return match ? match[1] : svg;
}

/** Whether a bolted carving's markup carries the lamp anchor the pulse/characteristic engine attaches to; null (nothing bolted) is never anchored. */
export function hasLampAnchor(svg: string | null): boolean {
	return svg != null && svg.includes(LAMP_ANCHOR);
}

/** A raw svg string as a CSS `url('data:image/svg+xml,...')` value, for the two mounts (wave-line, boat-wake) that tile as a background rather than render inline. Full percent-encoding, unlike the built-ins' own hand-trimmed literals, since a bolted carving's content isn't ours to assume is URL-safe. */
export function svgBackground(svg: string): string {
	return `url('data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, '%27')}')`;
}

// The beacon: first-party sighting pings to our own API and nothing else. A
// page reports only the five kinds and four flat fields the wire contract
// carries; the API answers 204 and derives everything sensitive server-side.
//
// Every path here is fail-silent by contract: a keeper's page must look and
// behave the same whether the API is up, down, or never configured. The beacon
// stays disarmed unless a public API base is baked in at build time, and it
// skips entirely when the visitor has asked not to be counted. Islands may
// import this (unlike api.ts); it never fetches content, only reports.

// The browser-reachable API base, inlined at build time. Empty (the dev and
// fixtures default) leaves the beacon disarmed, so nothing ever fires.
const BASE = (import.meta.env.PUBLIC_ARGSEA_API_URL ?? '').replace(/\/+$/, '');

type Kind = 'sail' | 'flip' | 'read' | 'visit' | 'bottle' | 'flare';

interface Sighting {
	kind:    Kind;
	path:    string;
	subject: string;
	ref:     string;
}

// A visitor flying doNotTrack or Global Privacy Control is not counted at all;
// read live so a mid-session change is honored by the next sighting.
function optedOut(): boolean {
	const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
	return navigator.doNotTrack === '1' || Boolean(nav.globalPrivacyControl);
}

function armed(): boolean {
	if (!BASE) {
		return false;
	}
	if (typeof navigator === 'undefined') {
		return false;
	}
	return !optedOut();
}

// sendBeacon is the primary path: it survives the page unload a closing tab or
// a navigation would otherwise cut short, and text/plain keeps it a simple
// request the API answers without a CORS preflight. fetch(keepalive) covers the
// rare browser with no sendBeacon or a queue that refuses the payload.
function send(sighting: Sighting): void {
	if (!armed()) {
		return;
	}
	const url = `${BASE}/1/sighting/`;
	const body = JSON.stringify(sighting);
	try {
		if (navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: 'text/plain' }))) {
			return;
		}
		void fetch(url, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'text/plain' } }).catch(() => {});
	} catch {
		// a sighting is never worth a thrown error on the keeper's page
	}
}

let sailed = false;
const flips = new Set<string>();
const reads = new Set<string>();
const visits = new Set<string>();
const flares = new Set<string>();

/** The page loaded: fired once per load from the base layout, carrying where we are and where the visitor came from. */
export function sightSail(): void {
	if (sailed) {
		return;
	}
	sailed = true;
	send({ kind: 'sail', path: location.pathname, subject: '', ref: document.referrer });
}

/** A light opened: fired once per project per page view, wherever the shared entry overlay mounts. */
export function sightFlip(id: string): void {
	if (!id || flips.has(id)) {
		return;
	}
	flips.add(id);
	send({ kind: 'flip', path: location.pathname, subject: id, ref: '' });
}

/** A journal note opened: fired once per note per page view, from the note overlay or a note pulled out of a light. */
export function sightRead(id: string): void {
	if (!id || reads.has(id)) {
		return;
	}
	reads.add(id);
	send({ kind: 'read', path: location.pathname, subject: id, ref: '' });
}

/** A hobby's bearing opened: fired once per hobby per page view, when its bearing card opens on the ship's log. */
export function sightVisit(id: string): void {
	if (!id || visits.has(id)) {
		return;
	}
	visits.add(id);
	send({ kind: 'visit', path: location.pathname, subject: id, ref: '' });
}

/**
 * A flare sent up for an overdue hobby: fired once per hobby per page view, like
 * a visit. The client can fire a hobby's flare again for its own UI, but the
 * beacon counts it once; the persistent tally the keeper reads lives in the
 * watch room, off the argsea-flares localStorage the card also keeps.
 */
export function sightFlare(id: string): void {
	if (!id || flares.has(id)) {
		return;
	}
	flares.add(id);
	send({ kind: 'flare', path: location.pathname, subject: id, ref: '' });
}

/** A bottle dropped: fired on every boat poke and never deduped, since each poke serves a fresh proverb. */
export function sightBottle(): void {
	send({ kind: 'bottle', path: location.pathname, subject: '', ref: '' });
}

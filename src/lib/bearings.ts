// The bearing vocabulary: how a hobby's state reads and how its pill and
// coordinates paint. Client-safe on purpose, like catSpots.ts: the wandering
// chart and the home page's overlay layer both render bearing cards, and an
// island must never reach into src/lib/api.ts to agree on what 'adrift' means.
//
// Only the shared vocabulary lives here. The chart's own projection (its
// lat/lon window, wake curves and diorama geometry) stays in ShipsLog, which
// is the only surface that plots a bearing rather than describing one.
import type { CSSProperties } from 'react';
import type { Coord, HobbyState } from './api';

interface StateMeta {
	label: string;
	c:     string;  // the rgb triple the pill/wake tint from
	solid: string;  // the flat hex the pill text/glyph paint
}

export const STATE_META: Record<HobbyState, StateMeta> = {
	moored:   { label: 'moored · home waters', c: '240,217,168', solid: '#f0d9a8' },
	adrift:   { label: 'adrift · lost at sea', c: '147,160,232', solid: '#93a0e8' },
	marooned: { label: 'marooned',             c: '147,160,232', solid: '#93a0e8' },
	port:     { label: 'made port',            c: '111,202,151', solid: '#6fca97' },
	inkspill: { label: 'bearing smudged',      c: '138,147,196', solid: '#8a93c4' },
};

/** Degrees and minutes with a hemisphere letter, the way the log writes a fix. */
export function fmtCoord(c: Coord): string {
	const dm = (v: number, pos: string, neg: string) => {
		const a = Math.abs(v);
		const d = Math.floor(a);
		const m = Math.round((a - d) * 60);
		return d + '°' + String(m).padStart(2, '0') + '′' + (v >= 0 ? pos : neg);
	};
	return dm(c.lat, 'N', 'S') + ' ' + dm(c.lon, 'E', 'W');
}

// The same five states in paper inks. A bearing card is cream, not open water,
// so the pill below washes out on it: these are the mock's own hobbyMeta values
// (design/Hello.dc.html), dark enough to sit on paper. A second palette rather
// than a lightness flag on the first, because the hues move too and not just
// the value: moored goes brass-on-cream where the chart has lamp-gold-on-navy.
const PAPER_META: Record<HobbyState, { c: string; ink: string }> = {
	moored:   { c: '150,120,40', ink: '#6b5518' },
	adrift:   { c: '90,100,170', ink: '#3d4680' },
	marooned: { c: '90,100,170', ink: '#3d4680' },
	port:     { c: '60,120,90',  ink: '#2c6446' },
	inkspill: { c: '90,95,140',  ink: '#464b74' },
};

/** The state pill as it paints on a paper card. Moored alone wears a dashed border, same as the chart's. */
export function paperPillStyle(state: HobbyState): CSSProperties {
	const m = PAPER_META[state];
	return {
		fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '.1em', textTransform: 'uppercase',
		padding: '3px 10px', borderRadius: '999px', whiteSpace: 'nowrap', flex: 'none',
		color: m.ink, border: `1px ${state === 'moored' ? 'dashed' : 'solid'} rgba(${m.c},0.5)`,
		background: `rgba(${m.c},0.12)`,
	};
}

/** The state pill over the chart's dark water. `on` brightens it for a card over a backdrop; moored alone wears a dashed border. */
export function pillStyle(state: HobbyState, on: boolean): CSSProperties {
	const m = STATE_META[state];
	return {
		fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '.1em', textTransform: 'uppercase',
		padding: '3px 10px', borderRadius: '999px', whiteSpace: 'nowrap', flex: 'none',
		color: m.solid, border: `1px ${state === 'moored' ? 'dashed' : 'solid'} rgba(${m.c},${on ? 0.6 : 0.45})`,
		background: `rgba(${m.c},${on ? 0.14 : 0.08})`,
	};
}

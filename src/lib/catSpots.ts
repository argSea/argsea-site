// The harbor cat's catalog of perches: the code side of the placement model
// (design/CLAUDE.md). Each spot is an id + page + pose + quip context + where
// it anchors; the copy doc only stores on/off per spot and per page. Client-
// safe on purpose: the director and the overlay islands both import this, and
// islands must never reach into src/lib/api.ts.
//
// The frozen cross-repo contract is the spot ids and the catPages/catSpots
// field names; the admin slice keys off these exact strings. Don't rename.

export type CatPage = 'hello' | 'projects' | 'hobbies' | 'notes' | 'p404';
export type CatPose = 'perched' | 'lying';
export type CatContext =
	| 'postcard' | 'note' | 'wreck' | 'header' | 'hero' | 'manifest'
	| 'graveyard' | 'contact' | 'card' | 'tag' | 'row' | 'next';

// A static spot's anchor: the element it rides and which edge/corner its paws
// rest on, plus an optional pixel nudge. The director measures the element and
// clamps the cat to the viewport.
export interface CatAnchor {
	selector: string;
	edge:     'top' | 'bottom';
	align:    'left' | 'center' | 'right';
	dx?:      number;
	dy?:      number;
}

export interface CatSpot {
	id:         string;       // frozen: matches the admin, e.g. 'hello.header'
	page:       CatPage;
	pose:       CatPose;
	context:    CatContext;   // which quip set the poke pulls from
	overlay:    boolean;      // true → shows only when its overlay opens (the owning island renders it)
	menuGated?: boolean;      // header spots: on desktop the director rides the nav link; on mobile the nav shows it in the open hamburger menu
	anchor?:    CatAnchor;    // static spots only
}

// Order is load-bearing for tests: each page lists its header first and its
// overlay last, so a seeded Math.random can pin a known spot.
export const CATALOG: CatSpot[] = [
	{ id: 'hello.header',    page: 'hello',    pose: 'lying',   context: 'header',    overlay: false, menuGated: true, anchor: { selector: '.site-nav .links a.active', edge: 'top', align: 'center', dy: 16 } },
	{ id: 'hello.hero',      page: 'hello',    pose: 'perched', context: 'hero',      overlay: false, anchor: { selector: '.hero__headline',            edge: 'top',    align: 'left'   } },
	{ id: 'hello.manifest',  page: 'hello',    pose: 'perched', context: 'manifest',  overlay: false, anchor: { selector: '.stores__grid',               edge: 'bottom', align: 'right'  } },
	{ id: 'hello.graveyard', page: 'hello',    pose: 'perched', context: 'graveyard', overlay: false, anchor: { selector: '.panel--graveyard .panel__chips', edge: 'top', align: 'right' } },
	{ id: 'hello.contact',   page: 'hello',    pose: 'perched', context: 'contact',   overlay: false, anchor: { selector: '.contact__headline',         edge: 'top',    align: 'center' } },
	{ id: 'hello.postcard',  page: 'hello',    pose: 'perched', context: 'postcard',  overlay: true },

	{ id: 'projects.header',    page: 'projects', pose: 'lying',   context: 'header', overlay: false, menuGated: true, anchor: { selector: '.site-nav .links a.active', edge: 'top', align: 'center', dy: 16 } },
	{ id: 'projects.filterTag', page: 'projects', pose: 'perched', context: 'tag',    overlay: false, anchor: { selector: '.filter-row .chip--active', edge: 'top', align: 'center', dy: -8 } },
	{ id: 'projects.card',      page: 'projects', pose: 'perched', context: 'card',   overlay: false, anchor: { selector: '.register__row', edge: 'top', align: 'right', dy: 32 } },
	{ id: 'projects.overlay',   page: 'projects', pose: 'perched', context: 'postcard', overlay: true },

	{ id: 'hobbies.header',   page: 'hobbies', pose: 'lying',   context: 'header',    overlay: false, menuGated: true, anchor: { selector: '.site-nav .links a.active', edge: 'top', align: 'center', dy: 16 } },
	{ id: 'hobbies.entry',    page: 'hobbies', pose: 'perched', context: 'graveyard', overlay: false, anchor: { selector: '.shipslog__row',       edge: 'top', align: 'right' } },
	{ id: 'hobbies.nextChip', page: 'hobbies', pose: 'perched', context: 'next',      overlay: false, anchor: { selector: '.shipslog__uncharted', edge: 'top', align: 'center', dy: 10 } },
	{ id: 'hobbies.record',   page: 'hobbies', pose: 'perched', context: 'note',      overlay: true },

	{ id: 'notes.header',  page: 'notes', pose: 'lying',   context: 'header', overlay: false, menuGated: true, anchor: { selector: '.site-nav .links a.active', edge: 'top', align: 'center', dy: 16 } },
	{ id: 'notes.row',     page: 'notes', pose: 'perched', context: 'row',    overlay: false, anchor: { selector: '.note-row',                   edge: 'top', align: 'right' } },
	{ id: 'notes.overlay', page: 'notes', pose: 'perched', context: 'note',   overlay: true },

	{ id: 'p404.wreck', page: 'p404', pose: 'perched', context: 'wreck', overlay: false, anchor: { selector: '.placard', edge: 'top', align: 'right' } },
];

// The narrow breakpoint where the nav collapses to a hamburger, kept in sync
// with the media query in Nav's stylesheet. Below it, header spots are menu-gated.
export const NAV_HAMBURGER_MAX = 600;

type Toggles = Record<string, boolean> | undefined;

// Absent = on, like the other egg fields: a missing map or a missing key
// lights the spot, so a fresh copy doc shows the whole catalog.
const on = (map: Toggles, key: string): boolean => map?.[key] ?? true;

export function spotEnabled(spot: CatSpot, catPages: Toggles, catSpots: Toggles): boolean {
	return on(catPages, spot.page) && on(catSpots, spot.id);
}

export function enabledSpots(page: CatPage, catPages: Toggles, catSpots: Toggles): CatSpot[] {
	return CATALOG.filter((spot) => spot.page === page && spotEnabled(spot, catPages, catSpots));
}

// One pick per page per view, memoized so the director and the overlay islands
// agree on the single spot; first caller in a page load decides, the rest read
// it back. A fresh page load gets a fresh module, so a refresh can move the cat.
const picks = new Map<CatPage, CatSpot | null>();

export function pageCatPick(page: CatPage, catPages: Toggles, catSpots: Toggles): CatSpot | null {
	if (!picks.has(page)) {
		const pool = enabledSpots(page, catPages, catSpots);
		picks.set(page, pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null);
	}
	return picks.get(page) ?? null;
}

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
	| 'ledger' | 'contact' | 'card' | 'tag' | 'row' | 'next' | 'chart' | 'watch';

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
	menuGated?: boolean;      // header spots: on desktop the director rides the nav link; below the tab-bar breakpoint the desktop nav is gone, so the spot stands down
	anchor?:    CatAnchor;    // static spots only
}

// Order is load-bearing for tests: each page lists its header first and its
// overlay last, so a seeded Math.random can pin a known spot.
export const CATALOG: CatSpot[] = [
	{ id: 'hello.header',    page: 'hello',    pose: 'lying',   context: 'header',    overlay: false, menuGated: true, anchor: { selector: '.site-nav .links a.active', edge: 'top', align: 'center', dy: 16 } },
	// The id stays frozen (admin contract) though the watch/register page gave
	// way to the keeper's landing (design/Hello.dc.html); the perch rode along
	// to the flagship register's own headline, still the page's hero content.
	{ id: 'hello.hero',      page: 'hello',    pose: 'perched', context: 'hero',      overlay: false, anchor: { selector: '.flagship .info b',          edge: 'top',    align: 'left'   } },
	// Anchorless: the now card's own mount (WatchCat.tsx) renders this pick
	// with the record's quips, so the director stands down the way it does for
	// overlay spots. An empty watch (no section built) leaves the pick catless
	// for that view, same as any missing anchor. This is the canon's own
	// placement (design/Hello.dc.html perches HarborCat on the now card).
	{ id: 'hello.watch',     page: 'hello',    pose: 'perched', context: 'watch',     overlay: false },
	// The id stays frozen (admin contract) though the stores ledge gave way to
	// the sea footer's own tug; the perch rode along to the manifest's crossing
	// (the sea itself, not the tug's hull: a 110s infinite crossing never fires
	// animationend, so the director would never re-measure it and the cat
	// would drift out of sync with the boat).
	{ id: 'hello.manifest',  page: 'hello',    pose: 'perched', context: 'manifest',  overlay: false, anchor: { selector: '.sea',                        edge: 'top',    align: 'right'  } },
	// The id stays frozen (admin contract) though the graveyard motif gave way
	// to the skills gag's own hobbies section; the perch rode along to its
	// heading rather than the gauge grid itself, which swaps a hidden fake
	// grid for the real one (display, not a class, so the director would
	// never know to re-measure once the swap moved the target out from under it).
	{ id: 'hello.graveyard', page: 'hello',    pose: 'perched', context: 'ledger',    overlay: false, anchor: { selector: '#hobby-title',                edge: 'top', align: 'right' } },
	// The id stays frozen (admin contract) though the contact band gave way to
	// the sea footer's own CTA; the perch rode along to its headline.
	{ id: 'hello.contact',   page: 'hello',    pose: 'perched', context: 'contact',   overlay: false, anchor: { selector: '.berth .big',                 edge: 'top',    align: 'center' } },
	// The id stays frozen (admin contract); the postcard rack it perched on is
	// gone and nothing on the keeper's landing opens an equivalent overlay
	// anymore, so no island ever checks for this pick. It stays in the pool
	// (unreachable, not disabled): the director already renders nothing for
	// any overlay-spot pick, so this just costs the page a cat on however
	// often the random pick happens to land here, same as it would for any
	// disabled spot.
	{ id: 'hello.postcard',  page: 'hello',    pose: 'perched', context: 'postcard',  overlay: true },

	{ id: 'projects.header',    page: 'projects', pose: 'lying',   context: 'header', overlay: false, menuGated: true, anchor: { selector: '.site-nav .links a.active', edge: 'top', align: 'center', dy: 16 } },
	{ id: 'projects.filterTag', page: 'projects', pose: 'perched', context: 'tag',    overlay: false, anchor: { selector: '.filter-row .chip--active', edge: 'top', align: 'center', dy: -8 } },
	{ id: 'projects.card',      page: 'projects', pose: 'perched', context: 'card',   overlay: false, anchor: { selector: '.register__row', edge: 'top', align: 'right', dy: 32 } },
	{ id: 'projects.overlay',   page: 'projects', pose: 'perched', context: 'postcard', overlay: true },

	{ id: 'hobbies.header',   page: 'hobbies', pose: 'lying',   context: 'header',    overlay: false, menuGated: true, anchor: { selector: '.site-nav .links a.active', edge: 'top', align: 'center', dy: 16 } },
	{ id: 'hobbies.entry',    page: 'hobbies', pose: 'perched', context: 'chart',     overlay: false, anchor: { selector: '.shipslog__row',       edge: 'top', align: 'right' } },
	{ id: 'hobbies.nextChip', page: 'hobbies', pose: 'perched', context: 'next',      overlay: false, anchor: { selector: '.shipslog__uncharted', edge: 'top', align: 'center', dy: 10 } },
	{ id: 'hobbies.record',   page: 'hobbies', pose: 'perched', context: 'chart',     overlay: true },

	{ id: 'notes.header',  page: 'notes', pose: 'lying',   context: 'header', overlay: false, menuGated: true, anchor: { selector: '.site-nav .links a.active', edge: 'top', align: 'center', dy: 16 } },
	{ id: 'notes.row',     page: 'notes', pose: 'perched', context: 'row',    overlay: false, anchor: { selector: '.note-row',                   edge: 'top', align: 'right' } },
	{ id: 'notes.overlay', page: 'notes', pose: 'perched', context: 'note',   overlay: true },

	{ id: 'p404.wreck', page: 'p404', pose: 'perched', context: 'wreck', overlay: false, anchor: { selector: '.placard', edge: 'top', align: 'right' } },
];

// The phone line: at or below this width the desktop nav gives way to the bottom
// tab bar, kept in sync with the media queries in Nav and TabBar. Below it,
// menu-gated header spots stand down.
export const NAV_TABBAR_MAX = 600;

type Toggles = Record<string, boolean> | undefined;

// Absent = on, like the other egg fields: a missing map or a missing key
// lights the spot, so a fresh copy doc shows the whole catalog.
const on = (map: Toggles, key: string): boolean => map?.[key] ?? true;

export function spotEnabled(spot: CatSpot, catPages: Toggles, catSpots: Toggles): boolean {
	return on(catPages, spot.page) && on(catSpots, spot.id);
}

export function enabledSpots(page: CatPage, catPages: Toggles, catSpots: Toggles): CatSpot[] {
	const pool = CATALOG.filter((spot) => spot.page === page && spotEnabled(spot, catPages, catSpots));
	// Operator ruling 2026-07-22 (homepage scope only): the keeper's landing
	// dropped the watch/register page's chrome the other hello.* spots used to
	// ride, and roosting on their new anchors (the flagship byline, the sea
	// itself, the skills heading, the footer CTA) reads as the cat wandering
	// the whole page rather than keeping the watch. Their ids stay in the
	// catalog frozen and still toggleable, just never in the homepage's pool.
	if ('hello' === page) {
		return pool.filter((spot) => 'hello.watch' === spot.id);
	}
	return pool;
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

// Build-time mock of the argsea-site-api, used only by e2e/bake.mjs.
// Serves the checked-in fixtures over the real wire routes so ApiSource is
// exercised end-to-end, with one twist per mode:
//   featured: the mantel moves to the LAST three projects by order, so a
//             homepage that merely sliced the first three would fail
//   fallback: nothing is featured, proving the order-fallback keeps the
//               homepage populated
// Both modes swap in a mock keeper profile so the specs can prove the contact
// band, socials, and sign-off are wired to the profile, not hardcoded.
//
// Usage: node e2e/mock-api.mjs <port> <featured|fallback>
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [port, mode] = process.argv.slice(2);
const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'fixtures');

const fixture = (name) => JSON.parse(readFileSync(join(fixturesDir, `${name}.json`), 'utf8'));

const MOCK_KEEPER = {
	name:     'Mock Keeper',
	pronouns: 'they/them',
	location: 'The Test Harbor',
	title:    'Keeper of Mocks',
	bio:      'Exists so the specs can tell profile data from hardcoded copy.',
	email:    'keeper@example.test',
	github:   'github.com/mock-keeper',
	linkedin: 'linkedin.com/in/mock-keeper',
	signoff:  '- the mock keeper',
};

// A kept watch so the mock builds render the split-watch section (the fixtures
// build ships EMPTY_WATCH, proving the collapse; only a live/mock API ever
// serves a kept one). Both hooks of the rack carry a print, so the specs can
// prove the second print (postcard2MediaId) renders below the first, and the
// watch cat is present for the ten-poke Gull Post finale. The prints point at
// committed test prints (e2e/test-prints, served by serve-dist.mjs).
const MOCK_WATCH = {
	id:               'mock-watch',
	letter:           'Most of my time right now goes to the ArcXP migration.\n\nDad the rest of the time, which is most of the time.',
	rotation:         'Out of the rotation on purpose: conference talks and the piano.',
	bearings:         [
		{ verb: 'wrangling', kind: 'none', targetId: '', name: 'The ArcXP migration' },
		{ verb: 'logging', kind: 'note', targetId: '', name: 'the journal' },
	],
	postcardMediaId:  'station-photo.svg',
	postcard2MediaId: 'queue-depth.svg',
	quips:            ['he says the migration is going fine. he is lying.', 'the lab grew again last night. i heard it.'],
	keptAt:           '2026-07-15T12:00:00Z',
};

// The featured cutoff is pinned to the original six fixture projects (4-6):
// later slices appended the dark "old publishing stack" light (order 7) and
// two tinkering lights (order 8-9) for the quick/morse timelines, and all
// three must stay out of this mock's featured trio or the home specs'
// hardcoded expectations break.
//
// Order 7 (The old publishing stack) also stands in for a pre-contract
// document: the live API can hand back JSON null for facts/noteIds on a
// project written before those fields existed, so this mock nulls them out
// on the one project no other spec's assertions depend on, proving the
// null-guards hold end to end rather than only against the checked-in
// fixtures (which always carry real arrays).
const projects = fixture('projects').map((project) => ({
	...project,
	featured: mode === 'featured' ? project.order >= 4 && project.order <= 6 : false,
	...(project.order === 7 ? { facts: null, noteIds: null } : {}),
}));

// The fallback build also bolts carvings the shipped fixtures never do (they
// carry only builtins and bolt nothing, so every spot falls back): a jar over
// `bottle`, proving a shop swap actually reaches a mount, and a tower-stub
// carving that carries no lamp anchor, proving the characteristic engine
// degrades to steady art instead of crashing when a carving doesn't tag the
// element it attaches to. The promote wave adds one bolt per new page region
// (hello / hobbies / 404 / tab bar); the buoy's carries no lamp anchor, so
// the CSS-side pulse must hold steady the same way the tower-stub's does.
const carvings = fixture('carvings').concat(mode === 'fallback' ? [{
	id:        'mock-carving-bottle-jar',
	name:      'Mock jar',
	svg:       '<svg width="32" height="20" viewBox="0 0 40 24" fill="none"><rect x="10" y="4" width="20" height="18" fill="#e78787"></rect><circle cx="20" cy="13" r="5" fill="#1b1f38"></circle></svg>',
	builtin:   false,
	boltedTo:  ['bottle'],
	createdAt: '2026-07-11T00:00:00Z',
	updatedAt: '2026-07-11T00:00:00Z',
}, {
	id:        'mock-carving-tower-no-anchor',
	name:      'Mock tower (no anchor)',
	svg:       '<svg width="26" height="34" viewBox="0 0 26 34" fill="none"><rect x="8" y="6" width="10" height="22" fill="#7a83ad"></rect></svg>',
	builtin:   false,
	boltedTo:  ['tower-stub'],
	createdAt: '2026-07-11T00:00:00Z',
	updatedAt: '2026-07-11T00:00:00Z',
}, {
	id:        'mock-carving-panel-rose-tile',
	name:      'Mock tile',
	svg:       '<svg width="36" height="36" viewBox="0 0 36 36" fill="none"><rect x="8" y="8" width="20" height="20" fill="#e78787"></rect></svg>',
	builtin:   false,
	boltedTo:  ['panel-rose'],
	createdAt: '2026-07-16T00:00:00Z',
	updatedAt: '2026-07-16T00:00:00Z',
}, {
	id:        'mock-carving-serpent-plank',
	name:      'Mock plank',
	svg:       '<svg width="72" height="26" viewBox="0 0 72 26" fill="none"><rect x="4" y="8" width="64" height="10" fill="#e78787"></rect></svg>',
	builtin:   false,
	boltedTo:  ['sea-serpent'],
	createdAt: '2026-07-16T00:00:00Z',
	updatedAt: '2026-07-16T00:00:00Z',
}, {
	id:        'mock-carving-buoy-no-anchor',
	name:      'Mock buoy (no anchor)',
	svg:       '<svg width="30" height="46" viewBox="0 0 30 46" fill="none"><rect x="8" y="6" width="14" height="34" fill="#7a83ad"></rect></svg>',
	builtin:   false,
	boltedTo:  ['buoy'],
	createdAt: '2026-07-16T00:00:00Z',
	updatedAt: '2026-07-16T00:00:00Z',
}, {
	id:        'mock-carving-notes-dot',
	name:      'Mock dot',
	svg:       '<svg width="19" height="22" viewBox="0 0 20 22" fill="none"><circle cx="10" cy="11" r="7" fill="currentColor"></circle></svg>',
	builtin:   false,
	boltedTo:  ['notes-letter'],
	createdAt: '2026-07-16T00:00:00Z',
	updatedAt: '2026-07-16T00:00:00Z',
}, {
	id:        'mock-carving-gull-plank',
	name:      'Mock plank',
	svg:       '<svg width="46" height="44" viewBox="0 0 46 44" fill="none"><rect x="8" y="14" width="30" height="12" fill="#8a6d3b"></rect></svg>',
	builtin:   false,
	boltedTo:  ['delivery-gull'],
	createdAt: '2026-07-17T00:00:00Z',
	updatedAt: '2026-07-17T00:00:00Z',
}, {
	id:        'mock-carving-hero-doodle-plank',
	name:      'Mock plank',
	svg:       '<svg width="72" height="86" viewBox="0 0 72 86" fill="none"><rect x="20" y="20" width="32" height="46" fill="#e78787"></rect></svg>',
	builtin:   false,
	boltedTo:  ['hero-doodle'],
	createdAt: '2026-07-22T00:00:00Z',
	updatedAt: '2026-07-22T00:00:00Z',
}] : []);

const routes = {
	'/1/project':                    projects,
	'/1/caselog':                    fixture('caselogs'),
	'/1/hobby':                      fixture('hobbies'),
	'/1/note':                       fixture('notes'),
	'/1/copy':                       fixture('siteCopy'),
	'/1/watch':                      MOCK_WATCH,
	'/1/user/mock-keeper/profile':   MOCK_KEEPER,
	// Nothing published: both mock builds prove the cat's built-in fallback,
	// while the fixtures build renders through the v1-seed shape path
	'/1/figurehead/published':       fixture('figurehead.empty'),
	'/1/suggestion':                 fixture('suggestions'),
	'/1/doodle':                     fixture('doodles'),
	'/1/carving/carvings':           carvings,
};

createServer((req, res) => {
	const path = new URL(req.url, `http://127.0.0.1:${port}`).pathname;
	const body = routes[path];
	if (!body) {
		res.writeHead(404).end();
		return;
	}
	res.writeHead(200, { 'content-type': 'application/json' });
	res.end(JSON.stringify(body));
}).listen(Number(port), '127.0.0.1');

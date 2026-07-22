// The single seam between the site and its content. Nothing else in the
// codebase fetches: pages call these functions in frontmatter and stay
// source-agnostic. Build-time only: never import this from an island
// (it reads process.env and bundles the fixtures).
//
// Two sources implement one contract:
//   - ApiSource:     build-time fetch from the Go API when ARGSEA_API_URL is set
//   - FixtureSource: checked-in JSON matching the wire format exactly
//
// API sharp edges honored here (caravan plan, "API contract caveats"):
//   - item routes reject a trailing slash; collections accept both, so we
//     standardize on no trailing slash
//   - reads pass ?published=true explicitly, so the build stays draft-free
//     even if it ever runs with ambient auth
//   - responses are bare entities/arrays; an empty list is [], never null
//   - rich text (body) is pre-sanitized HTML: render with set:html /
//     dangerouslySetInnerHTML, never re-sanitize
//   - timestamps are fixed-width RFC3339 strings, so string sort == chronological

import projectsFixture from '../data/fixtures/projects.json';
import caselogsFixture from '../data/fixtures/caselogs.json';
import hobbiesFixture from '../data/fixtures/hobbies.json';
import notesFixture from '../data/fixtures/notes.json';
import siteCopyFixture from '../data/fixtures/siteCopy.json';
import keeperProfileFixture from '../data/fixtures/keeperProfile.json';
import figureheadFixture from '../data/fixtures/figurehead.json';
import suggestionsFixture from '../data/fixtures/suggestions.json';
import doodlesFixture from '../data/fixtures/doodles.json';
import carvingsFixture from '../data/fixtures/carvings.json';
import type { CaseLogBlock } from './caseStudy';

export type Category = 'backend' | 'games' | 'this website' | 'tinkering';
export type Status = 'draft' | 'published' | 'archived';

export type StampShape = 'rect' | 'circle';
export type StampMotif = 'lighthouse' | 'boat' | 'sun' | 'wave' | 'moon' | 'anchor' | 'text';
export type StampInk = '#f0d9a8' | '#93a0e8';

// A postcard's corner stamp/postmark, designed per-project in the admin.
// Optional on the wire; older documents may not carry one.
export interface Stamp {
	shape:  StampShape;
	motif:  StampMotif;
	ink:    StampInk;
	cents?: string;  // rect stamps only, e.g. "3¢"
	text?:  string;  // motif 'text' only, ≤40 chars
}

// Where a project's postcard is pinned on the keeper's wall; x/y are
// percentages of the wall, rotation in degrees.
export interface WallPos {
	x:        number;
	y:        number;
	rotation: number;
}

export type LightKind = 'fixed' | 'flash' | 'occult' | 'iso' | 'quick' | 'veryquick' | 'morse';
export type LightColor = 'white' | 'red' | 'green';

// A project's navigational characteristic: how it burns on the coast.
export interface Light {
	kind:         LightKind;
	color:        LightColor;
	period:       number; // seconds per cycle, 0 for fixed/quick/veryquick
	extinguished: string; // year string, '' = burning
	letter:       string; // single A-Z, morse only; '' otherwise
}

// One fact-row on the flagship card (capped at 4, 2x2) and the entry overlay
// (all of them, up to the 6-item cap the data model itself holds to).
export interface ProjectFact {
	heading: string;
	fact:    string;
}

// A project's turn on the front page: the gull post runs some lights as
// news, not just postcards. headline/p1 anchor the story; deck/dateline/p2/
// caption fill in as the keeper wrote them. Optional: most projects never
// make the paper.
export interface ProjectGazette {
	headline:  string;
	deck?:     string;
	dateline?: string;
	p1:        string;
	p2?:       string;
	caption?:  string;
}

// Wire types mirror the argsea-site-api domain structs field-for-field.
export interface Project {
	id:           string;
	title:        string;
	category:     Category;
	tags:         string[];
	shortDesc:    string;      // "front of card"
	body:         string;      // sanitized HTML long-form
	moral:        string;
	postcardTo:   string;
	postcardFrom: string;
	postmarked:   string;      // freeform display string
	slug:         string;
	image:        string | null; // nullable media name (legacy single photo)
	stamp?:       Stamp | null;  // absent → the design's default stamp
	light:        Light | null;   // nullable: null burns as the default fixed white
	images:       string[] | null; // gallery media names, first print leads; null like tags, guard accordingly
	gazette?:     ProjectGazette; // the gull post's story on this light, absent when it never made the paper
	firstLit:     string;         // freeform year shown in the register
	order:        number;        // the keeper's manual sort key; the API sends the list pre-sorted
	wallPos:      WallPos | null; // pinned position on the projects page wall; null → not yet placed
	featured:     boolean;       // on the mantel → homepage postcards preview
	facts:        ProjectFact[] | null; // ≤6 heading/fact pairs; null on a pre-contract document, like images; guard accordingly
	noteIds:      string[] | null; // journal entries tied to this light, resolved at build time; null on a pre-contract document, guard accordingly
	flagship:     boolean;       // the one Hello hero project; distinct from featured
	status:       Status;
	publishedAt:  string;
	createdAt:    string;
	updatedAt:    string;
	hasLog?:      boolean;       // derived, not on the wire: a published case log points here, so /projects/<slug> exists (getProjects fills it)
}

// A published case study: the long-form log for a project, authored as typed
// blocks in the admin (the block union lives on src/lib/caseStudy.ts). The
// site's only read is GET /1/caselog?published=true at build time; the case-
// study route joins these to published projects on projectId.
export interface CaseLog {
	id:        string;
	projectId: string;
	status:    Status;
	title:     string;         // display title for lists
	blocks:    CaseLogBlock[];
}

// A hobby's disposition on the wandering chart: none of them sank, they just
// wandered to five different places. Moored ones never left home waters, port
// ones came in on purpose, the rest are somewhere between adrift and off the
// edge of the chart (see stateMeta on the ship's log for the labels).
export type HobbyState = 'moored' | 'port' | 'adrift' | 'marooned' | 'inkspill';

// A plotted position in degrees: latitude north-positive, longitude east-
// positive, so the argsea district's west longitudes come through negative,
// matching the chart's own projection window.
export interface Coord {
	lat: number;
	lon: number;
}

// The wire shape, field-for-field with the domain's Hobby struct. `coord` null
// means uncharted: the hobby shows in the log with an "uncharted" position but
// never gets a mark on the chart. `from` absent or null means no wake, so a
// hobby that never slipped its mooring draws no trail.
export interface Hobby {
	id:        string;
	name:      string;
	gauge?:    number;        // enthusiasm, self-assessed, suspiciously precise; homepage bars only
	service:   string;        // freeform tenure, e.g. "2021 · present"
	state:     HobbyState;
	coord:     Coord | null;  // null = uncharted: in the log, off the chart
	from?:     Coord | null;  // absent/null = no wake trail
	seasons:   string;        // the sounding beside the mark: seasons kept at it, not fathoms
	bearing:   string;        // the log row's own line and the mark's tooltip
	lastLog:   string;        // the bearing card's italic pull-quote
	offCourse: string;        // "how it went off course"
	floats:    string;        // "what still floats"
	odds:      string;        // "odds of return", on the row and the card
	tags?:     string[];      // the home strip's currently-learning side labels ("plex · htpc"); unused on the chart
	order:     number;        // the keeper's manual sort key
	noteIds:   string[] | null; // journal entries tucked into this bearing, resolved at build time by stable id (mirrors Project.noteIds, never title matching); null on a pre-contract document, guard accordingly
}

export interface Note {
	id:            string;
	title:         string;
	teaser:        string;
	body:          string;  // sanitized HTML
	date:          string;  // freeform display string, e.g. "jun 2026"
	conditions:    string;  // the log-style dek, e.g. "fog inland · desktop suspiciously calm"
	wx?:           string;  // canon's weather line for the entry; not yet read by any page
	doodleCaption: string;  // the handwritten quip beside the doodle; "" when there's no doodle
	doodleId:      string | null;
	doodle?:       string;  // canon's doodle name for the entry (e.g. "boat", "queue"); not yet read by any page
	status:        Status;
	publishedAt:   string;
	createdAt:     string;
	updatedAt:     string;
}

// What a bearing on the current watch points at: a light (project), a hobby,
// a note, or nothing at all; "none" renders as plain text, never a link.
export type BearingKind = 'none' | 'light' | 'hobby' | 'note';

// One TL;DR bearing on the current watch: a verb ("wrangling"), the name the
// strip shows, and the record it steers to (resolved to a route at build time).
export interface WatchBearing {
	verb:     string;
	kind:     BearingKind;
	targetId: string;
	name:     string;
}

// The current watch singleton (GET /1/watch): the keeper's letter from right
// now, the TL;DR bearings strip (≤3 on the wire), the season's postcard, and
// the perched cat's lines. An empty letter is the wire's "no current watch":
// the front door collapses the whole section rather than render an empty box.
export interface Watch {
	id:               string;
	letter:           string;   // plain text; blank lines split paragraphs
	rotation:         string;   // the italic "out of the rotation" line; '' = none
	bearings:         WatchBearing[];
	postcardMediaId:  string;   // media name for the season's first print; '' = the first hook bare
	postcard2MediaId: string;   // media name for the rack's second print; '' = the second hook bare, same guard as the first
	quips:            string[]; // the watch panel cat's lines
	keptAt:           string;   // RFC3339; renders "kept {d mmm}" and "from the season · {mmm yyyy}"
}

// The empty watch: what no record, an unreachable API, and the fixtures build
// all collapse to, so every source agrees on the one collapse signal.
const EMPTY_WATCH: Watch = {
	id:               '',
	letter:           '',
	rotation:         '',
	bearings:         [],
	postcardMediaId:  '',
	postcard2MediaId: '',
	quips:            [],
	keptAt:           '',
};

// The smuggler's cove master switches: which easter eggs are live. Absent on
// the wire reads as on; an older copy document must not silently sink an egg.
export interface EggToggles {
	bottle: boolean;
	cat:    boolean;
	lights: boolean;
}

// The harbor cat's catalog toggles: a page master switch and a per-spot switch,
// both absent = on (a fresh copy doc lights the whole catalog). The spot ids and
// these field names are the frozen contract shared with the admin: see
// src/lib/catSpots.ts for the catalog they key against.
export type CatPages = Record<string, boolean>;
export type CatSpots = Record<string, boolean>;

// An entry in the light list: a real lighthouse for the 404 wreck report.
export interface Lighthouse {
	name: string;
	pos:  string;  // display coordinates, e.g. "51°23′N 9°36′W"
	line: string;  // the one-liner the coordinate flip reveals
}

// One drawer of the keeper's stores, edited on the admin's tool bench: a mono
// label ("languages") and the tools shelved under it.
export interface StoreDrawer {
	label: string;
	tools: string[];
}

// The gull post's front-page dressing: the volume line and the "presently
// chasing" blurb the gazette page wears above the fold. Optional: an older
// copy document may not carry it yet.
export interface SiteGazette {
	vol:       string;
	presently: string;
}

// The "signal flags" singleton: the little lines of copy that fly over every
// page, plus the smuggler's cove (easter-egg toggles and their content). All
// text fields are plain text; the API does not sanitize them as HTML, so
// render them as text, never with set:html.
export interface SiteCopy {
	id:             string;
	quipHello:      string;
	quipProjects:   string;
	quipHobbies:    string;
	quipNotes:      string;
	quip404:        string;
	heroKicker:     string;
	heroHeadline:   string;
	heroBody:       string;
	dict:           string;
	stores?:        StoreDrawer[] | null; // the tool bench's drawers (≤4); absent/empty → the home page's approved design copy
	eggs:           EggToggles;
	catPages:       CatPages;    // per-page master switch for the harbor cat
	catSpots:       CatSpots;    // per-spot switch, keyed by the frozen spot ids
	bottleProverbs: string[];    // emptied by the keeper = the bottle egg is off
	lighthouses:    Lighthouse[]; // emptied = plain "last position: 404", no flip
	gazette?:       SiteGazette; // the gazette page's masthead dressing; absent → the page's own approved copy
	wallGhost?:     { x: number; y: number; rotation: number; enabled: boolean } | null; // the projects wall's ghost placard; null/absent → the page default position, enabled
	updatedAt:      string;
}

/** The per-page footer quip fields of SiteCopy. */
export type QuipField = 'quipHello' | 'quipProjects' | 'quipHobbies' | 'quipNotes' | 'quip404';

// The keeper's papers: the public profile subset of the keeper's user document
// (GET /1/user/{id}/profile; never username/password/role). The contact band,
// footer socials, and the note sign-off read from these at build time.
export interface KeeperProfile {
	name:     string;
	pronouns: string;
	location: string;
	title:    string;
	bio:      string;
	email:    string;
	github:   string;  // host path, e.g. "github.com/argsea" (no scheme on the wire)
	linkedin: string;
	signoff:  string;  // how notes end, e.g. "- j"
}

export type FigureheadShapeType = 'path' | 'ellipse' | 'rect' | 'line';
export type FigureheadRole = 'tail' | 'eyes' | 'body';

// One stored shape of a figurehead design (caravan contract: figurehead.md).
// Structured shapes only; no markup is ever stored. An absent optional field
// means the SVG attribute default; renderers write only the fields present.
export interface FigureheadShape {
	id:           string;
	type:         FigureheadShapeType;
	d?:           string;            // path
	cx?:          number;            // ellipse (circles: rx == ry)
	cy?:          number;
	rx?:          number;
	ry?:          number;
	x?:           number;            // rect
	y?:           number;
	w?:           number;
	h?:           number;
	x1?:          number;            // line
	y1?:          number;
	x2?:          number;
	y2?:          number;
	fill?:        string;
	stroke?:      string;
	strokeWidth?: number;
	opacity?:     number;
	linecap?:     string;
	linejoin?:    string;
	role?:        FigureheadRole;    // drives the canonical animations; untagged = static
	origin?:      [number, number];  // animation transform-origin
}

// A figurehead design: the harbor cat's shape model, one published per pose.
// The v1 seeds mirror the built-in HarborCat SVGs shape-for-shape.
export interface FigureheadDesign {
	id:        string;
	pose:      'perched' | 'lying';
	label:     string;
	viewBox:   string;
	shapes:    FigureheadShape[];  // always [] on the wire, never null
	published: boolean;
	seed:      boolean;
	createdAt: string;
	updatedAt: string;
}

// A doodle: the keeper's marginalia, a small hand-drawn shape attached to a
// note. Structured geometry only, same contract as a figurehead design: no
// stored markup, ever.
export interface Doodle {
	id:      string;
	name:    string;
	viewBox: string;
	shapes:  FigureheadShape[];
}

// A "next: ???" suggestion for the hobbies page chip: public, no auth.
export interface Suggestion {
	id:    string;
	value: string;
	order: number;
}

// A carving from the carving shop: any site svg (minus doodles) the keeper
// can bolt onto its spot. svg is a full, standalone markup string, unlike
// the figurehead/doodle contracts' structured shapes; the site never stores
// markup itself, only borrows a bolted carving's at build time (src/lib/
// carvings.ts). boltedTo is the spot id list it's mounted to, e.g.
// ['bottle']; null/absent means it isn't bolted anywhere, same guard
// precedent as images/facts/noteIds on a pre-contract document.
export interface Carving {
	id:        string;
	name:      string;
	svg:       string;
	builtin:   boolean;
	boltedTo:  string[] | null;
	createdAt: string;
	updatedAt: string;
}

export interface ContentSource {
	getProjects(): Promise<Project[]>;
	getCaseLogs(): Promise<CaseLog[]>;
	getHobbies(): Promise<Hobby[]>;
	getNotes(): Promise<Note[]>;
	getSiteCopy(): Promise<SiteCopy>;
	getWatch(): Promise<Watch>;
	getKeeperProfile(): Promise<KeeperProfile>;
	getFigurehead(): Promise<FigureheadDesign[]>;
	getSuggestions(): Promise<Suggestion[]>;
	getDoodles(): Promise<Doodle[]>;
	getCarvings(): Promise<Carving[]>;
}

class ApiSource implements ContentSource {
	constructor(private readonly baseUrl: string, private readonly keeperId: string) {}

	/** Fetch a bare collection from the API; throws on any non-2xx so a broken build never ships empty pages. */
	private async list<T>(path: string): Promise<T[]> {
		const url = `${this.baseUrl}${path}?published=true`;
		const res = await fetch(url);
		if (!res.ok) {
			throw new Error(`argsea api: GET ${url} responded ${res.status}`);
		}
		return await res.json() as T[];
	}

	getProjects(): Promise<Project[]> { return this.list<Project>('/1/project'); }
	getCaseLogs(): Promise<CaseLog[]> { return this.list<CaseLog>('/1/caselog'); }
	getHobbies(): Promise<Hobby[]> { return this.list<Hobby>('/1/hobby'); }
	getNotes(): Promise<Note[]> { return this.list<Note>('/1/note'); }

	/** The copy singleton is public and not lifecycle-gated, so no ?published flag. */
	async getSiteCopy(): Promise<SiteCopy> {
		const url = `${this.baseUrl}/1/copy`;
		const res = await fetch(url);
		if (!res.ok) {
			throw new Error(`argsea api: GET ${url} responded ${res.status}`);
		}
		return await res.json() as SiteCopy;
	}

	/**
	 * The current watch singleton: public and not lifecycle-gated, like the copy
	 * singleton, so no ?published flag. Never fails the build: unreachable/error/
	 * empty all read as "no current watch" (an empty letter), and the front door
	 * collapses the section instead. `?? EMPTY_WATCH` guards a 200 with a bare
	 * null body, same precedent as getCarvings.
	 */
	async getWatch(): Promise<Watch> {
		try {
			const res = await fetch(`${this.baseUrl}/1/watch`);
			if (!res.ok) {
				return EMPTY_WATCH;
			}
			const doc = await res.json() as Watch | null;
			if (!doc) {
				return EMPTY_WATCH;
			}
			// An API from before the empty-holds fix marshals a never-kept
			// watch's nil slices as null; a kept letter with null holds would
			// break the build at bearings.map, so normalize on arrival. The
			// second-print field may not exist yet on an API predating the
			// two-hook rack; absent reads exactly like an emptied string, the
			// second hook bare, same as the first print's own guard.
			return { ...doc, bearings: doc.bearings ?? [], quips: doc.quips ?? [], postcard2MediaId: doc.postcard2MediaId ?? '' };
		} catch {
			return EMPTY_WATCH;
		}
	}

	/** The profile route is public (no auth, no ?published flag) but needs the keeper's user id from build config. */
	async getKeeperProfile(): Promise<KeeperProfile> {
		if (!this.keeperId) {
			throw new Error('argsea api: ARGSEA_KEEPER_ID must be set alongside ARGSEA_API_URL; a live build must not ship the fixture profile');
		}
		const url = `${this.baseUrl}/1/user/${this.keeperId}/profile`;
		const res = await fetch(url);
		if (!res.ok) {
			throw new Error(`argsea api: GET ${url} responded ${res.status}`);
		}
		return await res.json() as KeeperProfile;
	}

	/**
	 * The published figurehead designs: public, one per pose, no ?published flag
	 * (the route only ever serves published). Unlike the content fetches this one
	 * never fails the build: absent/empty/unreachable all mean "no published
	 * designs", and the cat falls back to its built-in poses.
	 */
	async getFigurehead(): Promise<FigureheadDesign[]> {
		try {
			const res = await fetch(`${this.baseUrl}/1/figurehead/published`);
			return res.ok ? await res.json() as FigureheadDesign[] : [];
		} catch {
			return [];
		}
	}

	/** The next-hobby chip's suggestions: public, no ?published flag. Never fails the build: unreachable/error just leaves the chip on its "???" default. */
	async getSuggestions(): Promise<Suggestion[]> {
		try {
			const res = await fetch(`${this.baseUrl}/1/suggestion`);
			return res.ok ? await res.json() as Suggestion[] : [];
		} catch {
			return [];
		}
	}

	/** The keeper's doodles: public, no ?published flag. Never fails the build: unreachable/error just leaves notes with no doodle to join. */
	async getDoodles(): Promise<Doodle[]> {
		try {
			const res = await fetch(`${this.baseUrl}/1/doodle`);
			return res.ok ? await res.json() as Doodle[] : [];
		} catch {
			return [];
		}
	}

	/**
	 * The carving catalog: public, no ?published flag. Never fails the build,
	 * same precedent as getFigurehead: absent/empty/unreachable, or an API that
	 * predates the contract outright, all just mean every spot renders its
	 * built-in. `?? []` guards a 200 that hands back a bare `null` body too.
	 */
	async getCarvings(): Promise<Carving[]> {
		try {
			const res = await fetch(`${this.baseUrl}/1/carving/carvings`);
			return res.ok ? (await res.json() as Carving[] | null) ?? [] : [];
		} catch {
			return [];
		}
	}
}

class FixtureSource implements ContentSource {
	getProjects(): Promise<Project[]> { return Promise.resolve(projectsFixture as Project[]); }
	getCaseLogs(): Promise<CaseLog[]> { return Promise.resolve(caselogsFixture as CaseLog[]); }
	getHobbies(): Promise<Hobby[]> { return Promise.resolve(hobbiesFixture as Hobby[]); }
	getNotes(): Promise<Note[]> { return Promise.resolve(notesFixture as Note[]); }
	getSiteCopy(): Promise<SiteCopy> { return Promise.resolve(siteCopyFixture as SiteCopy); }
	// No watch fixture on purpose: an offline build proves the empty-watch
	// collapse (the section only ever renders against a live API with a kept watch)
	getWatch(): Promise<Watch> { return Promise.resolve(EMPTY_WATCH); }
	getKeeperProfile(): Promise<KeeperProfile> { return Promise.resolve(keeperProfileFixture as KeeperProfile); }
	getFigurehead(): Promise<FigureheadDesign[]> { return Promise.resolve(figureheadFixture as FigureheadDesign[]); }
	getSuggestions(): Promise<Suggestion[]> { return Promise.resolve(suggestionsFixture as Suggestion[]); }
	getDoodles(): Promise<Doodle[]> { return Promise.resolve(doodlesFixture as Doodle[]); }
	getCarvings(): Promise<Carving[]> { return Promise.resolve(carvingsFixture as Carving[]); }
}

// ARGSEA_API_URL set → build against the live API; unset → checked-in fixtures.
// ARGSEA_KEEPER_ID rides alongside it: the keeper's user id for the profile route.
// import.meta.env carries .env-file values, process.env carries the shell's.
const API_URL = (import.meta.env.ARGSEA_API_URL ?? process.env.ARGSEA_API_URL ?? '').replace(/\/+$/, '');
const KEEPER_ID = (import.meta.env.ARGSEA_KEEPER_ID ?? process.env.ARGSEA_KEEPER_ID ?? '').trim();

const source: ContentSource = API_URL ? new ApiSource(API_URL, KEEPER_ID) : new FixtureSource();

/** Projects by the keeper's manual `order` key (ties: createdAt), each flagged `hasLog` when a published case log points at it; the API pre-sorts, this just holds fixtures to the same rule. */
export async function getProjects(): Promise<Project[]> {
	const [projects, caseLogs] = await Promise.all([source.getProjects(), getCaseLogs()]);
	const logged = new Set(caseLogs.map((log) => log.projectId));
	return projects
		.map((project) => ({ ...project, hasLog: logged.has(project.id) }))
		.sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
}

// Memoized: getProjects asks for the hasLog join and the case-study route asks
// to render, both per build, and the published set can't change mid-build.
let caseLogsPromise: Promise<CaseLog[]> | undefined;

/** The published case logs; the case-study route joins them to published projects on projectId. */
export function getCaseLogs(): Promise<CaseLog[]> {
	caseLogsPromise ??= source.getCaseLogs();
	return caseLogsPromise;
}

/** Hobbies by the keeper's manual `order` key; the API pre-sorts, this holds the fixtures to the same rule. */
export async function getHobbies(): Promise<Hobby[]> {
	return (await source.getHobbies()).sort((a, b) => a.order - b.order);
}

/** Notes newest-first; RFC3339 strings compare chronologically. */
export async function getNotes(): Promise<Note[]> {
	return (await source.getNotes()).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

// Memoized: the layout asks on every page and the singleton can't change
// mid-build. Any field the API leaves empty falls back to the design copy:
// a fresh database may not have the singleton populated yet.
let siteCopyPromise: Promise<SiteCopy> | undefined;

export function getSiteCopy(): Promise<SiteCopy> {
	siteCopyPromise ??= source.getSiteCopy().then(withCopyDefaults);
	return siteCopyPromise;
}

/** The keeper's current watch; an empty letter means none is kept and the home section collapses. */
export function getWatch(): Promise<Watch> {
	return source.getWatch();
}

// Memoized for the same reason as SiteCopy: the footer asks on every page.
let keeperProfilePromise: Promise<KeeperProfile> | undefined;

/** The keeper's papers: served as the API returns them, no fixture backfill of cleared fields. */
export function getKeeperProfile(): Promise<KeeperProfile> {
	keeperProfilePromise ??= source.getKeeperProfile();
	return keeperProfilePromise;
}

// Memoized like SiteCopy: the layout asks on every page for the same designs.
let figureheadPromise: Promise<FigureheadDesign[]> | undefined;

/** The published figurehead designs the cat renders in place of its built-in poses; [] = built-ins. */
export function getFigurehead(): Promise<FigureheadDesign[]> {
	figureheadPromise ??= source.getFigurehead();
	return figureheadPromise;
}

/** The next-hobby chip's suggestions by their manual `order` key. */
export async function getSuggestions(): Promise<Suggestion[]> {
	return (await source.getSuggestions()).sort((a, b) => a.order - b.order);
}

/** The keeper's doodles, joined onto notes by `doodleId`; [] = no doodle renders anywhere. */
export function getDoodles(): Promise<Doodle[]> {
	return source.getDoodles();
}

// Memoized like SiteCopy/getFigurehead: every mount across every page asks
// for the same list to resolve its own spot.
let carvingsPromise: Promise<Carving[]> | undefined;

/** The carving catalog; src/lib/carvings.ts resolves it per spot. [] = every mount renders its built-in. */
export function getCarvings(): Promise<Carving[]> {
	carvingsPromise ??= source.getCarvings();
	return carvingsPromise;
}

/** Fill empty/missing SiteCopy fields from the approved design copy. */
function withCopyDefaults(copy: SiteCopy): SiteCopy {
	const defaults = siteCopyFixture as SiteCopy;
	const merged = { ...copy };
	// Generic over the key so the per-field assignment typechecks; only absent
	// fields backfill; an emptied array is the keeper turning an egg off.
	const backfill = <K extends keyof SiteCopy>(key: K) => {
		if (!merged[key]) {
			merged[key] = defaults[key];
		}
	};
	for (const key of Object.keys(defaults) as (keyof SiteCopy)[]) {
		backfill(key);
	}
	// The toggle objects merge per-field: a document from before a toggle
	// existed reads as on, while an explicit false stays false.
	merged.eggs = { ...defaults.eggs, ...copy.eggs };
	// The cat toggles merge per-key on top of the all-on defaults, so absent =
	// on holds while an explicit false stays off.
	merged.catPages = { ...defaults.catPages, ...copy.catPages };
	merged.catSpots = { ...defaults.catSpots, ...copy.catSpots };
	return merged;
}

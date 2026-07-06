// The single seam between the site and its content. Nothing else in the
// codebase fetches: pages call these functions in frontmatter and stay
// source-agnostic. Build-time only — never import this from an island
// (it reads process.env and bundles the fixtures).
//
// Two sources implement one contract:
//   - ApiSource     — build-time fetch from the Go API when ARGSEA_API_URL is set
//   - FixtureSource — checked-in JSON matching the wire format exactly
//
// API sharp edges honored here (caravan plan, "API contract caveats"):
//   - item routes reject a trailing slash; collections accept both — we
//     standardize on no trailing slash
//   - reads pass ?published=true explicitly, so the build stays draft-free
//     even if it ever runs with ambient auth
//   - responses are bare entities/arrays; an empty list is [], never null
//   - rich text (body) is pre-sanitized HTML — render with set:html /
//     dangerouslySetInnerHTML, never re-sanitize
//   - timestamps are fixed-width RFC3339 strings, so string sort == chronological

import projectsFixture from '../data/fixtures/projects.json';
import hobbiesFixture from '../data/fixtures/hobbies.json';
import notesFixture from '../data/fixtures/notes.json';
import siteCopyFixture from '../data/fixtures/siteCopy.json';
import keeperProfileFixture from '../data/fixtures/keeperProfile.json';

export type Category = 'backend' | 'games' | 'this website' | 'tinkering';
export type Status = 'draft' | 'published' | 'archived';

export type StampShape = 'rect' | 'circle';
export type StampMotif = 'lighthouse' | 'boat' | 'sun' | 'wave' | 'moon' | 'anchor' | 'text';
export type StampInk = '#f0d9a8' | '#93a0e8';

// A postcard's corner stamp/postmark, designed per-project in the admin.
// Optional on the wire — older documents may not carry one.
export interface Stamp {
	shape:  StampShape;
	motif:  StampMotif;
	ink:    StampInk;
	cents?: string;  // rect stamps only, e.g. "3¢"
	text?:  string;  // motif 'text' only, ≤40 chars
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
	image:        string | null; // nullable media name
	stamp?:       Stamp | null;  // absent → the design's default stamp
	order:        number;        // the keeper's manual sort key; the API sends the list pre-sorted
	featured:     boolean;       // on the mantel → homepage postcards preview
	status:       Status;
	publishedAt:  string;
	createdAt:    string;
	updatedAt:    string;
}

export interface Hobby {
	id:        string;
	name:      string;
	dates:     string;  // freeform display string
	active:    boolean;
	epitaph:   string;
	eulogy:    string;
	tags:      string[];
	order:     number;  // the keeper's manual sort key
	createdAt: string;
	updatedAt: string;
}

export interface Note {
	id:          string;
	title:       string;
	teaser:      string;
	body:        string;  // sanitized HTML
	date:        string;  // freeform display string, e.g. "jun 2026"
	image:       string | null;
	status:      Status;
	publishedAt: string;
	createdAt:   string;
	updatedAt:   string;
}

// The smuggler's hold master switches: which easter eggs are live. Absent on
// the wire reads as on — an older copy document must not silently sink an egg.
export interface EggToggles {
	bottle: boolean;
	cat:    boolean;
	lights: boolean;
}

// Where the harbor cat is allowed to perch, per location.
export interface CatLocs {
	postcards: boolean;
	notes:     boolean;
	p404:      boolean;
}

// An entry in the light list: a real lighthouse for the 404 wreck report.
export interface Lighthouse {
	name: string;
	pos:  string;  // display coordinates, e.g. "51°23′N 9°36′W"
	line: string;  // the one-liner the coordinate flip reveals
}

// The "signal flags" singleton: the little lines of copy that fly over every
// page, plus the smuggler's hold (easter-egg toggles and their content). All
// text fields are plain text — the API does not sanitize them as HTML, so
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
	eggs:           EggToggles;
	catLocs:        CatLocs;
	bottleProverbs: string[];    // emptied by the keeper = the bottle egg is off
	lighthouses:    Lighthouse[]; // emptied = plain "last position: 404", no flip
	updatedAt:      string;
}

/** The per-page footer quip fields of SiteCopy. */
export type QuipField = 'quipHello' | 'quipProjects' | 'quipHobbies' | 'quipNotes' | 'quip404';

// The keeper's papers: the public profile subset of the keeper's user document
// (GET /1/user/{id}/profile — never username/password/role). The contact band,
// footer socials, and the note sign-off read from these at build time.
export interface KeeperProfile {
	name:     string;
	pronouns: string;
	location: string;
	title:    string;
	bio:      string;
	email:    string;
	github:   string;  // host path, e.g. "github.com/argsea" — no scheme on the wire
	linkedin: string;
	signoff:  string;  // how notes end, e.g. "— j"
}

export interface ContentSource {
	getProjects(): Promise<Project[]>;
	getHobbies(): Promise<Hobby[]>;
	getNotes(): Promise<Note[]>;
	getSiteCopy(): Promise<SiteCopy>;
	getKeeperProfile(): Promise<KeeperProfile>;
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

	/** The profile route is public (no auth, no ?published flag) but needs the keeper's user id from build config. */
	async getKeeperProfile(): Promise<KeeperProfile> {
		if (!this.keeperId) {
			throw new Error('argsea api: ARGSEA_KEEPER_ID must be set alongside ARGSEA_API_URL — a live build must not ship the fixture profile');
		}
		const url = `${this.baseUrl}/1/user/${this.keeperId}/profile`;
		const res = await fetch(url);
		if (!res.ok) {
			throw new Error(`argsea api: GET ${url} responded ${res.status}`);
		}
		return await res.json() as KeeperProfile;
	}
}

class FixtureSource implements ContentSource {
	getProjects(): Promise<Project[]> { return Promise.resolve(projectsFixture as Project[]); }
	getHobbies(): Promise<Hobby[]> { return Promise.resolve(hobbiesFixture as Hobby[]); }
	getNotes(): Promise<Note[]> { return Promise.resolve(notesFixture as Note[]); }
	getSiteCopy(): Promise<SiteCopy> { return Promise.resolve(siteCopyFixture as SiteCopy); }
	getKeeperProfile(): Promise<KeeperProfile> { return Promise.resolve(keeperProfileFixture as KeeperProfile); }
}

// ARGSEA_API_URL set → build against the live API; unset → checked-in fixtures.
// ARGSEA_KEEPER_ID rides alongside it: the keeper's user id for the profile route.
// import.meta.env carries .env-file values, process.env carries the shell's.
const API_URL = (import.meta.env.ARGSEA_API_URL ?? process.env.ARGSEA_API_URL ?? '').replace(/\/+$/, '');
const KEEPER_ID = (import.meta.env.ARGSEA_KEEPER_ID ?? process.env.ARGSEA_KEEPER_ID ?? '').trim();

const source: ContentSource = API_URL ? new ApiSource(API_URL, KEEPER_ID) : new FixtureSource();

/** Projects by the keeper's manual `order` key (ties: createdAt) — the API pre-sorts, this just holds fixtures to the same rule. */
export async function getProjects(): Promise<Project[]> {
	return (await source.getProjects()).sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
}

/** Hobbies by their manual `order` key: the headstones are arranged by hand. */
export async function getHobbies(): Promise<Hobby[]> {
	return (await source.getHobbies()).sort((a, b) => a.order - b.order);
}

/** Notes newest-first; RFC3339 strings compare chronologically. */
export async function getNotes(): Promise<Note[]> {
	return (await source.getNotes()).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

// Memoized: the layout asks on every page and the singleton can't change
// mid-build. Any field the API leaves empty falls back to the design copy —
// a fresh database may not have the singleton populated yet.
let siteCopyPromise: Promise<SiteCopy> | undefined;

export function getSiteCopy(): Promise<SiteCopy> {
	siteCopyPromise ??= source.getSiteCopy().then(withCopyDefaults);
	return siteCopyPromise;
}

// Memoized for the same reason as SiteCopy: the footer asks on every page.
let keeperProfilePromise: Promise<KeeperProfile> | undefined;

/** The keeper's papers — served as the API returns them, no fixture backfill of cleared fields. */
export function getKeeperProfile(): Promise<KeeperProfile> {
	keeperProfilePromise ??= source.getKeeperProfile();
	return keeperProfilePromise;
}

/** Fill empty/missing SiteCopy fields from the approved design copy. */
function withCopyDefaults(copy: SiteCopy): SiteCopy {
	const defaults = siteCopyFixture as SiteCopy;
	const merged = { ...copy };
	// Generic over the key so the per-field assignment typechecks; only absent
	// fields backfill — an emptied array is the keeper turning an egg off.
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
	merged.catLocs = { ...defaults.catLocs, ...copy.catLocs };
	return merged;
}

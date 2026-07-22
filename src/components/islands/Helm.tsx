// The helm: a working Mercator chart of the Flannan grounds, transcribed from
// design/TheChart.dc.html. The mock's boot() is one big framework-free script
// that builds the whole chart (graticule, coastline, marks, the rail, the
// sheet, the memorial, the boat) with direct DOM calls and one shared
// requestAnimationFrame clock; that structure ports over almost verbatim into
// a single effect here rather than a React re-render tree, since re-deriving
// it declaratively would risk the physics (drag, sail, wake) it depends on.
// The island only supplies mount/prop delivery (the BottleBoat/ShipsLog
// precedent) and the two data seams the mock didn't have: real project/hobby/
// journal records instead of window.ARGSEA_DATA, and the site's own
// characteristic engine (src/lib/lightChar.ts) instead of a duplicated
// charOf. The Gull Post (the mock's delivery-gull → gazette iframe) isn't
// part of this port: it isn't named in the ported feature list and gazette.astro
// is off limits to this slice.
import { useEffect, useRef, useState } from 'react';
import type { Hobby, Light, Note, Project } from '../../lib/api';
import { loadFlares, recordFlare } from '../../lib/flares';
import { DEFAULT_LIGHT, codeFor, timeline, type Timeline } from '../../lib/lightChar';
import { sightFlare } from '../../lib/sightings';
import { BERTHS, HOBBY_CODE, HOBBY_DRESSING, HOBBY_ICON, JOURNAL_BERTHS } from './helmBerths';
import './Helm.css';

const SVG_NS = 'http://www.w3.org/2000/svg';

/* Mercator: a straight line on the paper is a constant compass course. Pure
   functions of fixed geographic constants, so they're hoisted once rather
   than rebuilt per mount (the mock's own boot() rebuilt them every call
   since it had no module scope to hoist them to). */
const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * D2R) / 2)) * R2D;

const WEST = -8.30, EAST = -6.10, SOUTH = 57.95, NORTH = 58.70;
const PPD = 710;
const W = Math.round((EAST - WEST) * PPD);
const H = Math.round((mercY(NORTH) - mercY(SOUTH)) * PPD);
const x = (lon: number) => (lon - WEST) * PPD;
const y = (lat: number) => (mercY(NORTH) - mercY(lat)) * PPD;
const lonAt = (px: number) => WEST + px / PPD;
const latAt = (py: number) => {
	const m = mercY(NORTH) - py / PPD;
	return (2 * Math.atan(Math.exp(m * D2R)) - Math.PI / 2) * R2D;
};
const NM_PX = (PPD / 60) * (mercY(58.3 + 1 / 60) - mercY(58.3)) * 60;

const dms = (v: number, axis: 'lat' | 'lon') => {
	const hemi = axis === 'lat' ? (v >= 0 ? 'N' : 'S') : v >= 0 ? 'E' : 'W';
	const a = Math.abs(v), d = Math.floor(a), m = (a - d) * 60;
	return `${d}° ${m.toFixed(1).padStart(4, '0')}′ ${hemi}`;
};

const slug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const cap1 = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

const LEWIS: [number, number][] = [
	[-6.10, 58.70], [-6.26, 58.515], [-6.45, 58.42], [-6.53, 58.36], [-6.70, 58.31], [-6.79, 58.28],
	[-6.85, 58.22], [-6.95, 58.21], [-7.02, 58.20], [-7.05, 58.235], [-7.06, 58.16], [-7.10, 58.11],
	[-7.05, 58.02], [-6.90, 57.95], [-6.10, 57.95],
];
const FLANNAN_ISLETS: { n: string; lat: number; lon: number; r: number }[] = [
	{ n: 'Eilean Mòr', lat: 58.2882, lon: -7.5872, r: 5 },
	{ n: 'Eilean Tighe', lat: 58.2855, lon: -7.5820, r: 3 },
	{ n: 'Soray', lat: 58.2930, lon: -7.6060, r: 3 },
	{ n: 'Sgeir Toman', lat: 58.2960, lon: -7.6120, r: 2 },
	{ n: "Eilean a' Ghobha", lat: 58.2900, lon: -7.6250, r: 3 },
	{ n: 'Roareim', lat: 58.2990, lon: -7.6380, r: 3 },
	{ n: 'Bròna Cleit', lat: 58.2760, lon: -7.6560, r: 2 },
];
const SOUNDINGS: [number, number, number][] = [
	[-7.90, 58.55, 86], [-7.35, 58.40, 64], [-6.80, 58.48, 44], [-7.78, 58.24, 77], [-7.20, 58.28, 58],
	[-7.95, 58.06, 88], [-7.38, 58.08, 63], [-6.98, 58.06, 41], [-6.62, 58.20, 28], [-7.52, 58.62, 73],
	[-6.90, 58.62, 46], [-7.80, 58.66, 80],
];

interface Mark {
	id:       string;
	group:    string;
	egg?:     boolean;
	name:     string;
	code:     string;
	lat:      number;
	lon:      number;
	char?:    Timeline | null; // absent = always lit (hobbies/journal), null = always dim (the watch pin), set = blinks on its own clock
	memorial?: boolean;
	icon?:    string;
	wreck?:   boolean;
	dim?:     boolean;
	port?:    boolean;
	plate:    number;
	title:    string;
	cap:      string;
	body:     string[];
	meta?:    [string, string][];
}

// The current-watch pin: not a project, hobby, or journal entry the API can
// resolve, so canon's own hardcoded pin ports over unchanged.
const FIX_MARK: Mark = {
	id: 'fix', group: 'Now', name: 'The current watch', code: 'kept 19 jul', lat: 58.335, lon: -7.30,
	char: null, plate: 0,
	title: 'Three weeks in, the paper still came out every morning.',
	cap: 'The lamp room, 04:20. The pager stayed quiet.',
	body: [
		'Nobody noticed the migration. That was the entire point of doing it that way, and it is the only review I actually wanted.',
		'I keep the systems a newsroom runs on: the publishing pipeline, the queues behind it, and the pager that goes off when either one develops opinions at three in the morning.',
	],
	meta: [['Reading', 'Designing Data-Intensive Applications'], ['Building', 'a terminal that keeps work and home apart'], ['Avoiding', 'the piano, still']],
};

// The Flannan Isle memorial: a real lighthouse with a real historical
// character (Fl(2) W 30s), not derived from any project/hobby/journal
// record, so canon's own hardcoded mark ports over unchanged.
const FLANNAN_MARK: Mark = {
	id: 'flannan', group: 'In memoriam', egg: true, name: 'Flannan Isles', code: 'Fl(2) W 30s',
	lat: 58.2882, lon: -7.5872, char: { period: 30, spans: [[0, 0.51], [2.16, 2.67]] }, memorial: true, icon: 'light',
	plate: 2, title: 'Flannan Isles Lighthouse', cap: 'Eilean Mòr, from the east landing.',
	body: [
		'Eilean Mòr, December 1900. Three keepers of the light, lost to the sea in a storm that left no answer behind it. The lamp was found trimmed, clean, and ready to be lit.',
		'The light still burns on its own character, two flashes every thirty seconds, and it is the reason this chart exists.',
	],
	meta: [['Keepers', 'James Ducat · Thomas Marshall · Donald MacArthur'], ['Established', '7 december 1899'], ['Character', 'Fl(2) W 30s'], ['Automated', '1971'], ['Authority', 'Northern Lighthouse Board']],
};

// The characteristic derivation reuses lightChar.ts's own codeFor()/timeline()
// (registryNo's neighbors) instead of a page-local charOf: the code text comes
// out byte-identical to the mock's for fixed/flash/iso ("F W", "Fl W 8s",
// "Iso G 3s"), and quick/veryquick/morse now resolve too, which the mock's
// four-kind charOf never handled. One flagged mismatch: the mock's occult
// spans are a period-relative tail-blip ([0, period-.8]); lightChar's occult
// spans are a fixed double-dip ([0,.6],[1.7,period]) shared with every other
// occulting light on the site. Reusing the shared engine means Helm agrees
// with the rest of the site rather than running its own occult rhythm.
function charFor(light: Light): { code: string; char: Timeline } {
	return { code: codeFor(light), char: timeline(light) };
}

function buildMarks(projects: Project[], hobbies: Hobby[], notes: Note[]): Mark[] {
	const marks: Mark[] = [FIX_MARK, FLANNAN_MARK];

	projects.forEach((p) => {
		const berth = BERTHS[p.title];
		if (!berth) {
			return;
		}
		const c = charFor(p.light ?? DEFAULT_LIGHT);
		const meta: [string, string][] = (p.facts ?? []).slice(0, 3).map((f) => [cap1(f.heading), f.fact]);
		if (p.moral) {
			meta.push(['Moral', p.moral.replace(/^Moral:\s*/i, '')]);
		}
		marks.push({
			id: 'p-' + slug(p.title), group: 'Projects', name: p.title, code: c.code,
			lat: berth.lat, lon: berth.lon, char: c.char, plate: berth.plate, port: !!berth.port,
			// The mock's dim signal was p.status === 'dark' (its own demo data);
			// the live contract's equivalent is a light that's been extinguished.
			dim: !!p.light?.extinguished,
			title: p.title, cap: berth.cap, body: [p.shortDesc], meta,
		});
	});

	hobbies.forEach((h) => {
		// coord can be null on the live contract ("uncharted: in the log, off
		// the chart"); the mock's own demo data never modeled that case.
		if (!h.coord) {
			return;
		}
		const dress = HOBBY_DRESSING[h.name] ?? { plate: 0, cap: h.bearing };
		const meta: [string, string][] = [['Service', h.service], ['Seasons', h.seasons], ['Last log', h.lastLog], ['Still floats', h.floats], ['Odds', h.odds]];
		// The mock's h.notes was a list of titles; the live contract ties notes
		// by stable id (noteIds), so each id resolves to its real title here.
		(h.noteIds ?? []).forEach((id) => {
			const note = notes.find((n) => n.id === id);
			if (note) {
				meta.push(['Notes', `<button class="sheet__link" data-goto="j-${slug(note.title)}">${note.title}</button>`]);
			}
		});
		marks.push({
			id: 'h-' + slug(h.name), group: 'Hobbies', name: h.name,
			code: HOBBY_CODE[h.state], lat: h.coord.lat, lon: h.coord.lon, wreck: true,
			dim: h.state !== 'moored' && h.state !== 'port', port: h.state === 'port',
			icon: HOBBY_ICON[h.state], plate: dress.plate,
			title: h.name, cap: dress.cap, body: [h.bearing, h.offCourse], meta,
		});
	});

	notes.forEach((n) => {
		const berth = JOURNAL_BERTHS[n.title];
		if (!berth) {
			return;
		}
		marks.push({
			id: 'j-' + slug(n.title), group: 'Journal', name: n.title, code: n.date,
			lat: berth.lat, lon: berth.lon, wreck: true, icon: 'bottle', plate: berth.plate,
			title: n.title, cap: berth.cap, body: [n.teaser], meta: [['Filed', n.date]],
		});
	});

	return marks;
}

// Stand-in photography, drawn rather than fetched (the mock's own choice: no
// real media backs these plates).
const SCENES: { sky: [string, string, string]; sea: string; t: number; moon: boolean }[] = [
	{ sky: ['#2a3a63', '#6b6a86', '#c78f63'], sea: '#131a30', t: .72, moon: false },
	{ sky: ['#101838', '#1d2b52', '#3d4a72'], sea: '#0b1024', t: .24, moon: true },
	{ sky: ['#0b1024', '#16203f', '#2c3358'], sea: '#080d1e', t: .5, moon: true },
	{ sky: ['#3b3054', '#7a5a6a', '#d79a6a'], sea: '#181a2c', t: .34, moon: false },
	{ sky: ['#0d1428', '#243154', '#5b6c8e'], sea: '#0a1020', t: .62, moon: false },
];
function plateArt(i: number, w = 640, h = 360): string {
	const s = SCENES[i % SCENES.length], hz = Math.round(h * .62), tx = Math.round(w * s.t);
	return 'data:image/svg+xml,' + encodeURIComponent(
		`<svg xmlns='${SVG_NS}' width='${w}' height='${h}'><defs>
<linearGradient id='k' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='${s.sky[0]}'/>
<stop offset='.62' stop-color='${s.sky[1]}'/><stop offset='1' stop-color='${s.sky[2]}'/></linearGradient>
<radialGradient id='g'><stop offset='0' stop-color='#ffcf7d' stop-opacity='.95'/>
<stop offset='1' stop-color='#ffcf7d' stop-opacity='0'/></radialGradient></defs>
<rect width='${w}' height='${hz}' fill='url(#k)'/><rect y='${hz}' width='${w}' height='${h - hz}' fill='${s.sea}'/>
${s.moon ? `<circle cx='${w * .78}' cy='${h * .2}' r='${h * .05}' fill='#f4efe0' opacity='.9'/>` : ''}
${[...Array(9)].map((_, n) => `<circle cx='${(n * 71 + 33) % w}' cy='${(n * 37 + 18) % (hz - 24)}' r='1.3' fill='#fff' opacity='.5'/>`).join('')}
<path d='M0 ${hz} L${w * .22} ${hz - h * .1} L${w * .42} ${hz - h * .04} L${w * .6} ${hz - h * .12} L${w * .82} ${hz - h * .03} L${w} ${hz - h * .08} L${w} ${hz} Z' fill='#070a14' opacity='.92'/>
<rect x='${tx}' y='${hz - h * .3}' width='${Math.round(w * .022)}' height='${h * .3}' fill='#0a0d18'/>
<circle cx='${tx + w * .011}' cy='${hz - h * .3}' r='${h * .085}' fill='url(#g)'/>
<circle cx='${tx + w * .011}' cy='${hz - h * .3}' r='2.6' fill='#fff3d8'/>
${[...Array(6)].map((_, n) => `<rect x='${tx - 4}' y='${hz + (n * (h - hz)) / 6 + 3}' width='${8 + n * 3}' height='1.4' fill='#ffcf7d' opacity='${.4 - n * .05}'/>`).join('')}
</svg>`.replace(/\n/g, ''),
	);
}

// The wandering chart's own marks, brought aboard. Wreck/moored/port/journal
// glyphs; unchanged from the mock.
const ICONS: Record<string, string> = {
	light: `<div style="position:relative;display:flex;flex-direction:column;align-items:center"><svg width="18" height="27" viewBox="0 0 20 30" fill="none"><path d="M10 2 L13 8 L7 8 Z" fill="#f0d9a8"/><rect x="7.5" y="8" width="5" height="13" fill="none" stroke="rgba(240,217,168,.7)" stroke-width="1.2"/><path d="M4 26 q6 -3 12 0" stroke="rgba(240,217,168,.55)" stroke-width="1.2" fill="none"/></svg></div>`,
	moored: `<div style="position:relative;display:flex;flex-direction:column;align-items:center;width:46px"><svg width="24" height="27" viewBox="0 0 26 30" fill="none" style="position:relative;z-index:2"><path d="M13 2 L17 9 L9 9 Z" fill="#f0d9a8" style="animation:lampPulse 4s ease-in-out infinite"/><rect x="10" y="9" width="6" height="14" fill="none" stroke="#93a0e8" stroke-width="1.4"/><path d="M10 13 h6 M10 17 h6" stroke="#93a0e8" stroke-width="1.4"/></svg><div style="width:36px;height:8px;margin-top:-2px;border-radius:60% 70% 0 0 / 100% 100% 0 0;background:linear-gradient(180deg,#2a3358,#141a34)"></div><div style="position:absolute;right:-4px;bottom:1px;width:8px;height:10px;background:#c05a4a;border-radius:50% 50% 45% 45%;animation:buoyBob 3s ease-in-out infinite"></div></div>`,
	adrift: `<div style="position:relative"><svg width="44" height="14" viewBox="0 0 60 16" fill="none" style="position:absolute;right:18px;top:10px;animation:wakePulse 3s ease-in-out infinite"><path d="M2 8 q7 -6 14 0 t14 0 t14 0 t14 0" stroke="rgba(240,217,168,.5)" stroke-width="1.4" fill="none" stroke-dasharray="1 5" stroke-linecap="round"/></svg><svg width="28" height="23" viewBox="0 0 30 24" fill="none" style="position:relative;z-index:2;animation:boatDrift 5s ease-in-out infinite"><path d="M4 15 L26 15 L21 22 L9 22 Z" fill="#93a0e8"/><path d="M15 15 V3" stroke="#5f6ec4" stroke-width="1.5"/><path d="M15 3 L24 13 L15 13 Z" fill="#f0d9a8"/></svg></div>`,
	marooned: `<div style="position:relative;display:flex;flex-direction:column;align-items:center;width:44px;height:34px;justify-content:flex-end"><svg width="26" height="26" viewBox="0 0 30 30" fill="none" style="position:absolute;left:5px;bottom:7px;transform-origin:14px 26px;animation:palmSway 6s ease-in-out infinite"><path d="M14 28 q-2 -12 1 -20" stroke="#8a7142" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M15 8 q-8 -3 -13 1 M15 8 q8 -3 13 1 M15 8 q-5 -6 -12 -6 M15 8 q5 -6 12 -6" stroke="#5f8a5f" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg><div style="width:42px;height:10px;border-radius:50% 50% 40% 40%;background:linear-gradient(180deg,#6a5a38,#3a3020)"></div></div>`,
	port: `<div style="position:relative;display:flex;flex-direction:column;align-items:center;width:34px"><div style="position:absolute;left:14px;bottom:16px;width:1.5px;height:17px;background:#8a93c4"></div><div style="position:absolute;left:15px;top:-3px;width:14px;height:7px;background:#6fca97;clip-path:polygon(0 0,100% 0,80% 50%,100% 100%,0 100%);animation:pennantWave 3.5s ease-in-out infinite;transform-origin:left"></div><div style="position:absolute;left:15px;top:5px;width:11px;height:5px;background:#f0d9a8;clip-path:polygon(0 0,100% 0,75% 50%,100% 100%,0 100%);animation:pennantWave 3.5s ease-in-out .4s infinite;transform-origin:left"></div><svg width="22" height="26" viewBox="0 0 26 30" fill="none" style="position:relative;z-index:2"><circle cx="13" cy="5" r="3" stroke="#93a0e8" stroke-width="1.6"/><path d="M13 8 V26" stroke="#93a0e8" stroke-width="1.6"/><path d="M6 15 H20" stroke="#93a0e8" stroke-width="1.6"/><path d="M5 22 q8 7 16 0" stroke="#93a0e8" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg></div>`,
	ink: `<div style="position:relative;width:44px;height:34px;animation:inkPulse 5s ease-in-out infinite"><div style="position:absolute;left:7px;top:5px;width:29px;height:22px;border-radius:56% 44% 62% 38% / 54% 60% 40% 46%;background:radial-gradient(circle at 40% 38%,#2a3160,#141833)"></div><div style="position:absolute;left:1px;top:14px;width:14px;height:11px;border-radius:60% 40% 50% 50%;background:#182046"></div><div style="position:absolute;right:2px;top:1px;width:10px;height:9px;border-radius:50%;background:#1c2450"></div><span style="position:absolute;left:16px;top:11px;font-family:var(--f-mono);font-size:10px;color:rgba(147,160,232,.55)">✕</span></div>`,
	bottle: `<div style="animation:bottleBob 3s ease-in-out infinite"><svg width="30" height="19" viewBox="0 0 40 24" fill="none" style="overflow:visible"><rect x="6" y="7" width="28" height="11" rx="5.5" fill="rgba(147,160,232,.22)" stroke="#93a0e8" stroke-width="1.3"/><rect x="33" y="9.5" width="5" height="6" rx="1.2" fill="#f0d9a8"/><path d="M12 10 h14 M12 12.5 h11 M12 15 h13" stroke="#f0d9a8" stroke-width="1" stroke-linecap="round" opacity=".85"/></svg></div>`,
};

// Tiny state icons for the rail.
const MINI: Record<string, string> = {
	moored: `<svg width="13" height="14" viewBox="0 0 26 30" fill="none"><path d="M13 2 L17 9 L9 9 Z" fill="#f0d9a8"/><rect x="10" y="9" width="6" height="14" fill="none" stroke="#93a0e8" stroke-width="2"/><path d="M6 27 q7 -4 14 0" stroke="#5f6ec4" stroke-width="2" fill="none"/></svg>`,
	adrift: `<svg width="14" height="12" viewBox="0 0 30 24" fill="none"><path d="M4 15 L26 15 L21 22 L9 22 Z" fill="#93a0e8"/><path d="M15 15 V3" stroke="#5f6ec4" stroke-width="2"/><path d="M15 3 L24 13 L15 13 Z" fill="#f0d9a8"/></svg>`,
	marooned: `<svg width="13" height="13" viewBox="0 0 30 30" fill="none"><path d="M14 28 q-2 -12 1 -20" stroke="#8a7142" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M15 8 q-8 -3 -13 1 M15 8 q8 -3 13 1 M15 8 q-5 -6 -12 -6 M15 8 q5 -6 12 -6" stroke="#5f8a5f" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>`,
	port: `<svg width="12" height="13" viewBox="0 0 26 30" fill="none"><circle cx="13" cy="5" r="3" stroke="#6fca97" stroke-width="2.2"/><path d="M13 8 V26 M6 15 H20" stroke="#6fca97" stroke-width="2.2"/><path d="M5 22 q8 7 16 0" stroke="#6fca97" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>`,
	ink: `<span class="mini-ink" style="display:block;width:11px;height:9px;border-radius:56% 44% 62% 38% / 54% 60% 40% 46%;background:radial-gradient(circle at 40% 38%,#3a4380,#1a1f42);transform:rotate(-12deg)"></span>`,
	bottle: `<svg width="14" height="9" viewBox="0 0 40 24" fill="none"><rect x="2" y="5" width="28" height="13" rx="6.5" fill="rgba(147,160,232,.25)" stroke="#93a0e8" stroke-width="2.4"/><rect x="31" y="8" width="7" height="7" rx="1.5" fill="#f0d9a8"/></svg>`,
};

interface Props {
	projects:       Project[];
	hobbies:        Hobby[];
	notes:          Note[];
	keeperName:     string;
	keeperTitle:    string;
	keeperLocation: string;
}

export default function Helm({ projects, hobbies, notes, keeperName, keeperTitle, keeperLocation }: Props) {
	const railRef = useRef<HTMLDivElement | null>(null);
	const planeRef = useRef<HTMLDivElement | null>(null);
	const [railDate, setRailDate] = useState('');

	// The rail date derives from the current date, same as the mock: computed
	// client-side after mount, not baked into the static build.
	useEffect(() => {
		setRailDate(new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toLowerCase());
	}, []);

	useEffect(() => {
		const rail = railRef.current, plane = planeRef.current;
		const sea = document.getElementById('sea'), sheet = document.getElementById('sheet');
		const sheetBody = document.getElementById('sheetBody');
		const mem = document.getElementById('mem');
		if (!rail || !plane || !sea || !sheet || !sheetBody || !mem) {
			return;
		}

		let dead = false;
		const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

		plane.style.width = W + 'px';
		plane.style.height = H + 'px';
		plane.style.marginLeft = -(W / 2) + 'px';
		plane.style.marginTop = -(H / 2) + 'px';

		const addEl = (svg: SVGSVGElement, tag: string, attrs: Record<string, string | number>) => {
			const e = document.createElementNS(SVG_NS, tag);
			for (const k in attrs) {
				e.setAttribute(k, String(attrs[k]));
			}
			svg.appendChild(e);
			return e;
		};

		const svg = document.createElementNS(SVG_NS, 'svg');
		svg.setAttribute('width', String(W));
		svg.setAttribute('height', String(H));
		svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
		svg.style.cssText = 'position:absolute;left:0;top:0';

		const grad = document.createElementNS(SVG_NS, 'linearGradient');
		grad.id = 'depth';
		grad.setAttribute('x1', '1'); grad.setAttribute('y1', '0');
		grad.setAttribute('x2', '0'); grad.setAttribute('y2', '0');
		([['0', '#17233f'], ['.34', '#111a33'], ['.68', '#0c1327'], ['1', '#080d1c']] as [string, string][]).forEach(([o, c]) => {
			const s = document.createElementNS(SVG_NS, 'stop');
			s.setAttribute('offset', o); s.setAttribute('stop-color', c);
			grad.appendChild(s);
		});
		const defs = document.createElementNS(SVG_NS, 'defs');
		defs.appendChild(grad); svg.appendChild(defs);
		addEl(svg, 'rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#depth)' });

		for (let lon = -8.5; lon <= -6.0; lon += 1 / 6) {
			const px = x(lon);
			if (px < 0 || px > W) {
				continue;
			}
			const major = Math.abs(lon - Math.round(lon)) < 1e-6;
			addEl(svg, 'line', { x1: px, y1: 0, x2: px, y2: H, stroke: `rgba(198,160,82,${major ? .3 : .13})`, 'stroke-width': major ? 1.1 : .8 });
		}
		for (let lat = 57.9; lat <= 58.75; lat += 1 / 6) {
			const py = y(lat);
			if (py < 0 || py > H) {
				continue;
			}
			const major = Math.abs(lat - Math.round(lat)) < 1e-6;
			addEl(svg, 'line', { x1: 0, y1: py, x2: W, y2: py, stroke: `rgba(198,160,82,${major ? .3 : .13})`, 'stroke-width': major ? 1.1 : .8 });
		}
		const contour = (pts: [number, number][], op: number) => addEl(svg, 'path', {
			d: 'M' + pts.map(([lo, la]) => `${x(lo).toFixed(1)} ${y(la).toFixed(1)}`).join(' L'),
			fill: 'none', stroke: `rgba(147,160,232,${op})`, 'stroke-width': 1.1, 'stroke-dasharray': '7 7',
		});
		contour([[-8.30, 58.14], [-8.05, 58.30], [-7.86, 58.48], [-7.72, 58.70]], .17);
		contour([[-8.30, 57.98], [-7.90, 58.10], [-7.62, 58.30], [-7.44, 58.55], [-7.36, 58.70]], .13);
		contour([[-7.30, 57.95], [-7.16, 58.16], [-7.04, 58.40], [-6.86, 58.62], [-6.74, 58.70]], .1);

		addEl(svg, 'path', {
			d: 'M' + LEWIS.map(([lo, la]) => `${x(lo).toFixed(1)} ${y(la).toFixed(1)}`).join(' L') + ' Z',
			fill: '#161d2e', stroke: 'rgba(198,160,82,.5)', 'stroke-width': 1.6,
		});
		addEl(svg, 'path', {
			d: 'M' + LEWIS.slice(0, 14).map(([lo, la]) => `${x(lo).toFixed(1)} ${y(la).toFixed(1)}`).join(' L'),
			fill: 'none', stroke: 'rgba(198,160,82,.14)', 'stroke-width': 10,
		});
		FLANNAN_ISLETS.forEach((f) => {
			addEl(svg, 'circle', { cx: x(f.lon).toFixed(1), cy: y(f.lat).toFixed(1), r: f.r, fill: '#1b2338', stroke: 'rgba(198,160,82,.7)', 'stroke-width': 1.2 });
		});

		const monoStack = "'IBM Plex Mono', ui-monospace, Menlo, monospace";
		const swellWrap = document.createElement('div');
		swellWrap.style.cssText = 'position:absolute;inset:0;pointer-events:none';
		const crest = (amp: number, wave: number, yStep: number, op: number, cls: string, width: number) => {
			const s = document.createElementNS(SVG_NS, 'svg');
			s.setAttribute('class', 'swell ' + cls);
			s.setAttribute('viewBox', `0 0 ${W * 1.28} ${H}`);
			s.setAttribute('preserveAspectRatio', 'none');
			let d = '';
			for (let yy = yStep * .5; yy < H; yy += yStep) {
				d += `M0 ${yy.toFixed(1)}`;
				for (let xx = 0; xx <= W * 1.28; xx += wave) {
					d += ` q ${(wave / 4).toFixed(1)} ${(-amp).toFixed(1)} ${(wave / 2).toFixed(1)} 0`;
					d += ` q ${(wave / 4).toFixed(1)} ${amp.toFixed(1)} ${(wave / 2).toFixed(1)} 0`;
				}
			}
			const pth = document.createElementNS(SVG_NS, 'path');
			pth.setAttribute('d', d);
			pth.setAttribute('stroke', `rgba(147,168,232,${op})`);
			pth.setAttribute('stroke-width', String(width));
			s.appendChild(pth); swellWrap.appendChild(s);
		};
		crest(2.4, 230, 96, .05, 'swell--a', 1.0);
		crest(3.6, 380, 152, .038, 'swell--b', 1.2);
		crest(1.6, 158, 66, .026, 'swell--c', .8);
		plane.appendChild(svg);
		plane.appendChild(swellWrap);

		const put = (cls: string, px: number, py: number, html: string) => {
			const el = document.createElement('div');
			el.className = cls; el.style.left = px + 'px'; el.style.top = py + 'px';
			el.innerHTML = html; plane.appendChild(el);
			return el;
		};
		for (let lat = 58.0; lat <= 58.7; lat += 1 / 6) {
			const py = y(lat);
			if (py < 14 || py > H - 14) {
				continue;
			}
			put('gr__lab', 8, py - 13, dms(lat, 'lat'));
		}
		for (let lon = -8.25; lon <= -6.1; lon += 1 / 3) {
			const px = x(lon);
			if (px < 60 || px > W - 60) {
				continue;
			}
			put('gr__lab', px + 5, 8, dms(lon, 'lon'));
		}
		SOUNDINGS.forEach(([lo, la, d]) => put('snd', x(lo), y(la), String(d)));
		put('place', x(-6.72), y(58.34), 'Isle of Lewis').style.cssText += ';font-size:12px;letter-spacing:.3em;color:rgba(190,198,232,.5)';
		put('place', x(-7.60), y(58.245), 'Flannan Isles');
		put('place', x(-6.28), y(58.545), 'Butt of Lewis');
		put('place', x(-7.05), y(58.255), 'Gallan Head');
		put('place place--sea', x(-7.95), y(58.60), 'The Minch approaches');
		put('place place--sea', x(-8.05), y(57.99), 'Continental shelf');
		put('place place--sea', x(-6.90), y(58.10), 'Loch Roag');

		// The rose, with this sea's magnetic variation.
		const rose = document.createElementNS(SVG_NS, 'svg');
		rose.setAttribute('width', '104'); rose.setAttribute('height', '104');
		rose.setAttribute('viewBox', '0 0 150 150');
		rose.style.cssText = `position:absolute;left:${x(-7.28) - 52}px;top:${y(58.11) - 52}px;opacity:.4`;
		rose.innerHTML = `
      <circle cx="75" cy="75" r="58" fill="none" stroke="rgba(198,160,82,.55)"/>
      <circle cx="75" cy="75" r="46" fill="none" stroke="rgba(198,160,82,.3)" stroke-dasharray="2 5"/>
      <circle cx="75" cy="75" r="30" fill="none" stroke="rgba(198,160,82,.2)"/>
      ${[...Array(72)].map((_, i) => {
				const a = (i * 5 * Math.PI) / 180, maj = i % 6 === 0;
				const r1 = maj ? 50 : 54, r2 = 58;
				return `<line x1="${(75 + Math.sin(a) * r1).toFixed(1)}" y1="${(75 - Math.cos(a) * r1).toFixed(1)}" x2="${(75 + Math.sin(a) * r2).toFixed(1)}" y2="${(75 - Math.cos(a) * r2).toFixed(1)}" stroke="rgba(198,160,82,${maj ? .7 : .35})" stroke-width="${maj ? 1.2 : .8}"/>`;
			}).join('')}
      <path d="M75 20 L81 72 L75 78 L69 72 Z" fill="rgba(240,196,120,.9)"/>
      <path d="M75 130 L81 78 L75 72 L69 78 Z" fill="rgba(198,160,82,.4)"/>
      <g transform="rotate(-6 75 75)">
        <path d="M75 30 L78 72 L75 75 L72 72 Z" fill="rgba(147,160,232,.75)"/>
        <circle cx="75" cy="30" r="2.4" fill="rgba(147,160,232,.75)"/>
      </g>
      <circle cx="75" cy="75" r="2.6" fill="rgba(240,196,120,.95)"/>
      <text x="75" y="14" text-anchor="middle" fill="rgba(240,196,120,.9)" font-size="10" letter-spacing="1.5" font-family="${monoStack}">N</text>
      <text x="75" y="146" text-anchor="middle" fill="rgba(198,160,82,.55)" font-size="7.5" letter-spacing=".8" font-family="${monoStack}">VAR 6°W 2026</text>`;
		plane.appendChild(rose);

		const scale = document.createElement('div');
		scale.className = 'scale';
		scale.style.left = x(-8.24) + 'px'; scale.style.top = y(57.99) + 'px';
		scale.innerHTML = `<div class="scale__bar" style="width:${(NM_PX * 10).toFixed(0)}px"><i></i><i></i><i></i><i></i><i></i></div>10 nautical miles`;
		plane.appendChild(scale);

		/* the lights: every lamp runs off one clock */
		const MARKS = buildMarks(projects, hobbies, notes);

		/* build the marks and the list together */
		const nodes: Record<string, { markEl: HTMLDivElement; rowEl: HTMLButtonElement | null; flareEl: HTMLElement; data: Mark }> = {};
		let lastGroup = '';
		MARKS.forEach((m) => {
			if (!m.egg && m.group !== lastGroup) {
				const g = document.createElement('div');
				g.className = 'rail__group'; g.innerHTML = `<span>${m.group}</span>`;
				rail.appendChild(g); lastGroup = m.group;
			}
			const cls = (m.wreck ? ' is-wreck' : '') + (m.dim ? ' is-dim' : '') + (m.port ? ' is-port' : '') + (m.memorial ? ' is-memorial' : '');
			let b: HTMLButtonElement | null = null;
			if (!m.egg) {
				b = document.createElement('button');
				b.className = 'rail__item' + cls; b.dataset.id = m.id;
				b.innerHTML = `<span class="rail__glyph">${m.icon && MINI[m.icon] ? MINI[m.icon] : '<i></i>'}</span>
          <span class="rail__name">${m.name}</span><span class="rail__code">${m.code}</span>`;
				b.addEventListener('click', () => goTo(m.id));
				rail.appendChild(b);
			}

			const el = document.createElement('div');
			el.className = 'mk' + cls + (m.icon ? ' has-icon' : ''); el.dataset.id = m.id;
			el.style.left = x(m.lon) + 'px'; el.style.top = y(m.lat) + 'px';
			el.innerHTML = `<span class="mk__flare"></span><button class="mk__hit" aria-label="${m.name}"></button>
        <span class="mk__ring"></span>${m.icon ? `<span class="mk__icon">${ICONS[m.icon]}</span>` : '<span class="mk__dot"></span>'}
        <span class="mk__label"><b>${m.code}</b><span>${m.name}</span></span>`;
			el.querySelector('.mk__hit')!.addEventListener('click', () => goTo(m.id));
			plane.appendChild(el);
			nodes[m.id] = { markEl: el, rowEl: b, flareEl: el.querySelector('.mk__flare')!, data: m };
		});

		/* signal flares: root for a hobby; the keeper's office reads the tally.
		   The shared tally (src/lib/flares.ts) reads and writes the same
		   id-keyed bucket ShipsLog does, so a flare tallies once whichever page
		   fires it, plus the same beacon call so the server-side count agrees
		   too. A mark's own id is a slug of its name (buildMarks above), not the
		   hobby's real id, so every lookup here resolves through the hobby list. */
		let flares = loadFlares(hobbies);
		const hobbyIdFor = (name: string) => hobbies.find((h) => h.name === name)?.id;
		const flareGlowFor = (id: string) => {
			const n = nodes[id];
			const hobbyId = n && n.data.group === 'Hobbies' ? hobbyIdFor(n.data.name) : undefined;
			if (!hobbyId || !flares[hobbyId]) {
				return;
			}
			if (n.markEl.querySelector('.mk__fg')) {
				return;
			}
			const s = document.createElement('span'); s.className = 'mk__fg'; n.markEl.appendChild(s);
		};
		for (const id in nodes) {
			flareGlowFor(id);
		}
		const fireFlare = (m: Mark) => {
			const hobbyId = hobbyIdFor(m.name);
			if (hobbyId) {
				flares = recordFlare(hobbyId, flares);
				sightFlare(hobbyId);
			}
			flareGlowFor(m.id);
			const fl = document.createElement('div');
			fl.style.cssText = 'position:fixed;left:50%;bottom:9%;transform:translateX(-50%);width:0;height:0;z-index:80;pointer-events:none';
			fl.innerHTML = `<div style="position:absolute;left:-1.5px;bottom:0;width:3px;height:42px;border-radius:2px;background:linear-gradient(180deg,#ff6a52,rgba(255,106,82,0));box-shadow:0 0 12px 3px rgba(255,106,82,.5);animation:flareRise 2.4s ease-out both"></div>
        <div style="position:absolute;bottom:220px;left:0;transform:translateX(-50%);animation:flareBloom 2.4s ease-out both">
          <div style="position:absolute;left:50%;top:50%;width:130px;height:130px;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,rgba(255,106,82,.6),rgba(255,72,52,.12) 60%,transparent 72%)"></div>
          <svg width="32" height="32" viewBox="0 0 30 30" fill="none" style="position:relative"><path d="M15 0 L17 13 L15 11 L13 13 Z M15 30 L13 17 L15 19 L17 17 Z M0 15 L13 13 L11 15 L13 17 Z M30 15 L17 13 L19 15 L17 17 Z" fill="#ffb49e"/></svg>
        </div>`;
			document.body.appendChild(fl);
			setTimeout(() => fl.remove(), 2600);
			const line = document.getElementById('flareLine');
			if (line) {
				line.textContent = 'flare away · the keeper will see it';
			}
		};

		/* the shared clock */
		const t0 = performance.now();
		const tick = (now: number) => {
			if (dead) {
				return;
			}
			const t = (now - t0) / 1000;
			for (const id in nodes) {
				const { flareEl, data } = nodes[id];
				if (!data.char) {
					flareEl.style.setProperty('--lit', data.char === null ? '.34' : '1');
					continue;
				}
				const { period, spans } = data.char;
				if (!period) {
					flareEl.style.setProperty('--lit', '1');
					continue;
				}
				const p = t % period;
				flareEl.style.setProperty('--lit', spans.some(([a, b]) => p >= a && p < b) ? '1' : '.08');
			}
			requestAnimationFrame(tick);
		};
		if (!reduce) {
			requestAnimationFrame(tick);
		} else {
			for (const id in nodes) {
				nodes[id].flareEl.style.setProperty('--lit', '.8');
			}
		}

		/* navigation */
		const sheetBodyEl = sheetBody;
		let px = 0, py = 0, current: string | null = null, sailTo: ((m: Mark) => void) | null = null;
		const setPlane = (ms: number) => {
			plane.style.setProperty('--ease', (reduce ? 0 : ms) + 'ms');
			plane.style.setProperty('--px', px + 'px');
			plane.style.setProperty('--py', py + 'px');
		};
		const centreOn = (m: Mark) => {
			const gutter = sheet.hasAttribute('data-open') ? Math.min(452, innerWidth * .45) : 0;
			px = (sea.clientWidth - gutter) / 2 - sea.clientWidth / 2 - (x(m.lon) - W / 2);
			py = -(y(m.lat) - H / 2);
		};
		// A const arrow function, not a hoisted function declaration: TS's
		// control-flow narrowing of plane/sheet (guarded above) doesn't survive
		// into a hoisted function body, but does survive into a const closure.
		const goTo = (id: string) => {
			const m = MARKS.find((v) => v.id === id);
			if (!m) {
				return;
			}
			current = id;
			sheet.setAttribute('data-open', '');
			plane.classList.remove('show-inset');
			if (sailTo) {
				sailTo(m);
			}
			centreOn(m); setPlane(1150);
			for (const k in nodes) {
				if (nodes[k].rowEl) {
					nodes[k].rowEl!.setAttribute('aria-current', String(k === id));
				}
				nodes[k].markEl.classList.toggle('is-active', k === id);
			}
			sheetBodyEl.innerHTML =
				`<div class="sheet__k">${m.group}</div><h2>${m.title}</h2>
         <div class="sheet__pos">${dms(m.lat, 'lat')} &nbsp;·&nbsp; ${dms(m.lon, 'lon')}${m.char ? ' &nbsp;·&nbsp; ' + m.code : ''}</div>
         <span class="sheet__plate"><img src="${plateArt(m.plate)}" alt="${m.cap}"></span>
         <span class="sheet__cap">${m.cap}</span>
         ${m.body.map((p) => `<p>${p}</p>`).join('')}
         ${m.meta ? `<dl>${m.meta.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>` : ''}
         ${m.group === 'Hobbies' ? `<p style="margin-top:18px;display:flex;align-items:center;flex-wrap:wrap;gap:10px"><button class="sheet__flare" id="fireFlare"><svg width="13" height="15" viewBox="0 0 13 15" fill="none"><path d="M6.5 14 V6" stroke="#c6a052" stroke-width="1.3" stroke-linecap="round"/><path d="M6.5 1 L8 4.5 L6.5 3.5 L5 4.5 Z" fill="#ff6a52"/></svg>send up a flare</button><span class="sheet__flareline" id="flareLine">${hobbyIdFor(m.name) && flares[hobbyIdFor(m.name)!] ? 'flare away · the keeper will see it' : 'send one up to root for this one'}</span></p>` : ''}
         ${m.memorial ? '<p style="margin-top:18px"><button class="mem__close" id="openMem" style="color:#c9a86a;border-color:rgba(154,123,58,.5)">read the memorial</button></p>' : ''}`;
			const om = document.getElementById('openMem');
			if (om) {
				om.addEventListener('click', openMem);
			}
			sheetBodyEl.querySelectorAll<HTMLElement>('[data-goto]').forEach((el) =>
				el.addEventListener('click', () => goTo(el.dataset.goto!)));
			const ff = document.getElementById('fireFlare');
			if (ff) {
				ff.addEventListener('click', () => fireFlare(m));
			}
		};
		document.getElementById('sheetX')!.addEventListener('click', () => {
			sheet.removeAttribute('data-open'); current = null;
			for (const k in nodes) {
				if (nodes[k].rowEl) {
					nodes[k].rowEl!.setAttribute('aria-current', 'false');
				}
				nodes[k].markEl.classList.remove('is-active');
			}
		});
		document.getElementById('home')!.addEventListener('click', () => goTo('fix'));

		const note = document.querySelector('.note')!;
		let taught = false;
		const dismissHint = () => {
			if (!taught) {
				taught = true; note.setAttribute('data-done', '');
			}
		};
		document.querySelectorAll('.rail__item, .mk__hit').forEach((el) => el.addEventListener('click', dismissHint));
		sea.addEventListener('pointerdown', dismissHint);

		const openMem = () => mem.setAttribute('data-open', '');
		document.getElementById('memX')!.addEventListener('click', () => mem.removeAttribute('data-open'));
		mem.addEventListener('click', (e) => {
			if (e.target === mem) {
				mem.removeAttribute('data-open');
			}
		});

		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				mem.removeAttribute('data-open');
			}
		};
		window.addEventListener('keydown', onKey);

		/* drag, and the coordinate readout under the cursor */
		const rLat = document.getElementById('rLat')!, rLon = document.getElementById('rLon')!;
		let drag = false, lx = 0, ly = 0;
		sea.addEventListener('pointerdown', (e) => {
			if ((e.target as HTMLElement).closest('.mk__hit') || (e.target as HTMLElement).closest('.sheet')) {
				return;
			}
			drag = true; lx = e.clientX; ly = e.clientY; sea.dataset.drag = '1';
			setPlane(0); sea.setPointerCapture(e.pointerId);
		});
		sea.addEventListener('pointermove', (e) => {
			if (drag) {
				px += e.clientX - lx; py += e.clientY - ly; lx = e.clientX; ly = e.clientY;
				px = Math.max(-W / 2, Math.min(W / 2, px)); py = Math.max(-H / 2, Math.min(H / 2, py));
				setPlane(0);
			}
			const r = plane.getBoundingClientRect();
			const cx = e.clientX - r.left, cy = e.clientY - r.top;
			if (cx >= 0 && cx <= W && cy >= 0 && cy <= H) {
				rLat.textContent = dms(latAt(cy), 'lat');
				rLon.textContent = dms(lonAt(cx), 'lon');
			}
		});
		const stop = () => { drag = false; delete sea.dataset.drag; };
		sea.addEventListener('pointerup', stop);
		sea.addEventListener('pointercancel', stop);
		const onResize = () => {
			if (current) {
				centreOn(MARKS.find((v) => v.id === current)!); setPlane(0);
			}
		};
		window.addEventListener('resize', onResize);

		/* the boat: she lies at the light you are reading */
		const boat = document.createElement('div');
		boat.className = 'boat';
		boat.innerHTML = `<svg width="19" height="19" viewBox="0 0 19 19" fill="none">
      <path d="M3.4 12.4 L15.6 12.4 L13.7 15.4 L5.3 15.4 Z" fill="#0d1222" stroke="rgba(240,217,168,.8)" stroke-width=".9"/>
      <path d="M9.5 2.6 L9.5 12.4" stroke="rgba(240,217,168,.7)" stroke-width=".9"/>
      <path d="M10.2 3.8 L14 11.7 L10.2 11.7 Z" fill="rgba(240,217,168,.34)"/>
      <path d="M8.8 5.2 L5.6 11.7 L8.8 11.7 Z" fill="rgba(240,217,168,.2)"/></svg>`;
		plane.appendChild(boat);

		const wakeSvg = document.createElementNS(SVG_NS, 'svg');
		wakeSvg.setAttribute('class', 'wake');
		wakeSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
		wakeSvg.setAttribute('preserveAspectRatio', 'none');
		plane.appendChild(wakeSvg);
		const WAKE_N = 54;
		const mkRail = () => [...Array(WAKE_N - 1)].map(() => {
			const e = document.createElementNS(SVG_NS, 'path');
			e.setAttribute('stroke-linecap', 'round'); e.setAttribute('fill', 'none');
			wakeSvg.appendChild(e); return e;
		});
		const railPort = mkRail(), railStbd = mkRail();

		const start = MARKS.find((v) => v.id === 'fix')!;
		let bx = x(start.lon), by = y(start.lat), hdg = 0;
		let voyage: { fx: number; fy: number; tx: number; ty: number; t0: number; dur: number } | null = null, wakeFade = 0;
		const trail: [number, number][] = [];
		boat.style.left = bx + 'px'; boat.style.top = by + 'px';

		const easeInOut = (u: number) => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;

		sailTo = (m: Mark) => {
			const tx = x(m.lon), ty = y(m.lat);
			const dist = Math.hypot(tx - bx, ty - by);
			if (dist < 2) {
				return;
			}
			if (reduce) {
				bx = tx; by = ty; boat.style.left = bx + 'px'; boat.style.top = by + 'px';
				return;
			}
			voyage = { fx: bx, fy: by, tx, ty, t0: performance.now(), dur: Math.min(5600, Math.max(2000, dist * 7.6)) };
		};

		const sail = (now: number) => {
			if (dead) {
				return;
			}
			if (voyage) {
				const u = Math.min(1, (now - voyage.t0) / voyage.dur);
				const e = easeInOut(u);
				bx = voyage.fx + (voyage.tx - voyage.fx) * e;
				by = voyage.fy + (voyage.ty - voyage.fy) * e;
				const want = (Math.atan2(voyage.ty - voyage.fy, voyage.tx - voyage.fx) * 180) / Math.PI + 90;
				const diff = ((want - hdg + 540) % 360) - 180;
				hdg += diff * .05;
				wakeFade = Math.min(1, wakeFade + .04);
				trail.unshift([bx, by]);
				if (u >= 1) {
					voyage = null;
				}
			} else {
				wakeFade = Math.max(0, wakeFade - .009);
				if (trail.length) {
					trail.pop();
				}
				boat.style.setProperty('--roll', (Math.sin(now / 1400) * 1.9).toFixed(2) + 'deg');
			}
			if (trail.length > WAKE_N + 1) {
				trail.pop();
			}
			boat.style.left = bx + 'px'; boat.style.top = by + 'px';
			boat.style.setProperty('--hdg', hdg.toFixed(1) + 'deg');

			const side: [[number, number], [number, number]][] = [];
			for (let i = 0; i < trail.length; i++) {
				const a = trail[i], b = trail[i + 1] || trail[i - 1] || a;
				let dx = trail[i + 1] ? a[0] - b[0] : b[0] - a[0];
				let dy = trail[i + 1] ? a[1] - b[1] : b[1] - a[1];
				const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
				const spread = 1.3 + i * .33;
				side.push([[a[0] - dy * spread, a[1] + dx * spread], [a[0] + dy * spread, a[1] - dx * spread]]);
			}
			for (let i = 0; i < WAKE_N - 1; i++) {
				const a = side[i], b = side[i + 1];
				if (!a || !b) {
					railPort[i].setAttribute('d', ''); railStbd[i].setAttribute('d', '');
					continue;
				}
				const decay = 1 - i / WAKE_N;
				const op = (.26 * decay * decay * wakeFade).toFixed(3);
				const w = (1.5 * decay + .25).toFixed(2);
				railPort[i].setAttribute('stroke', `rgba(196,214,255,${op})`);
				railStbd[i].setAttribute('stroke', `rgba(196,214,255,${op})`);
				railPort[i].setAttribute('stroke-width', w);
				railStbd[i].setAttribute('stroke-width', w);
				railPort[i].setAttribute('d', `M${a[0][0].toFixed(1)} ${a[0][1].toFixed(1)} L${b[0][0].toFixed(1)} ${b[0][1].toFixed(1)}`);
				railStbd[i].setAttribute('d', `M${a[1][0].toFixed(1)} ${a[1][1].toFixed(1)} L${b[1][0].toFixed(1)} ${b[1][1].toFixed(1)}`);
			}
			requestAnimationFrame(sail);
		};
		requestAnimationFrame(sail);

		goTo('fix');

		return () => {
			dead = true;
			window.removeEventListener('keydown', onKey);
			window.removeEventListener('resize', onResize);
		};
	}, [projects, hobbies, notes]);

	return (
		<>
			<div className="helm">
				<nav className="rail" aria-label="Light list">
					<div className="rail__head">
						<div className="rail__word"><b>{keeperName}</b></div>
						{/* The mock hardcodes "Justin Smith · Senior software engineer ·
						    Pittsburgh"; the keeper profile exposes name/title/location, so
						    this reads from there instead. */}
						<div className="rail__role">{keeperTitle} · {keeperLocation}</div>
						<div className="rail__sub">the light list · home waters<br />corrected to <span id="railDate">{railDate}</span></div>
					</div>
					<div className="rail__scroll" id="rail" ref={railRef}></div>
					<div className="rail__foot">
						<button id="home">⊕ back to the fix</button>
						<a className="ashore" href="/">⌂ back ashore</a>
					</div>
				</nav>

				<div className="sea" id="sea">
					<div className="plane" id="plane" ref={planeRef}><div className="plane__paper"></div></div>
					<div className="readout">
						<span><b>lat</b> <span id="rLat">·</span></span>
						<span><b>long</b> <span id="rLon">·</span></span>
					</div>
					<aside className="sheet" id="sheet" aria-live="polite">
						<button className="sheet__x" id="sheetX" aria-label="Close">✕</button>
						<div id="sheetBody"></div>
					</aside>
				</div>
			</div>

			<div className="mem" id="mem">
				<div className="mem__card" role="dialog" aria-label="In memoriam">
					<div className="mem__top"></div>
					<div className="mem__in">
						<svg width="34" height="40" viewBox="0 0 26 30" fill="none" aria-hidden="true">
							<path d="M13 2 L17 9 L9 9 Z" fill="#f0d9a8"></path>
							<rect x="10" y="9" width="6" height="14" fill="none" stroke="rgba(240,217,168,.7)" strokeWidth="1.4"></rect>
							<path d="M10 13 h6 M10 17 h6" stroke="rgba(240,217,168,.6)" strokeWidth="1.4"></path>
							<path d="M6 27 q7 -4 14 0" stroke="rgba(147,160,232,.5)" strokeWidth="1.4" fill="none"></path>
						</svg>
						<span className="mem__k">In memoriam</span>
						<h3>The keepers of Flannan Isle</h3>
						<div className="mem__names">James Ducat · Thomas Marshall · Donald MacArthur</div>
						<p className="mem__body">Eilean Mòr, December 1900. Three keepers of the light, lost to the sea in a storm that left no answer behind it. The lamp was found trimmed, clean, and ready to be lit.</p>
						<div className="mem__rule"></div>
						<p className="mem__coda">This chart, and every light kept on this coast, is kept in their memory.</p>
						<button className="mem__close" id="memX">with respect ✕</button>
					</div>
				</div>
			</div>

			<div className="note">click a light in the list · the chart sails to it · drag the water to wander</div>
		</>
	);
}

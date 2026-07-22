// The ship's log: the wandering chart and the log list below it. Every hobby is
// a ship at its last known bearing, none of them sunk, some overdue. Marks
// project off the chart window's lat/lon (proj/wakePath/fmtCoord, transcribed
// from Hobbies.dc.html), a wake trails each hobby that slipped its mooring, the
// Flannan Isle memorial keeps its real Fl(2) W 30s light as tribute, and the
// bearing card lets a visitor send up a flare for an overdue one. Flares keep a
// local tally for the card's own line (argsea-flares, the key the watch room
// reads); the beacon is the real count, fired once per hobby per view. The
// diorama's static art rides ten carving spots (BoltedSvg mounts; bolted markup
// resolved build-time by hobbies.astro); the memorial trio and the computed
// line-work are deliberately not spots.
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactElement } from 'react';
import type { Coord, Doodle, FigureheadDesign, Hobby, HobbyState, Note } from '../../lib/api';
import { pageCatPick } from '../../lib/catSpots';
import { sightFlare, sightVisit } from '../../lib/sightings';
import { useEscapeKey } from './useEscapeKey';
import BoltedSvg from './BoltedSvg';
import HarborCat from './HarborCat';
import JournalEntryOverlay from './JournalEntryOverlay';
import './ShipsLog.css';

const CLOSE_MS = 220;
const FLARES_KEY = 'argsea-flares';

// The chart's projection window and the two fixed marks that aren't hobbies:
// the memorial's light and the uncharted "next hobby" slot.
const CHART_WIN = { latTop: 58.58, latBot: 57.80, lonLeft: -7.98, lonRight: -6.55 };
const MEMORIAL_COORD: Coord = { lat: 58.283, lon: -7.583 };
const UNCHARTED_COORD: Coord = { lat: 57.86, lon: -6.68 };

interface StateMeta {
	label: string;
	c:     string;  // the rgb triple the pill/wake tint from
	solid: string;  // the flat hex the pill text/glyph paint
}

const STATE_META: Record<HobbyState, StateMeta> = {
	moored:   { label: 'moored · home waters', c: '240,217,168', solid: '#f0d9a8' },
	adrift:   { label: 'adrift · lost at sea', c: '147,160,232', solid: '#93a0e8' },
	marooned: { label: 'marooned',             c: '147,160,232', solid: '#93a0e8' },
	port:     { label: 'made port',            c: '111,202,151', solid: '#6fca97' },
	inkspill: { label: 'bearing smudged',      c: '138,147,196', solid: '#8a93c4' },
};

// The bearing card's cat gets its own lines, not the chart lookout's set; both
// perches carry the 'chart' context, transcribed from the Hobbies mock's overlay.
const BEARING_QUIPS = ['i read the log. twice.', 'it will drift back. probably.', 'mark a search. i will supervise.', 'the sea keeps what it likes.'];

function proj(c: Coord) {
	const w = CHART_WIN;
	return {
		x: ((c.lon - w.lonLeft) / (w.lonRight - w.lonLeft)) * 100,
		y: ((w.latTop - c.lat) / (w.latTop - w.latBot)) * 100,
	};
}

function wakePath(a: Coord, b: Coord) {
	const p1 = proj(a), p2 = proj(b);
	const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
	const dx = p2.x - p1.x, dy = p2.y - p1.y;
	const len = Math.hypot(dx, dy) || 1;
	const bow = Math.min(10, len * 0.3);
	const cx = mx + (-dy / len) * bow, cy = my + (dx / len) * bow;
	return {
		d:  `M${p1.x.toFixed(1)} ${p1.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`,
		ox: p1.x.toFixed(1),
		oy: p1.y.toFixed(1),
	};
}

function fmtCoord(c: Coord): string {
	const dm = (v: number, pos: string, neg: string) => {
		const a = Math.abs(v);
		const d = Math.floor(a);
		const m = Math.round((a - d) * 60);
		return d + '°' + String(m).padStart(2, '0') + '′' + (v >= 0 ? pos : neg);
	};
	return dm(c.lat, 'N', 'S') + ' ' + dm(c.lon, 'E', 'W');
}

function pillStyle(state: HobbyState, on: boolean): CSSProperties {
	const m = STATE_META[state];
	return {
		fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '.1em', textTransform: 'uppercase',
		padding: '3px 10px', borderRadius: '999px', whiteSpace: 'nowrap', flex: 'none',
		color: m.solid, border: `1px ${state === 'moored' ? 'dashed' : 'solid'} rgba(${m.c},${on ? 0.6 : 0.45})`,
		background: `rgba(${m.c},${on ? 0.14 : 0.08})`,
	};
}

// The diorama's bolted carvings, one slot per spot, resolved build-time by
// hobbies.astro (the towerSvg precedent, ten spots wide: an island can't
// reach src/lib/api.ts itself). The memorial trio and the computed line-work
// have no slot here on purpose: they are not spots.
export interface DioramaCarvings {
	chartRose:       string | null;
	seaSerpent:      string | null;
	mooredLamp:      string | null;
	adriftBoat:      string | null;
	adriftWake:      string | null;
	maroonedPalm:    string | null;
	portAnchor:      string | null;
	signalFlare:     string | null;
	compassRoseStar: string | null;
	sailTent:        string | null;
}

interface Props {
	hobbies:     Hobby[];
	suggestions: string[];
	notes:       Note[]; // the full journal, so a bearing's noteIds resolve to real entries
	doodles:     Doodle[];
	signoff:     string;
	catEnabled:  boolean;
	catPages?:   Record<string, boolean>;
	catSpots?:   Record<string, boolean>;
	catDesigns?: FigureheadDesign[];
	bolted:      DioramaCarvings;
}

export default function ShipsLog({ hobbies, suggestions, notes, doodles, signoff, catEnabled, catPages, catSpots, catDesigns, bolted }: Props) {
	const [openIdx, setOpenIdx] = useState<number | null>(null);
	const [closing, setClosing] = useState(false);
	const [noteId, setNoteId] = useState<string | null>(null);
	const [hoverIdx, setHoverIdx] = useState<number | null>(null);
	const [nextIdx, setNextIdx] = useState(0);
	const [flares, setFlares] = useState<Record<string, number>>({});
	const [flaredNow, setFlaredNow] = useState<Record<string, boolean>>({});
	const [flareFiring, setFlareFiring] = useState(false);
	const [memorial, setMemorial] = useState(false);
	const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const fireTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	const suggestionList = useMemo(() => ['???', ...suggestions], [suggestions]);

	useEffect(() => {
		try {
			const stored = JSON.parse(localStorage.getItem(FLARES_KEY) ?? '{}');
			if (stored && typeof stored === 'object') {
				setFlares(stored);
			}
		} catch {
			// a corrupt or blocked store just means no flare tally remembered
		}
	}, []);

	// The ?bearing= contract: a journal entry's ◈ link lands here with the
	// hobby's name, and the bearing card opens itself on arrival (matched
	// case-insensitively, transcribed from Hobbies.dc.html). A name the chart
	// doesn't know just leaves the page as-is.
	useEffect(() => {
		const wanted = new URLSearchParams(window.location.search).get('bearing');
		if (!wanted) {
			return;
		}
		const index = hobbies.findIndex((hobby) => hobby.name.toLowerCase() === wanted.toLowerCase());
		if (index >= 0) {
			setOpenIdx(index);
			setClosing(false);
		}
	}, [hobbies]);

	useEffect(() => () => { clearTimeout(closeTimer.current); clearTimeout(fireTimer.current); }, []);

	const requestClose = () => {
		if (closing || openIdx === null) {
			return;
		}
		setClosing(true);
		closeTimer.current = setTimeout(() => { setOpenIdx(null); setClosing(false); }, CLOSE_MS);
	};

	// The memorial sits on top, so Escape dismisses it first; only then does it
	// close an open bearing card, matching the mock's own key handler.
	useEscapeKey(memorial || openIdx !== null, () => {
		if (memorial) {
			setMemorial(false);
			return;
		}
		requestClose();
	});

	const openHobby = (index: number) => {
		sightVisit(hobbies[index].id);
		setOpenIdx(index);
		setClosing(false);
	};

	const sendFlare = () => {
		if (openIdx === null) {
			return;
		}
		const hobby = hobbies[openIdx];
		const next = { ...flares, [hobby.name]: (flares[hobby.name] ?? 0) + 1 };
		clearTimeout(fireTimer.current);
		setFlares(next);
		setFlaredNow((current) => ({ ...current, [hobby.name]: true }));
		// drop the flare, then raise it fresh next frame so a re-fire restarts it
		setFlareFiring(false);
		requestAnimationFrame(() => setFlareFiring(true));
		fireTimer.current = setTimeout(() => setFlareFiring(false), 2500);
		sightFlare(hobby.id);
		try {
			localStorage.setItem(FLARES_KEY, JSON.stringify(next));
		} catch {
			// storage may be unavailable (private mode, quota); the card's line just won't survive a reload
		}
	};

	const onHover = (index: number) => setHoverIdx(index);
	const offHover = (index: number) => setHoverIdx((current) => (current === index ? null : current));

	const pick = catEnabled ? pageCatPick('hobbies', catPages, catSpots) : null;
	const catHere = pick?.id === 'hobbies.record';

	const chartedCount = hobbies.filter((hobby) => hobby.coord).length;
	const plottedLine = `${chartedCount} hobbies plotted · none sunk`;

	const wakes = hobbies
		.filter((hobby) => hobby.from && hobby.coord)
		.map((hobby) => {
			const w = wakePath(hobby.from as Coord, hobby.coord as Coord);
			return { ...w, stroke: `rgba(${STATE_META[hobby.state].c},.5)` };
		});

	const memP = proj(MEMORIAL_COORD);
	const unP = proj(UNCHARTED_COORD);

	const open = openIdx === null ? null : hobbies[openIdx];
	const flareCount = open ? (flares[open.name] ?? 0) : 0;
	const flareLine = flareCount > 0 ? 'flare away · the keeper will see it' : 'send one up to root for this one';

	// A bearing's tied journal entries, resolved by stable id (mirrors a light's
	// noteIds, never title matching); the card lists them and a click pulls the
	// entry up over the still-open bearing card (the pin's "logged in the journal").
	const openNoteIds = open?.noteIds ?? [];
	const bearingNotes = open ? notes.filter((note) => openNoteIds.includes(note.id)) : [];
	const openNote = noteId === null ? null : notes.find((note) => note.id === noteId) ?? null;
	const openNoteDoodle = openNote ? doodles.find((doodle) => doodle.id === openNote.doodleId) ?? null : null;

	return (
		<>
			<div style={{ padding: '6px clamp(16px,4vw,52px) clamp(20px,4vw,32px)', display: 'flex', justifyContent: 'center' }}>
				<div style={{ position: 'relative', width: '100%', maxWidth: '1120px', animation: 'fadeUp .8s ease .28s both' }}>
					<div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap', padding: '0 6px 10px' }}>
						<span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', letterSpacing: '.2em', color: '#8a93c4', textTransform: 'uppercase' }}>The wandering chart · home waters</span>
						<span className="shipslog__plotted" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', letterSpacing: '.12em', color: '#5f6ec4', textTransform: 'uppercase' }}>{plottedLine}</span>
					</div>

					<div data-chart="true" className="shipslog__chart" style={{ position: 'relative', height: 'clamp(430px,52vw,580px)', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(150,160,220,.22)', boxShadow: '0 18px 44px rgba(0,0,0,.45),inset 0 0 60px rgba(6,9,22,.6)', background: 'repeating-linear-gradient(0deg,rgba(147,160,232,.05) 0 1px,transparent 1px 74px),repeating-linear-gradient(90deg,rgba(147,160,232,.05) 0 1px,transparent 1px 74px),radial-gradient(120% 96% at 50% -6%,#17224c 0%,#0f1533 52%,#0a0e22 100%)' }}>

						<div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: .5, mixBlendMode: 'overlay', background: "url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%22140%22%20height=%22140%22%3E%3Cfilter%20id=%22n%22%3E%3CfeTurbulence%20type=%22fractalNoise%22%20baseFrequency=%22.85%22%20numOctaves=%222%22/%3E%3CfeColorMatrix%20type=%22saturate%22%20values=%220%22/%3E%3C/filter%3E%3Crect%20width=%22140%22%20height=%22140%22%20filter=%22url(%23n)%22%20opacity=%22.5%22/%3E%3C/svg%3E')" }} />

						{/* rhumb line network (portolan) */}
						<svg viewBox="0 0 100 60" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: .5 }}>
							<g stroke="rgba(147,160,232,.28)" strokeWidth=".15" strokeDasharray="1.1 1.1">
								<path d="M12 11 L92 4 M12 11 L98 30 M12 11 L88 58 M12 11 L44 60 M12 11 L-4 44" />
								<path d="M78 30 L14 2 M78 30 L100 2 M78 30 L96 58 M78 30 L30 60 M78 30 L2 20" />
							</g>
							<circle cx="12" cy="11" r=".7" fill="rgba(240,217,168,.5)" />
							<circle cx="78" cy="30" r=".7" fill="rgba(147,160,232,.5)" />
						</svg>

						{/* wake trails · each wandering hobby's drift, from where it slipped moorings to where it went quiet */}
						<svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}>
							{wakes.map((wk, index) => (
								<g key={index} className="shipslog__wake">
									<path d={wk.d} fill="none" stroke={wk.stroke} strokeWidth="0.3" strokeDasharray="0.8 1.8" strokeLinecap="round" />
									<circle cx={wk.ox} cy={wk.oy} r="0.6" fill={wk.stroke} />
								</g>
							))}
						</svg>

						{/* compass rose */}
						<div data-hide-mobile style={{ position: 'absolute', left: 'calc(12% - 52px)', top: 'calc(18.3% - 52px)', width: '104px', height: '104px' }}>
							<div style={{ position: 'absolute', left: '50%', top: '50%', width: '104px', height: '104px', border: '1px dashed rgba(240,217,168,.4)', borderRadius: '50%', animation: 'compassPulse 6s ease-in-out infinite' }} />
							<BoltedSvg svg={bolted.chartRose} spot="chart-rose" width={104} height={104} viewBox="0 0 104 104" style={{ position: 'absolute', inset: 0 }}>
								<circle cx="52" cy="52" r="34" stroke="rgba(147,160,232,.35)" strokeWidth="1" />
								<g opacity=".9">
									<path d="M52 8 L58 52 L52 46 L46 52 Z" fill="#f0d9a8" />
									<path d="M52 96 L46 52 L52 58 L58 52 Z" fill="#5f6ec4" />
									<path d="M8 52 L52 46 L46 52 L52 58 Z" fill="#5f6ec4" />
									<path d="M96 52 L52 58 L58 52 L52 46 Z" fill="#5f6ec4" />
								</g>
								<g opacity=".55">
									<path d="M52 52 L74 30 L58 50 Z" fill="#93a0e8" />
									<path d="M52 52 L74 74 L54 58 Z" fill="#6a76c8" />
									<path d="M52 52 L30 74 L46 54 Z" fill="#93a0e8" />
									<path d="M52 52 L30 30 L50 46 Z" fill="#6a76c8" />
								</g>
								<circle cx="52" cy="52" r="3.4" fill="#f0d9a8" />
							</BoltedSvg>
							<span style={{ position: 'absolute', left: '50%', top: '-3px', transform: 'translateX(-50%)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: '#f0d9a8', letterSpacing: '.1em' }}>N</span>
						</div>

						{/* graticule label (soundings ride each mark, keyed to seasons spent) */}
						<span data-hide-mobile style={{ position: 'absolute', right: '10px', top: '8px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '.14em', color: 'rgba(147,160,232,.4)' }}>58°N · 7°W</span>

						{/* here be dragons */}
						<div data-hide-mobile style={{ position: 'absolute', right: '3%', bottom: '12%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px', opacity: .55, pointerEvents: 'none' }}>
							<BoltedSvg svg={bolted.seaSerpent} spot="sea-serpent" width={72} height={26} viewBox="0 0 72 26" style={{ animation: 'serpent 7s ease-in-out infinite' }}><path d="M2 16 q7 -12 14 0 t14 0 t14 0 t14 0" stroke="#6a76c8" strokeWidth="1.6" fill="none" strokeLinecap="round" /><circle cx="66" cy="9" r="2.4" fill="#6a76c8" /><path d="M69 8 l4 -3 M69 10 l4 2" stroke="#6a76c8" strokeWidth="1.2" strokeLinecap="round" /></BoltedSvg>
							<span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9.5px', letterSpacing: '.14em', color: 'rgba(147,160,232,.5)', fontStyle: 'italic' }}>here be dragons · &amp; unfinished hobbies</span>
						</div>

						{/* scale bar */}
						<div data-hide-mobile style={{ position: 'absolute', left: '4%', bottom: '8%', display: 'flex', flexDirection: 'column', gap: '4px', pointerEvents: 'none' }}>
							<div style={{ display: 'flex', alignItems: 'flex-end', height: '9px' }}><span style={{ width: '22px', height: '6px', background: 'rgba(147,160,232,.4)' }} /><span style={{ width: '22px', height: '6px', background: 'transparent', border: '1px solid rgba(147,160,232,.4)', borderLeft: 'none' }} /><span style={{ width: '22px', height: '6px', background: 'rgba(147,160,232,.4)' }} /></div>
							<span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '8.5px', letterSpacing: '.1em', color: 'rgba(147,160,232,.45)' }}>nautical miles, roughly</span>
						</div>

						{/* Cat's Holm · the rock the harbor cat keeps watch from */}
						<div data-hide-mobile title="the cat keeps this rock" style={{ position: 'absolute', right: '9%', top: '15%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', pointerEvents: 'none', zIndex: 3 }}>
							<div style={{ position: 'relative', width: '34px', height: '15px' }}>
								<div style={{ position: 'absolute', left: 0, bottom: 0, width: '34px', height: '11px', borderRadius: '50% 50% 42% 42%', background: 'linear-gradient(180deg,#3a3f66,#20263f)' }} />
								<div style={{ position: 'absolute', left: '9px', bottom: '8px', width: '2px', height: '7px', background: '#5f6ec4' }} />
								<div style={{ position: 'absolute', left: '7px', bottom: '12px', width: '6px', height: '4px', background: '#f0d9a8', clipPath: 'polygon(0 0,100% 0,72% 50%,100% 100%,0 100%)', animation: 'pennantWave 3.5s ease-in-out infinite', transformOrigin: 'left' }} />
							</div>
							<span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '.08em', color: 'rgba(147,160,232,.62)', fontStyle: 'italic', whiteSpace: 'nowrap' }}>Cat's Holm</span>
						</div>

						{/* the cartouche · a chart's title box is the period-authentic place for a dedication */}
						<div className="shipslog__cartouche" onClick={() => setMemorial(true)} data-hide-mobile title="in memory of the keepers of Flannan Isle" style={{ position: 'absolute', left: '3.5%', top: '56%', width: '210px', cursor: 'pointer', zIndex: 3 }}>
							<div style={{ position: 'relative', border: '1px solid rgba(240,217,168,.34)', borderRadius: '3px', background: 'linear-gradient(180deg,rgba(20,26,48,.92),rgba(15,20,38,.92))', padding: '12px 15px 11px', boxShadow: '0 8px 22px rgba(0,0,0,.42)' }}>
								<span style={{ position: 'absolute', left: '4px', top: '4px', width: '8px', height: '8px', borderLeft: '1px solid rgba(240,217,168,.5)', borderTop: '1px solid rgba(240,217,168,.5)' }} />
								<span style={{ position: 'absolute', right: '4px', top: '4px', width: '8px', height: '8px', borderRight: '1px solid rgba(240,217,168,.5)', borderTop: '1px solid rgba(240,217,168,.5)' }} />
								<span style={{ position: 'absolute', left: '4px', bottom: '4px', width: '8px', height: '8px', borderLeft: '1px solid rgba(240,217,168,.5)', borderBottom: '1px solid rgba(240,217,168,.5)' }} />
								<span style={{ position: 'absolute', right: '4px', bottom: '4px', width: '8px', height: '8px', borderRight: '1px solid rgba(240,217,168,.5)', borderBottom: '1px solid rgba(240,217,168,.5)' }} />
								<div style={{ display: 'flex', alignItems: 'center', gap: '7px', justifyContent: 'center' }}>
									<span style={{ width: '24px', height: '1px', background: 'linear-gradient(90deg,transparent,rgba(240,217,168,.6))' }} />
									<svg width="12" height="15" viewBox="0 0 20 30" fill="none"><path d="M10 2 L13 8 L7 8 Z" fill="#f0d9a8" /><rect x="7.5" y="8" width="5" height="13" fill="none" stroke="rgba(240,217,168,.7)" strokeWidth="1.2" /></svg>
									<span style={{ width: '24px', height: '1px', background: 'linear-gradient(270deg,transparent,rgba(240,217,168,.6))' }} />
								</div>
								<div style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: '12.5px', lineHeight: 1.45, color: '#d6dcf4', textAlign: 'center', marginTop: '8px' }}>for the three keepers of Eilean Mòr, still on watch</div>
								<div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '8px', letterSpacing: '.14em', color: 'rgba(147,160,232,.55)', textTransform: 'uppercase', textAlign: 'center', marginTop: '8px' }}>Eilean Mòr · December 1900 · tap to read</div>
							</div>
						</div>

						{/* the plotted hobbies */}
						{hobbies.map((hobby, index) => {
							if (!hobby.coord) {
								return null;
							}
							const p = proj(hobby.coord);
							return (
								<div
									key={hobby.id}
									data-mark
									data-hobby-id={hobby.id}
									data-state={hobby.state}
									className="shipslog__mark"
									onClick={() => openHobby(index)}
									onMouseEnter={() => onHover(index)}
									onMouseLeave={() => offHover(index)}
									title={hobby.bearing}
									style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%,-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', cursor: 'pointer', zIndex: 3, transition: 'filter .2s, transform .2s', filter: hoverIdx === index ? 'brightness(1.18)' : 'none' }}
								>
									<div style={{ position: 'relative', width: '64px', height: '56px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
										{hobby.seasons && <span style={{ position: 'absolute', left: '-1px', top: '-3px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '8.5px', letterSpacing: '.04em', color: 'rgba(147,160,232,.5)', pointerEvents: 'none', zIndex: 1 }}>{hobby.seasons}</span>}
										{markGlyph(hobby.state, bolted)}
										{flaredNow[hobby.name] && <div style={{ position: 'absolute', left: '50%', top: '28%', width: '32px', height: '32px', transform: 'translate(-50%,-50%)', borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,106,82,.55),transparent 68%)', filter: 'blur(1px)', animation: 'flareGlowPulse 3s ease-in-out infinite', pointerEvents: 'none' }} />}
										<div style={{ position: 'absolute', left: '50%', bottom: '-5px', transform: 'translateX(-50%)', width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(147,160,232,.95)', boxShadow: '0 0 6px 1px rgba(147,160,232,.5)', pointerEvents: 'none' }} />
									</div>
									<div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#dfe3f4', background: 'rgba(14,18,38,.82)', border: '1px solid rgba(150,160,220,.28)', borderRadius: '7px', padding: '3px 10px', whiteSpace: 'nowrap', boxShadow: '0 4px 10px rgba(0,0,0,.4)' }}>{hobby.name}</div>
								</div>
							);
						})}

						{/* in memoriam · the Flannan Isle keepers · a real light, a real loss */}
						<div data-mark className="shipslog__memorial" onClick={() => setMemorial(true)} title="Eilean Mòr · the keepers’ light still burns · tap to read" style={{ position: 'absolute', left: `${memP.x}%`, top: `${memP.y}%`, transform: 'translate(-50%,-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', zIndex: 3 }}>
							<div style={{ position: 'relative', width: '46px', height: '44px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
								<div className="shipslog__flannan" style={{ position: 'absolute', left: '50%', top: '38%', width: '48px', height: '48px', transform: 'translate(-50%,-50%)', borderRadius: '50%', background: 'radial-gradient(circle,rgba(240,217,168,.38),transparent 66%)', filter: 'blur(2px)', animation: 'flannanFl2 30s linear infinite', pointerEvents: 'none' }} />
								<svg width="20" height="30" viewBox="0 0 20 30" fill="none" style={{ position: 'relative', zIndex: 2 }}><path d="M10 2 L13 8 L7 8 Z" fill="#f0d9a8" className="shipslog__flannan" style={{ animation: 'flannanFl2 30s linear infinite' }} /><rect x="7.5" y="8" width="5" height="13" fill="none" stroke="rgba(240,217,168,.7)" strokeWidth="1.2" /><path d="M4 26 q6 -3 12 0" stroke="rgba(240,217,168,.55)" strokeWidth="1.2" fill="none" /></svg>
							</div>
							<div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '.08em', color: 'rgba(147,160,232,.62)', fontStyle: 'italic', whiteSpace: 'nowrap' }}>Eilean Mòr</div>
						</div>

						{/* the uncharted slot */}
						<div data-mark className="shipslog__uncharted" onClick={() => setNextIdx((i) => (i + 1) % suggestionList.length)} title="uncharted waters · plot the next hobby" style={{ position: 'absolute', left: `${unP.x}%`, top: `${unP.y}%`, transform: 'translate(-50%,-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', zIndex: 3, transition: 'filter .2s', userSelect: 'none' }}>
							<div style={{ position: 'relative', width: '60px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
								<div style={{ width: '44px', height: '44px', border: '1.5px dashed rgba(240,217,168,.55)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'qmarkPulse 3.4s ease-in-out infinite' }}><span style={{ fontFamily: "'Gloock', serif", fontSize: '22px', color: '#f0d9a8' }}>?</span></div>
							</div>
							<div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#f0d9a8', background: 'rgba(240,217,168,.08)', border: '1px dashed rgba(240,217,168,.45)', borderRadius: '7px', padding: '3px 10px', whiteSpace: 'nowrap' }}>next: {suggestionList[nextIdx]}</div>
						</div>

					</div>
					<span style={{ display: 'block', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#5f6ec4', paddingTop: '12px' }}>tap any mark to read its last known bearing · soundings mark seasons kept at it, not fathoms · the chart is not to scale, and neither is the keeper</span>
				</div>
			</div>

			{/* THE SHIP'S LOG */}
			<div style={{ padding: '12px clamp(20px,5vw,52px) clamp(36px,6vw,56px)', display: 'flex', flexDirection: 'column', maxWidth: '960px', boxSizing: 'border-box', width: '100%', margin: '0 auto' }}>
				<div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', flexWrap: 'wrap', padding: '0 6px 12px', borderBottom: '1px solid rgba(150,160,220,.18)' }}>
					<span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px', letterSpacing: '.14em', color: '#93a0e8', textTransform: 'uppercase' }}>The ship's log</span>
					<span style={{ fontSize: '15px', color: '#5f6ec4', fontStyle: 'italic' }}>last known bearings</span>
				</div>

				{hobbies.map((hobby, index) => {
					const meta = STATE_META[hobby.state];
					return (
						<div
							key={hobby.id}
							className="shipslog__row"
							data-logrow
							data-hobby-id={hobby.id}
							onClick={() => openHobby(index)}
							onMouseEnter={() => onHover(index)}
							onMouseLeave={() => offHover(index)}
							style={{ display: 'flex', gap: '18px', alignItems: 'center', padding: '18px 10px', borderTop: '1px solid rgba(150,160,220,.14)', cursor: 'pointer', transition: 'background .2s', background: hoverIdx === index ? 'rgba(147,160,232,.05)' : 'transparent', animation: 'fadeUp .5s ease backwards', animationDelay: `${(0.3 + index * 0.07).toFixed(2)}s` }}
						>
							<span style={pillStyle(hobby.state, false)}>{meta.label}</span>
							<span data-logprose style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 300px', minWidth: 0 }}>
								<span style={{ display: 'flex', alignItems: 'baseline', gap: '11px', flexWrap: 'wrap' }}>
									<span style={{ fontFamily: "'Gloock', serif", fontSize: 'clamp(19px,2.6vw,22px)', color: '#eef0fb', lineHeight: 1.2 }}>{hobby.name}</span>
									<span className="shipslog__coord" data-hide-mobile style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#8a93c4' }}>◈ {hobby.coord ? fmtCoord(hobby.coord) : 'uncharted'}</span>
									<span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#5f6ec4' }}>{hobby.service}</span>
								</span>
								<span style={{ fontSize: '15px', fontStyle: 'italic', color: '#a5aed4', lineHeight: 1.5, textWrap: 'pretty' }}>{hobby.bearing}</span>
							</span>
							<span data-odds style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flex: 'none' }}>
								<span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10.5px', letterSpacing: '.1em', color: '#5f6ec4', textTransform: 'uppercase' }}>odds of return</span>
								<span data-odds-val style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: hobby.state === 'inkspill' ? '#8a93c4' : hobby.state === 'port' ? '#7f8fb8' : '#c3cbf2', textAlign: 'right', maxWidth: '190px', lineHeight: 1.4 }}>{hobby.odds}</span>
							</span>
						</div>
					);
				})}

				<div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginTop: '18px', borderTop: '1px solid rgba(150,160,220,.14)', paddingTop: '16px' }}>
					<span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: '#5f6ec4' }}>// no hobby struck from the register. some are just overdue.</span>
					<span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
						<span style={{ display: 'flex', gap: '9px', transform: 'rotate(-14deg)' }}>
							<span style={{ width: '9px', height: '8px', background: 'rgba(147,160,232,.35)', borderRadius: '50% 50% 45% 45%' }} />
							<span style={{ width: '9px', height: '8px', background: 'rgba(147,160,232,.3)', borderRadius: '50% 50% 45% 45%', transform: 'translateY(7px)' }} />
							<span style={{ width: '9px', height: '8px', background: 'rgba(147,160,232,.25)', borderRadius: '50% 50% 45% 45%' }} />
						</span>
						<span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#5f6ec4' }}>the cat watches the horizon</span>
					</span>
				</div>
			</div>

			{/* bearing overlay */}
			{open && (
				<div onClick={requestClose} style={{ position: 'fixed', inset: 0, background: 'rgba(8,10,20,.72)', backdropFilter: 'blur(5px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(14px,4vw,40px)', animation: closing ? 'backdropOut .22s ease both' : 'backdropIn .25s ease both' }}>
					<div className="shipslog__bearing" onClick={(event) => event.stopPropagation()} style={{ position: 'relative', width: 'min(620px,100%)', animation: closing ? 'cardOut .22s ease both' : 'cardIn .35s ease both' }}>
						{catHere && <div className="cat-mount shipslog__cat-mount"><HarborCat pose="perched" context="chart" quips={BEARING_QUIPS} designs={catDesigns} /></div>}
						<div style={{ maxHeight: '86vh', overflow: 'auto', background: 'linear-gradient(180deg,#f1ecdd,#eae3d1)', borderRadius: '6px 12px 12px 6px', boxShadow: '0 30px 80px rgba(0,0,0,.6)' }}>
							<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '16px clamp(20px,4vw,30px)', borderBottom: '1.5px dashed rgba(110,100,75,.35)' }}>
								<span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11.5px', letterSpacing: '.14em', color: '#8a7f63', textTransform: 'uppercase' }}>Last known bearing</span>
								<span className="shipslog__pill-close" onClick={requestClose} style={{ cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: '12.5px', color: '#7d7357', padding: '5px 11px', border: '1px solid rgba(110,100,75,.4)', borderRadius: '999px', transition: 'all .2s' }}>close ✕</span>
							</div>
							<div style={{ padding: 'clamp(22px,4vw,32px)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
								<div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
									<span className="shipslog__bearing-name" style={{ fontFamily: "'Gloock', serif", fontSize: 'clamp(23px,3.8vw,28px)', color: '#20233c' }}>{open.name}</span>
									<span style={pillStyle(open.state, true)}>{STATE_META[open.state].label}</span>
								</div>
								<div style={{ fontSize: '16px', fontStyle: 'italic', lineHeight: 1.65, color: '#3b3f5e', borderLeft: '2px solid rgba(110,100,75,.3)', paddingLeft: '14px' }}>{open.lastLog}</div>
								<div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '10px 16px', fontSize: '15px', lineHeight: 1.55, color: '#3b3f5e', alignItems: 'baseline' }}>
									<span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '.12em', color: '#8a7f63', textTransform: 'uppercase' }}>how it went off course</span><span>{open.offCourse}</span>
									<span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '.12em', color: '#8a7f63', textTransform: 'uppercase' }}>what still floats</span><span>{open.floats}</span>
									<span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '.12em', color: '#8a7f63', textTransform: 'uppercase' }}>odds of return</span><span style={{ color: '#6a5a2a' }}>{open.odds}</span>
								</div>
								{bearingNotes.length > 0 && (
									<div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap', borderTop: '1.5px dashed rgba(110,100,75,.3)', paddingTop: '12px' }}>
										<span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '.12em', color: '#8a7f63', textTransform: 'uppercase', flex: 'none' }}>logged in the journal</span>
										<div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
											{bearingNotes.map((note) => (
												<button key={note.id} type="button" title="read the entry" className="shipslog__note-link" onClick={() => setNoteId(note.id)} style={{ fontFamily: "'Newsreader', serif", fontSize: '15px', fontStyle: 'italic', color: '#6b6390', lineHeight: 1.45, cursor: 'pointer', transition: 'color .2s', background: 'none', border: 'none', padding: 0, textAlign: 'left' }}>✷ {note.title} →</button>
											))}
										</div>
									</div>
								)}
								<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', borderTop: '1.5px dashed rgba(110,100,75,.3)', paddingTop: '12px' }}>
									<span className="shipslog__flare-btn" onClick={sendFlare} style={{ position: 'relative', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: '#7d7357', padding: '7px 15px', border: '1.5px dashed rgba(110,100,75,.5)', borderRadius: '999px', userSelect: 'none', transition: 'all .2s' }}>
										<BoltedSvg svg={bolted.signalFlare} spot="signal-flare" width={13} height={15} viewBox="0 0 13 15"><path d="M6.5 14 V6" stroke="#8a6d3b" strokeWidth="1.3" strokeLinecap="round" /><path d="M6.5 1 L8 4.5 L6.5 3.5 L5 4.5 Z" fill="#d64535" /><circle cx="6.5" cy="2" r="1.4" fill="#ff6a52" /></BoltedSvg>
										send up a flare
									</span>
									<span className="shipslog__flare-line" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#a39876' }}>{flareLine}</span>
								</div>
								<div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
									<span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#a39876' }}>position · {open.coord ? fmtCoord(open.coord) : 'uncharted'} · logged {open.service}</span>
									<span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: '#8a6d3b' }}>- the keeper, still hoping</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* a signal flare, fired from the bearing card */}
			{flareFiring && (
				<div className="shipslog__flare-firing" style={{ position: 'fixed', left: '50%', bottom: '9%', transform: 'translateX(-50%)', width: 0, height: 0, zIndex: 80, pointerEvents: 'none' }}>
					<div style={{ position: 'absolute', left: '-1.5px', bottom: 0, width: '3px', height: '42px', borderRadius: '2px', background: 'linear-gradient(180deg,#ff6a52,rgba(255,106,82,0))', boxShadow: '0 0 12px 3px rgba(255,106,82,.75)', animation: 'flareRise 2.4s ease-out both' }} />
					<div style={{ position: 'absolute', bottom: '220px', left: 0, transform: 'translateX(-50%)', animation: 'flareBloom 2.4s ease-out both' }}>
						<div style={{ position: 'absolute', left: '50%', top: '50%', width: '130px', height: '130px', transform: 'translate(-50%,-50%)', borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,106,82,.6),rgba(255,72,52,.16) 45%,transparent 70%)', filter: 'blur(2px)' }} />
						<BoltedSvg svg={bolted.compassRoseStar} spot="compass-rose-star" width={32} height={32} viewBox="0 0 30 30" style={{ position: 'relative' }}><path d="M15 0 L17 13 L15 11 L13 13 Z M15 30 L13 17 L15 19 L17 17 Z M0 15 L13 13 L11 15 L13 17 Z M30 15 L17 17 L19 15 L17 13 Z" fill="#ff6a52" /><circle cx="15" cy="15" r="3" fill="#fff" /></BoltedSvg>
						<BoltedSvg svg={bolted.sailTent} spot="sail-tent" width={24} height={15} viewBox="0 0 22 14" style={{ position: 'absolute', left: '50%', top: '-15px', transform: 'translateX(-50%)', opacity: .85 }}><path d="M2 12 Q11 -6 20 12" fill="none" stroke="rgba(255,106,82,.75)" strokeWidth="1.4" /><path d="M11 1 V12 M2 12 l9 -3 M20 12 l-9 -3" stroke="rgba(255,106,82,.5)" strokeWidth="1" /></BoltedSvg>
					</div>
				</div>
			)}

			{/* in memoriam overlay */}
			{memorial && (
				<div onClick={() => setMemorial(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(6,8,16,.82)', backdropFilter: 'blur(6px)', zIndex: 55, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(14px,4vw,40px)', animation: 'backdropIn .25s ease both' }}>
					<div className="shipslog__memorial-modal" onClick={(event) => event.stopPropagation()} style={{ position: 'relative', width: 'min(500px,100%)', animation: 'cardIn .4s ease both' }}>
						<div style={{ background: 'linear-gradient(180deg,#141a30,#0f1426)', border: '1px solid rgba(240,217,168,.22)', borderRadius: '12px', boxShadow: '0 30px 80px rgba(0,0,0,.7)', overflow: 'hidden' }}>
							<div style={{ height: '3px', background: 'linear-gradient(90deg,transparent,rgba(240,217,168,.6),transparent)' }} />
							<div style={{ padding: 'clamp(26px,5vw,40px)', display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center', textAlign: 'center' }}>
								<svg width="34" height="40" viewBox="0 0 26 30" fill="none"><path d="M13 2 L17 9 L9 9 Z" fill="#f0d9a8" style={{ animation: 'lampPulse 5s ease-in-out infinite' }} /><rect x="10" y="9" width="6" height="14" fill="none" stroke="rgba(240,217,168,.7)" strokeWidth="1.4" /><path d="M10 13 h6 M10 17 h6" stroke="rgba(240,217,168,.6)" strokeWidth="1.4" /><path d="M6 27 q7 -4 14 0" stroke="rgba(147,160,232,.5)" strokeWidth="1.4" fill="none" /></svg>
								<span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', letterSpacing: '.2em', color: '#f0d9a8', textTransform: 'uppercase' }}>In memoriam</span>
								<span style={{ fontFamily: "'Gloock', serif", fontSize: 'clamp(24px,4vw,28px)', color: '#f0f2fc', lineHeight: 1.15 }}>The keepers of Flannan Isle</span>
								<span style={{ fontSize: '16px', fontStyle: 'italic', color: '#c8cef0', lineHeight: 1.5 }}>James Ducat · Thomas Marshall · Donald MacArthur</span>
								<span style={{ fontSize: '15px', color: '#a5aed4', lineHeight: 1.7, maxWidth: '420px' }}>Eilean Mòr, December 1900. Three keepers of the light, lost to the sea in a storm that left no answer behind it. The lamp was found trimmed, clean, and ready to be lit.</span>
								<div style={{ width: '60px', height: '1px', background: 'rgba(150,160,220,.3)', margin: '2px 0' }} />
								<span style={{ fontSize: '14.5px', fontStyle: 'italic', color: '#8f9be0', lineHeight: 1.55, maxWidth: '400px' }}>This chart, and every light kept on this coast, is kept in their memory.</span>
								<span className="shipslog__mem-close" onClick={() => setMemorial(false)} style={{ cursor: 'pointer', marginTop: '4px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '12.5px', color: '#93a0e8', padding: '7px 16px', border: '1px solid rgba(150,160,220,.3)', borderRadius: '999px', transition: 'all .2s' }}>with respect ✕</span>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* a journal entry, pulled up from a bearing card; closing returns to the still-open card */}
			{openNote && (
				<JournalEntryOverlay
					note={openNote}
					doodle={openNoteDoodle}
					signoff={signoff}
					closeLabel="back to the bearing ✕"
					onClose={() => setNoteId(null)}
				/>
			)}
		</>
	);
}

// One mark glyph per state, transcribed from Hobbies.dc.html: the moored lamp on
// its jetty with a buoy, the adrift boat over its wake, the marooned palm on a
// sandbar, the port buoy with pennants flying, the smudged ink-spill. Each
// glyph's svg is a carving spot; the jetties/buoys/pennants around it are CSS,
// carved in place. The moored flame's pulse and the wake's fade stay page-side:
// the fallback keeps its inline animation, a bolted carving pulses only where
// it tags data-carving-anchor (the rules in ShipsLog.css).
function markGlyph(state: HobbyState, bolted: DioramaCarvings): ReactElement | null {
	switch (state) {
		case 'moored':
			return (
				<div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
					<BoltedSvg svg={bolted.mooredLamp} spot="moored-lamp" width={30} height={34} viewBox="0 0 26 30" style={{ position: 'relative', zIndex: 2 }}><path d="M13 2 L17 9 L9 9 Z" fill="#f0d9a8" style={{ animation: 'lampPulse 4s ease-in-out infinite' }} /><rect x="10" y="9" width="6" height="14" fill="none" stroke="#93a0e8" strokeWidth="1.4" /><path d="M10 13 h6 M10 17 h6" stroke="#93a0e8" strokeWidth="1.4" /></BoltedSvg>
					<div style={{ width: '44px', height: '9px', marginTop: '-2px', borderRadius: '60% 70% 0 0 / 100% 100% 0 0', background: 'linear-gradient(180deg,#2a3358,#141a34)' }} />
					<div style={{ position: 'absolute', right: '-6px', bottom: '2px', width: '9px', height: '11px', background: '#c05a4a', borderRadius: '50% 50% 45% 45%', animation: 'buoyBob 3s ease-in-out infinite' }} />
				</div>
			);
		case 'adrift':
			return (
				<div style={{ position: 'relative' }}>
					<BoltedSvg svg={bolted.adriftWake} spot="adrift-wake" width={52} height={16} viewBox="0 0 60 16" style={bolted.adriftWake ? { position: 'absolute', right: '22px', top: '12px' } : { position: 'absolute', right: '22px', top: '12px', animation: 'wakePulse 3s ease-in-out infinite' }}><path d="M2 8 q7 -6 14 0 t14 0 t14 0 t14 0" stroke="rgba(240,217,168,.5)" strokeWidth="1.4" fill="none" strokeDasharray="1 5" strokeLinecap="round" /></BoltedSvg>
					<BoltedSvg svg={bolted.adriftBoat} spot="adrift-boat" width={34} height={28} viewBox="0 0 30 24" style={{ position: 'relative', zIndex: 2, animation: 'boatDrift 5s ease-in-out infinite' }}><path d="M4 15 L26 15 L21 22 L9 22 Z" fill="#93a0e8" /><path d="M15 15 V3" stroke="#5f6ec4" strokeWidth="1.5" /><path d="M15 3 L24 13 L15 13 Z" fill="#f0d9a8" /></BoltedSvg>
				</div>
			);
		case 'marooned':
			return (
				<div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
					<BoltedSvg svg={bolted.maroonedPalm} spot="marooned-palm" width={30} height={30} viewBox="0 0 30 30" style={{ position: 'absolute', left: '6px', bottom: '8px', transformOrigin: '14px 26px', animation: 'palmSway 6s ease-in-out infinite' }}><path d="M14 28 q-2 -12 1 -20" stroke="#8a7142" strokeWidth="2" fill="none" strokeLinecap="round" /><path d="M15 8 q-8 -3 -13 1 M15 8 q8 -3 13 1 M15 8 q-5 -6 -12 -6 M15 8 q5 -6 12 -6" stroke="#5f8a5f" strokeWidth="1.8" fill="none" strokeLinecap="round" /></BoltedSvg>
					<div style={{ width: '52px', height: '12px', borderRadius: '50% 50% 40% 40%', background: 'linear-gradient(180deg,#6a5a38,#3a3020)' }} />
				</div>
			);
		case 'port':
			return (
				<div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
					<div style={{ position: 'absolute', left: '14px', bottom: '20px', width: '1.5px', height: '20px', background: '#8a93c4' }} />
					<div style={{ position: 'absolute', left: '15px', top: '-2px', width: '16px', height: '8px', background: '#6fca97', clipPath: 'polygon(0 0,100% 0,80% 50%,100% 100%,0 100%)', animation: 'pennantWave 3.5s ease-in-out infinite', transformOrigin: 'left' }} />
					<div style={{ position: 'absolute', left: '15px', top: '8px', width: '12px', height: '6px', background: '#f0d9a8', clipPath: 'polygon(0 0,100% 0,75% 50%,100% 100%,0 100%)', animation: 'pennantWave 3.5s ease-in-out .4s infinite', transformOrigin: 'left' }} />
					<BoltedSvg svg={bolted.portAnchor} spot="port-anchor" width={26} height={30} viewBox="0 0 26 30" style={{ position: 'relative', zIndex: 2 }}><circle cx="13" cy="5" r="3" stroke="#93a0e8" strokeWidth="1.6" /><path d="M13 8 V26" stroke="#93a0e8" strokeWidth="1.6" /><path d="M6 15 H20" stroke="#93a0e8" strokeWidth="1.6" /><path d="M5 22 q8 7 16 0" stroke="#93a0e8" strokeWidth="1.6" fill="none" strokeLinecap="round" /></BoltedSvg>
				</div>
			);
		case 'inkspill':
			return (
				<div style={{ position: 'relative', width: '52px', height: '40px', animation: 'inkPulse 5s ease-in-out infinite' }}>
					<div style={{ position: 'absolute', left: '8px', top: '6px', width: '34px', height: '26px', borderRadius: '56% 44% 62% 38% / 54% 60% 40% 46%', background: 'radial-gradient(circle at 40% 38%,#2a3160,#141833)' }} />
					<div style={{ position: 'absolute', left: '2px', top: '16px', width: '16px', height: '13px', borderRadius: '60% 40% 50% 50%', background: '#182046' }} />
					<div style={{ position: 'absolute', right: '3px', top: '2px', width: '12px', height: '11px', borderRadius: '50%', background: '#1c2450' }} />
					<div style={{ position: 'absolute', right: '-2px', bottom: '2px', width: '5px', height: '5px', borderRadius: '50%', background: '#182046' }} />
					<span style={{ position: 'absolute', left: '18px', top: '14px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'rgba(147,160,232,.5)' }}>✕</span>
				</div>
			);
	}
}

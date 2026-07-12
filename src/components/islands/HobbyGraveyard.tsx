// The hobby graveyard register: rows with a per-disposition marker, the
// manila "keeper's record" modal, fireflies, the cat's paw rounds, and
// leave-a-flower (persisted to localStorage, keyed by the hobby's stable id
// rather than its row index, so reordering the register never misattributes
// a flower). Per Hobbies.dc.html: `kind` (alive/haunt/dark), not the freeform
// `disposition` string, drives the marker/pill/lamp-dot colors; raw
// characteristics ("Fl W 3s") stay per the standing exemption in the
// identity doc, decoded nowhere on this page since plain language ("still
// on watch", the log line) already carries the meaning beside them.
import { useEffect, useRef, useState, type ReactElement } from 'react';
import type { FigureheadDesign, Hobby } from '../../lib/api';
import { pageCatPick } from '../../lib/catSpots';
import { useEscapeKey } from './useEscapeKey';
import HarborCat from './HarborCat';
import NextHobbyChip from './NextHobbyChip';
import './HobbyGraveyard.css';

const CLOSE_MS = 220;
const FLOWERS_KEY = 'argsea-flowers';

// The haunting moment (Hobbies.dc.html): every 53s, the haunt-kind hobby
// goes golden for 2200ms and its log line swaps to the metronome line, per
// the mock's own hauntTimer/hauntOff pair verbatim.
const HAUNT_INTERVAL_MS = 53000;
const HAUNT_DURATION_MS = 2200;
const HAUNT_LOG_LINE = '…is that the metronome?';

// The design's own base tilt per row index (mod 5), before wear adds its own
// couple of degrees on top for stone markers.
const TILTS = [0, -2.5, 2, -1.5, 2.5];

/** A service string that doesn't read as a dated range ("one summer") is beyond dating: it wears as fully weathered. */
function effectiveWear(hobby: Hobby): number {
	return /^\d/.test(hobby.service) ? hobby.wear : 1;
}

function plotLabel(position: number): string {
	return String(position).padStart(2, '0');
}

// A migrated record may leave the new fields empty; the postcard-era value
// stands in (operator ruling 2026-07-11): the service reads the old dates, the
// pill/chip phrase the epitaph with its leading dagger dropped, the row line the
// eulogy. Anything re-recorded in the admin already fills the new field and wins.
function displayService(hobby: Hobby): string {
	return hobby.service || hobby.dates;
}

function displayPhrase(hobby: Hobby): string {
	return hobby.disposition || hobby.epitaph.replace(/^\s*†\s*/, '');
}

function displayLog(hobby: Hobby): string {
	return hobby.log || hobby.eulogy;
}

// Graveside dressing is drawn from a small pool and placed deterministically per
// hobby: the seed is a cheap hash of the id, so a hoist that re-fetches the same
// graves never reshuffles their dressing. Grass may share a plot with one other
// object; otherwise a plot holds at most one, and some hold nothing (which reads
// as random too). The four objects past the mock (seashell, wildflower, tiny
// lantern, snail) are authored, not in Hobbies.dc.html; the mound itself is.
type DressKind = 'pebbles' | 'pinwheel' | 'mushroom' | 'seashell' | 'wildflower' | 'lantern' | 'snail';
const DRESS_OBJECTS: DressKind[] = ['pebbles', 'pinwheel', 'mushroom', 'seashell', 'wildflower', 'lantern', 'snail'];

interface TuftSpec {
	side:  'left' | 'right';
	offset: number;
	scale:  number;
	flip:   boolean;
}

interface ObjectSpec {
	kind:   DressKind;
	side:   'left' | 'right';
	offset: number;
}

interface DressingPlan {
	tufts:  TuftSpec[];
	object: ObjectSpec | null;
}

function hashId(id: string): number {
	let h = 2166136261;
	for (let i = 0; i < id.length; i += 1) {
		h ^= id.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

/** A tiny deterministic PRNG (mulberry32): a seed in, a stable stream of [0,1) out. */
function seededRandom(seed: number): () => number {
	let state = seed;
	return () => {
		state = (state + 0x6d2b79f5) | 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function planDressing(id: string): DressingPlan {
	const rand = seededRandom(hashId(id));
	const grassRoll = rand();
	const objectRoll = rand();
	const sideRoll = rand();
	const secondTuftRoll = rand();
	const kindRoll = rand();
	const jitterA = rand();
	const jitterB = rand();

	const grassSide: 'left' | 'right' = sideRoll < 0.5 ? 'left' : 'right';
	const hasGrass = grassRoll < 0.58;
	const hasObject = objectRoll < 0.52;

	const tufts: TuftSpec[] = [];
	if (hasGrass) {
		tufts.push({ side: grassSide, offset: 6 + Math.round(jitterA * 6), scale: 0.82 + jitterA * 0.33, flip: grassSide === 'right' });
		if (secondTuftRoll < 0.4) {
			tufts.push({ side: grassSide, offset: 22 + Math.round(jitterB * 8), scale: 0.72 + jitterB * 0.2, flip: grassSide === 'left' });
		}
	}

	let object: ObjectSpec | null = null;
	if (hasObject) {
		const kind = DRESS_OBJECTS[Math.floor(kindRoll * DRESS_OBJECTS.length)];
		// grass claims one side and the object the other; with no grass it picks freely
		const side: 'left' | 'right' = hasGrass ? (grassSide === 'left' ? 'right' : 'left') : (jitterB < 0.5 ? 'left' : 'right');
		object = { kind, side, offset: 4 + Math.round(jitterA * 8) };
	}

	return { tufts, object };
}

interface Props {
	hobbies:     Hobby[];
	suggestions: string[];
	catEnabled:  boolean;
	catPages?:   Record<string, boolean>;
	catSpots?:   Record<string, boolean>;
	catDesigns?: FigureheadDesign[];
}

export default function HobbyGraveyard({ hobbies, suggestions, catEnabled, catPages, catSpots, catDesigns }: Props) {
	const [openIndex, setOpenIndex] = useState<number | null>(null);
	const [closing, setClosing] = useState(false);
	const [hoverIndex, setHoverIndex] = useState<number | null>(null);
	const [flowers, setFlowers] = useState<Record<string, number>>({});
	const [haunting, setHaunting] = useState(false);
	const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	useEffect(() => {
		try {
			const stored = JSON.parse(localStorage.getItem(FLOWERS_KEY) ?? '{}');
			if (stored && typeof stored === 'object') {
				setFlowers(stored);
			}
		} catch {
			// a corrupt or blocked store just means no flowers remembered
		}
	}, []);

	useEffect(() => () => clearTimeout(closeTimer.current), []);

	useEffect(() => {
		let hauntOff: ReturnType<typeof setTimeout> | undefined;
		const hauntTimer = setInterval(() => {
			setHaunting(true);
			hauntOff = setTimeout(() => setHaunting(false), HAUNT_DURATION_MS);
		}, HAUNT_INTERVAL_MS);
		return () => {
			clearInterval(hauntTimer);
			clearTimeout(hauntOff);
		};
	}, []);

	const pick = catEnabled ? pageCatPick('hobbies', catPages, catSpots) : null;
	const catHere = pick?.id === 'hobbies.record';

	const requestClose = () => {
		if (closing || openIndex === null) {
			return;
		}
		setClosing(true);
		closeTimer.current = setTimeout(() => { setOpenIndex(null); setClosing(false); }, CLOSE_MS);
	};

	useEscapeKey(openIndex !== null, requestClose);

	const leaveFlower = () => {
		if (openIndex === null) {
			return;
		}
		const hobby = hobbies[openIndex];
		const next = { ...flowers, [hobby.id]: (flowers[hobby.id] ?? 0) + 1 };
		setFlowers(next);
		try {
			localStorage.setItem(FLOWERS_KEY, JSON.stringify(next));
		} catch {
			// storage may be unavailable (private mode, quota); the count just won't survive a reload
		}
	};

	const open = openIndex === null ? null : hobbies[openIndex];
	// The plaque number is display truth, not the hobby's data key: it's the
	// row's 1-based slot in the sorted register, so the open record reads 0N.
	const openPlot = openIndex === null ? '' : plotLabel(openIndex + 1);

	return (
		<section className="graveyard">
			<div className="graveyard__head">
				<span className="graveyard__head-label">Register of keepers · station burial ground</span>
				<span className="graveyard__head-district">argsea district</span>
			</div>

			<div className="graveyard__register">
				<Fireflies />
				<PawRounds />
				{hobbies.map((hobby, index) => (
					<Row
						key={hobby.id}
						hobby={hobby}
						index={index}
						hovered={hoverIndex === index}
						haunting={haunting && hobby.kind === 'haunt'}
						flowerCount={flowers[hobby.id] ?? 0}
						onOpen={() => setOpenIndex(index)}
						onHover={() => setHoverIndex(index)}
						onUnhover={() => setHoverIndex((current) => (current === index ? null : current))}
					/>
				))}
			</div>

			<div className="graveyard__foot">
				<span className="mono-comment">// plot {plotLabel(hobbies.length + 1)} stands open.</span>
				<div className="graveyard__foot-right">
					<NextHobbyChip values={suggestions} />
					<span className="graveyard__paw-caption">
						<span className="graveyard__paw-caption-dots" aria-hidden="true"><span /><span /><span /></span>
						the cat visits on rounds
					</span>
				</div>
			</div>

			{open && (
				<RecordModal
					hobby={open}
					plot={openPlot}
					closing={closing}
					flowerCount={flowers[open.id] ?? 0}
					onLeaveFlower={leaveFlower}
					onClose={requestClose}
					catHere={catHere}
					catDesigns={catDesigns}
				/>
			)}
		</section>
	);
}

interface RowProps {
	hobby:       Hobby;
	index:       number;
	hovered:     boolean;
	haunting:    boolean; // this row's own haunt-kind moment is live right now
	flowerCount: number;
	onOpen:      () => void;
	onHover:     () => void;
	onUnhover:   () => void;
}

function Row({ hobby, index, hovered, haunting, flowerCount, onOpen, onHover, onUnhover }: RowProps) {
	const haunt = hobby.kind === 'haunt';
	// The dot follows the marker: an active hobby (lamp) pulses gold, a resting
	// haunt idles on the rare flicker. The haunt moment overrides either with the
	// gold flare (Hobbies.dc.html's lampDot) and swaps the log to the metronome
	// copy, so an active hobby keeps its lamp yet still flares while it haunts.
	const dotModifier = haunting ? ' graveyard__lamp-dot--haunting' : hobby.active ? ' graveyard__lamp-dot--alive' : haunt ? ' graveyard__lamp-dot--haunt' : '';
	const service = displayService(hobby);
	const logLine = haunting ? HAUNT_LOG_LINE : displayLog(hobby);

	return (
		<div
			className={`graveyard__row${hobby.active ? '' : ' graveyard__row--resting'}`}
			style={{ animationDelay: `${(0.25 + index * 0.08).toFixed(2)}s` }}
			role="button"
			tabIndex={0}
			onClick={onOpen}
			onKeyDown={(event) => {
				if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(); }
			}}
			onMouseEnter={onHover}
			onMouseLeave={onUnhover}
			onFocus={onHover}
			onBlur={onUnhover}
		>
			<Marker hobby={hobby} index={index} hovered={hovered} haunting={haunting} flowerCount={flowerCount} />
			<div className="graveyard__record">
				<div className="graveyard__record-head">
					<span className="graveyard__name">{hobby.name}</span>
					{service && <span className="graveyard__service">{service}</span>}
					{hobby.char && (
						<span className="graveyard__char-row">
							<span className={`graveyard__lamp-dot${dotModifier}`} />
							{hobby.char}
						</span>
					)}
				</div>
				<span className="graveyard__log">{logLine}</span>
			</div>
			<div className="graveyard__side">
				<DispositionPill hobby={hobby} />
				<span className="graveyard__record-link">record →</span>
			</div>
		</div>
	);
}

function DispositionPill({ hobby }: { hobby: Hobby }) {
	const phrase = displayPhrase(hobby);
	if (!phrase) {
		return null;
	}
	const modifier = hobby.kind === 'alive' ? ' graveyard__pill--alive' : hobby.kind === 'haunt' ? ' graveyard__pill--haunt' : '';
	return <span className={`graveyard__pill${modifier}`}>{phrase}</span>;
}

function Marker({ hobby, index, hovered, haunting, flowerCount }: { hobby: Hobby; index: number; hovered: boolean; haunting: boolean; flowerCount: number }) {
	const active = hobby.active;
	const w = effectiveWear(hobby);
	const tilt = TILTS[index % TILTS.length];
	const lit = hovered || haunting;
	const plot = plotLabel(index + 1);

	// The haunting moment glows ~1.5x the mock's lit marker (operator ruling
	// 2026-07-11, ratified deviation): only the moment is boosted, a plain hover
	// stays at the mock's brightness.
	const glow = haunting
		? 'drop-shadow(0 0 14px rgba(240,196,120,.45)) brightness(1.15)'
		: 'drop-shadow(0 0 9px rgba(240,196,120,.3)) brightness(1.15)';
	const bodyStyle = {
		transform: `rotate(${(tilt + w * 2).toFixed(2)}deg)`,
		filter: lit ? glow : 'none',
	};

	let body: ReactElement;
	if (active) {
		body = <LampMarker plot={plot} />;
	} else if (hobby.marker === 'sticks') {
		body = <SticksMarker plot={plot} />;
	} else if (hobby.marker === 'driftwood') {
		body = <DriftwoodMarker plot={plot} />;
	} else if (hobby.marker === 'cairn') {
		body = <CairnMarker plot={plot} />;
	} else if (hobby.marker === 'buoy') {
		body = <BuoyMarker plot={plot} />;
	} else {
		body = <StoneMarker hobby={hobby} index={index} wear={w} lit={lit} plot={plot} />;
	}

	// An active hobby keeps its lamp even while it haunts, and a lamp is no grave:
	// it gets neither mound nor graveside dressing. Everything resting is planted
	// in a mound and may carry dressing, both sitting level while the marker leans.
	return (
		<div className="graveyard__marker">
			{!active && <Mound />}
			<div className="graveyard__marker-body" style={active ? undefined : bodyStyle}>
				{body}
			</div>
			{!active && <Dressing id={hobby.id} />}
			<Sprigs count={flowerCount} index={index} />
		</div>
	);
}

function Mound() {
	return (
		<div className="graveyard__mound" aria-hidden="true">
			<span className="graveyard__mound-shadow" />
			<span className="graveyard__mound-cap" />
			<span className="graveyard__mound-clod graveyard__mound-clod--a" />
			<span className="graveyard__mound-clod graveyard__mound-clod--b" />
			<span className="graveyard__mound-clod graveyard__mound-clod--c" />
			<span className="graveyard__mound-clod graveyard__mound-clod--d" />
		</div>
	);
}

function Dressing({ id }: { id: string }) {
	const plan = planDressing(id);
	return (
		<>
			{plan.tufts.map((tuft, index) => <Tuft key={index} spec={tuft} />)}
			{plan.object && <DressObject spec={plan.object} />}
		</>
	);
}

function Tuft({ spec }: { spec: TuftSpec }) {
	const pos = spec.side === 'left' ? { left: `${spec.offset}px` } : { right: `${spec.offset}px` };
	return (
		<svg
			width="17"
			height="12"
			viewBox="0 0 20 14"
			fill="none"
			stroke="#5f6ec4"
			strokeWidth={1.3}
			strokeLinecap="round"
			className="graveyard__tuft"
			style={{ ...pos, transform: `scale(${spec.scale.toFixed(2)})${spec.flip ? ' scaleX(-1)' : ''}` }}
			aria-hidden="true"
		>
			<path d="M4 13 Q5 6 2 2 M8 13 Q9 7 12 3 M12 13 Q12 8 10 6 M16 13 Q17 8 19 5" />
		</svg>
	);
}

function DressObject({ spec }: { spec: ObjectSpec }) {
	const pos = spec.side === 'left' ? { left: `${spec.offset}px` } : { right: `${spec.offset}px` };
	return (
		<div className={`graveyard__dress-object graveyard__dress-object--${spec.kind}`} style={pos} aria-hidden="true">
			<DressArt kind={spec.kind} />
		</div>
	);
}

function DressArt({ kind }: { kind: DressKind }): ReactElement | null {
	switch (kind) {
		case 'pebbles':
			return (
				<>
					<span className="graveyard__pebble" />
					<span className="graveyard__pebble" />
					<span className="graveyard__pebble" />
				</>
			);
		case 'pinwheel':
			return (
				<>
					<span className="graveyard__pinwheel-stem" />
					<svg width="20" height="20" viewBox="0 0 20 20" className="graveyard__pinwheel-vanes">
						<path d="M10 10 L10 1 A9 9 0 0 1 19 10 Z" fill="#93a0e8" />
						<path d="M10 10 L19 10 A9 9 0 0 1 10 19 Z" fill="#f0d9a8" />
						<path d="M10 10 L10 19 A9 9 0 0 1 1 10 Z" fill="#93a0e8" />
						<path d="M10 10 L1 10 A9 9 0 0 1 10 1 Z" fill="#f0d9a8" />
						<circle cx="10" cy="10" r="1.6" fill="#e8ebfa" />
					</svg>
				</>
			);
		case 'mushroom':
			return (
				<>
					<span className="graveyard__mushroom-stem" />
					<span className="graveyard__mushroom-cap" />
				</>
			);
		case 'seashell':
			return (
				<svg width="15" height="13" viewBox="0 0 16 14" fill="none">
					<path d="M8 13 C2.5 11.5 1 6 2 3 Q3 5.4 4 3 Q5 6 6 3.4 Q7 6 8 3 Q9 6 10 3.4 Q11 6 12 3 Q13 5.4 14 3 C15 6 13.5 11.5 8 13 Z" fill="#c9c2ab" stroke="#8a93c4" strokeWidth={0.8} />
					<path d="M8 13 L4.6 5 M8 13 L8 4.2 M8 13 L11.4 5" stroke="#8a93c4" strokeWidth={0.7} />
				</svg>
			);
		case 'wildflower':
			return (
				<svg width="12" height="16" viewBox="0 0 12 16" fill="none">
					<path d="M6 15 V6" stroke="#5f6ec4" strokeWidth={1.1} />
					<path d="M6 10 Q3 9 2.5 11" stroke="#5f6ec4" strokeWidth={1} />
					<g fill="#c3cbf2">
						<ellipse cx="6" cy="2.4" rx="1" ry="2.1" />
						<ellipse cx="6" cy="7.6" rx="1" ry="2.1" />
						<ellipse cx="3.4" cy="5" rx="2.1" ry="1" />
						<ellipse cx="8.6" cy="5" rx="2.1" ry="1" />
					</g>
					<circle cx="6" cy="5" r="1.5" fill="#f0d9a8" />
				</svg>
			);
		case 'lantern':
			return (
				<svg width="12" height="16" viewBox="0 0 12 16" fill="none">
					<circle cx="6" cy="9" r="5.2" fill="rgba(240,196,120,.18)" />
					<path d="M2.5 15 H9.5" stroke="#3a2c1e" strokeWidth={1.2} strokeLinecap="round" />
					<path d="M6 15 V13" stroke="#2a2f52" strokeWidth={1} />
					<rect x="3.4" y="5.4" width="5.2" height="7.6" rx="1" fill="#141225" stroke="rgba(240,217,168,.6)" strokeWidth={1} />
					<rect x="4.4" y="7" width="3.2" height="4.6" rx="0.6" fill="#f0d9a8" />
					<path d="M4 5.4 L5 3.4 H7 L8 5.4 Z" fill="#2a2f52" />
				</svg>
			);
		case 'snail':
			return (
				<svg width="17" height="12" viewBox="0 0 18 12" fill="none">
					<path d="M3 10.5 H12" stroke="#8a93c4" strokeWidth={2.4} strokeLinecap="round" />
					<path d="M3 10.5 Q1.6 8 3.6 6.6" stroke="#8a93c4" strokeWidth={1.6} strokeLinecap="round" />
					<path d="M3.2 7 L2.2 5 M4.6 6.9 L4.6 4.8" stroke="#8a93c4" strokeWidth={1} strokeLinecap="round" />
					<circle cx="12" cy="6.6" r="4.4" fill="#93a0e8" />
					<circle cx="12" cy="6.6" r="2.5" fill="none" stroke="#c3cbf2" strokeWidth={0.9} />
					<circle cx="12.5" cy="6.9" r="1" fill="#c3cbf2" />
				</svg>
			);
		default:
			return null;
	}
}

function StoneMarker({ hobby, index, wear, lit, plot }: { hobby: Hobby; index: number; wear: number; lit: boolean; plot: string }) {
	const alive = hobby.kind === 'alive';
	const radii = ['38px 36px 5px 4px', '12px 15px 4px 5px', '28px 33px 5px 4px', '33px 38px 4px 5px'];
	const hasCrack = wear >= 0.8;

	return (
		<div
			className="graveyard__stone"
			style={{
				borderRadius: alive ? '16px 18px 5px 5px' : radii[index % radii.length],
				background: lit ? 'linear-gradient(165deg,#3a3454 0%,#221d38 90%)' : 'linear-gradient(165deg,#1e2340 0%,#12162a 90%)',
			}}
		>
			{alive
				? <span className="graveyard__stone-alive-dot">●</span>
				: <span className="graveyard__stone-dead-mark">❦</span>}
			<span className="graveyard__stone-plot">{plot}</span>
			<div
				className="graveyard__stone-wear"
				style={{
					background: [
						`linear-gradient(105deg, rgba(8,10,22,${(0.32 * wear).toFixed(2)}) 0%, transparent 42%)`,
						`linear-gradient(0deg, rgba(8,10,22,${(0.22 * wear).toFixed(2)}) 0%, transparent 30%)`,
						wear > 0.5 ? `radial-gradient(circle at ${24 + (index * 13) % 40}% ${30 + (index * 17) % 35}%, rgba(147,160,232,${(0.14 * wear).toFixed(2)}) 0%, transparent 26%)` : null,
					].filter(Boolean).join(','),
				}}
			/>
			{hasCrack && (
				<svg width="13" height="54" viewBox="0 0 10 42" fill="none" stroke="rgba(10,12,26,.55)" strokeWidth={1} strokeLinecap="round" className="graveyard__stone-crack">
					<path d="M5 0 L3 11 L6 21 L2 31 L4 42" />
				</svg>
			)}
		</div>
	);
}

function LampMarker({ plot }: { plot: string }) {
	return (
		<div className="graveyard__lamp" title="still burning">
			<span className="graveyard__lamp-post" />
			<span className="graveyard__lamp-box" />
			<span className="graveyard__lamp-cap" />
			<span className="graveyard__lamp-bulb" />
			<span className="graveyard__lamp-glow" />
			<span className="graveyard__lamp-plate"><span>{plot}</span></span>
		</div>
	);
}

function SticksMarker({ plot }: { plot: string }) {
	return (
		<div className="graveyard__sticks">
			<span className="graveyard__sticks-post" />
			<span className="graveyard__sticks-crossbar" />
			<span className="graveyard__sticks-patch" />
			<span className="graveyard__sticks-string" />
			<span className="graveyard__sticks-plate"><span>{plot}</span></span>
		</div>
	);
}

function DriftwoodMarker({ plot }: { plot: string }) {
	return (
		<div className="graveyard__driftwood">
			<span className="graveyard__driftwood-plank">
				<span className="graveyard__driftwood-grain graveyard__driftwood-grain--a" />
				<span className="graveyard__driftwood-grain graveyard__driftwood-grain--b" />
				<span className="graveyard__driftwood-knot" />
				<span className="graveyard__driftwood-plot">{plot}</span>
			</span>
		</div>
	);
}

function CairnMarker({ plot }: { plot: string }) {
	return (
		<div className="graveyard__cairn">
			<span className="graveyard__cairn-stone graveyard__cairn-stone--base" />
			<span className="graveyard__cairn-stone graveyard__cairn-stone--mid" />
			<span className="graveyard__cairn-stone graveyard__cairn-stone--top" />
			<span className="graveyard__cairn-plot">{plot}</span>
		</div>
	);
}

function BuoyMarker({ plot }: { plot: string }) {
	return (
		<div className="graveyard__buoy">
			<span className="graveyard__buoy-post" />
			<span className="graveyard__buoy-body">
				<span className="graveyard__buoy-band"><span>{plot}</span></span>
			</span>
			<span className="graveyard__buoy-handle" />
		</div>
	);
}

function Sprigs({ count, index }: { count: number; index: number }) {
	if (count === 0) {
		return null;
	}
	const shown = Math.min(count, 3);
	return (
		<>
			{Array.from({ length: shown }, (_, s) => (
				<svg
					key={s}
					width="10"
					height="14"
					viewBox="0 0 11 15"
					fill="none"
					className="graveyard__sprig"
					style={{ left: `${13 + s * 26 + (index * 7) % 8}px`, transform: `rotate(${s % 2 ? 10 : -8}deg)` }}
				>
					<path d="M5.5 14 V6" stroke="#5f6ec4" strokeWidth={1.2} />
					<circle cx="3" cy="3" r="1.9" fill="#93a0e8" />
					<circle cx="8" cy="3" r="1.9" fill="#93a0e8" />
					<circle cx="4" cy="5.8" r="1.9" fill="#93a0e8" />
					<circle cx="7" cy="5.8" r="1.9" fill="#93a0e8" />
					<circle cx="5.5" cy="1.8" r="1.9" fill="#93a0e8" />
					<circle cx="5.5" cy="4" r="1.6" fill="#f0d9a8" />
				</svg>
			))}
		</>
	);
}

function Fireflies() {
	const flies = [
		{ left: '34px', top: '9%',  roam: '12s ease-in-out infinite',                glow: 44, glowOpacity: .24, dot: 3,   pulse: '3.3s ease-in-out infinite' },
		{ left: '80px', top: '31%', roam: '15s ease-in-out -6s infinite reverse',     glow: 36, glowOpacity: .2,  dot: 2.5, pulse: '4.2s ease-in-out .7s infinite' },
		{ left: '22px', top: '52%', roam: '10s ease-in-out -3s infinite',             glow: 38, glowOpacity: .21, dot: 2.5, pulse: '2.9s ease-in-out .3s infinite' },
		{ left: '72px', top: '72%', roam: '13s ease-in-out -9s infinite reverse',     glow: 40, glowOpacity: .22, dot: 3,   pulse: '3.8s ease-in-out 1.1s infinite' },
		{ left: '40px', top: '88%', roam: '11s ease-in-out -5s infinite',             glow: 32, glowOpacity: .18, dot: 2,   pulse: '4.6s ease-in-out .5s infinite' },
	];
	return (
		<>
			{flies.map((fly, index) => (
				<div key={index} className="graveyard__firefly" style={{ left: fly.left, top: fly.top, animation: `fireflyRoam ${fly.roam}` }} aria-hidden="true">
					<span className="graveyard__firefly-glow" style={{ width: fly.glow, height: fly.glow, background: `radial-gradient(circle,rgba(240,196,120,${fly.glowOpacity}),transparent 65%)`, animation: `lampPulse ${fly.pulse}` }} />
					<span className="graveyard__firefly-dot" style={{ width: fly.dot, height: fly.dot, animation: `lampPulse ${fly.pulse}` }} />
				</div>
			))}
		</>
	);
}

function PawRounds() {
	const paws = [
		{ top: '6%',  left: '2px',  rotate: 168, delay: 0 },
		{ top: '22%', left: '13px', rotate: 176, delay: .7 },
		{ top: '38%', left: '3px',  rotate: 163, delay: 1.4 },
		{ top: '54%', left: '14px', rotate: 172, delay: 2.1 },
		{ top: '70%', left: '4px',  rotate: 166, delay: 2.8 },
		{ top: '86%', left: '13px', rotate: 174, delay: 3.5 },
	];
	return (
		<div className="graveyard__paw-rounds" title="the cat, on its rounds" aria-hidden="true">
			{paws.map((paw, index) => (
				<svg
					key={index}
					width="12"
					height="11"
					viewBox="0 0 15 14"
					fill="#93a0e8"
					className="graveyard__paw"
					style={{ top: paw.top, left: paw.left, transform: `rotate(${paw.rotate}deg)`, animationDelay: `${paw.delay}s` }}
				>
					<ellipse cx="7.5" cy="9.5" rx="3.4" ry="2.9" />
					<ellipse cx="2.6" cy="5.4" rx="1.5" ry="1.9" />
					<ellipse cx="6.2" cy="3.4" rx="1.5" ry="1.9" />
					<ellipse cx="9.8" cy="3.6" rx="1.5" ry="1.9" />
					<ellipse cx="12.6" cy="6" rx="1.4" ry="1.8" />
				</svg>
			))}
		</div>
	);
}

interface RecordModalProps {
	hobby:          Hobby;
	plot:           string;
	closing:        boolean;
	flowerCount:    number;
	onLeaveFlower:  () => void;
	onClose:        () => void;
	catHere:        boolean;
	catDesigns?:    FigureheadDesign[];
}

function RecordModal({ hobby, plot, closing, flowerCount, onLeaveFlower, onClose, catHere, catDesigns }: RecordModalProps) {
	const flowerLine = flowerCount === 0 ? 'no flowers yet' : flowerCount === 1 ? '1 left so far' : `${flowerCount} left so far`;
	// "kept {char} · {service}" composed from whichever parts survive, so an
	// empty char never dangles a lone separator; the rest of the record hides
	// its own empty lines rather than printing blank rows (operator ruling
	// 2026-07-11). The service falls back to the old dates, the disposition to
	// the epitaph, same as the register row.
	const kept = [hobby.char, displayService(hobby)].filter(Boolean).join(' · ');
	const phrase = displayPhrase(hobby);

	return (
		<div className={`overlay-backdrop${closing ? ' overlay-backdrop--closing' : ''}`} onClick={onClose}>
			<div className={`record-modal${closing ? ' record-modal--closing' : ''}`} onClick={(event) => event.stopPropagation()}>
				{catHere && <div className="cat-mount cat-mount--record"><HarborCat pose="perched" context="note" designs={catDesigns} /></div>}
				<div className="record-modal__card">
					<div className="record-modal__head">
						<span className="record-modal__kicker">keeper's record · plot {plot}</span>
						<button className="record-modal__close" onClick={onClose}>close ✕</button>
					</div>
					<div className="record-modal__body">
						<div className="record-modal__name-row">
							<span className="record-modal__name">{hobby.name}</span>
							{kept && <span className="record-modal__subtitle">kept {kept}</span>}
						</div>

						{hobby.lastLog && <div className="record-modal__lastlog">{hobby.lastLog}</div>}

						{(hobby.found || hobby.cause || hobby.return) && (
							<div className="record-modal__grid">
								{hobby.found && <><span className="record-modal__grid-label">what was found</span><span>{hobby.found}</span></>}
								{hobby.cause && <><span className="record-modal__grid-label">cause of vanishing</span><span>{hobby.cause}</span></>}
								{hobby.return && <><span className="record-modal__grid-label">re-appointment</span><span>{hobby.return}</span></>}
							</div>
						)}

						<div className="record-modal__flower-row">
							<button className="record-modal__flower-btn" onClick={onLeaveFlower}>
								<svg width="12" height="15" viewBox="0 0 11 15" fill="none">
									<path d="M5.5 14 V6" stroke="#5f7a5a" strokeWidth={1.2} />
									<circle cx="3" cy="3" r="1.9" fill="#8f9be0" />
									<circle cx="8" cy="3" r="1.9" fill="#8f9be0" />
									<circle cx="4" cy="5.8" r="1.9" fill="#8f9be0" />
									<circle cx="7" cy="5.8" r="1.9" fill="#8f9be0" />
									<circle cx="5.5" cy="1.8" r="1.9" fill="#8f9be0" />
									<circle cx="5.5" cy="4" r="1.6" fill="#d9b56a" />
								</svg>
								leave a flower
							</button>
							<span className="record-modal__flower-count">{flowerLine}</span>
						</div>

						<div className="record-modal__foot">
							{phrase && <span className="record-modal__disposition">disposition · {phrase}</span>}
							<span className="record-modal__signature">- the keeper who stayed</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

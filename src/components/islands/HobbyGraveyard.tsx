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

// The design's own base tilt per row index (mod 5), before wear adds its own
// couple of degrees on top for stone markers.
const TILTS = [0, -2.5, 2, -1.5, 2.5];

/** A service string that doesn't read as a dated range ("one summer") is beyond dating: it wears as fully weathered. */
function effectiveWear(hobby: Hobby): number {
	return /^\d/.test(hobby.service) ? hobby.wear : 1;
}

function plotLabel(order: number): string {
	return String(order).padStart(2, '0');
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
	const lastOrder = hobbies.length > 0 ? hobbies[hobbies.length - 1].order : 0;

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
						flowerCount={flowers[hobby.id] ?? 0}
						onOpen={() => setOpenIndex(index)}
						onHover={() => setHoverIndex(index)}
						onUnhover={() => setHoverIndex((current) => (current === index ? null : current))}
					/>
				))}
			</div>

			<div className="graveyard__foot">
				<span className="mono-comment">// plot {plotLabel(lastOrder + 1)} stands open.</span>
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
					plot={plotLabel(open.order)}
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
	flowerCount: number;
	onOpen:      () => void;
	onHover:     () => void;
	onUnhover:   () => void;
}

function Row({ hobby, index, hovered, flowerCount, onOpen, onHover, onUnhover }: RowProps) {
	const alive = hobby.kind === 'alive';
	const haunt = hobby.kind === 'haunt';

	return (
		<div
			className={`graveyard__row${alive ? '' : ' graveyard__row--resting'}`}
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
			<Marker hobby={hobby} index={index} hovered={hovered} flowerCount={flowerCount} />
			<div className="graveyard__record">
				<div className="graveyard__record-head">
					<span className="graveyard__name">{hobby.name}</span>
					<span className="graveyard__service">{hobby.service}</span>
					<span className="graveyard__char-row">
						<span className={`graveyard__lamp-dot${alive ? ' graveyard__lamp-dot--alive' : haunt ? ' graveyard__lamp-dot--haunt' : ''}`} />
						{hobby.char}
					</span>
				</div>
				<span className="graveyard__log">{hobby.log}</span>
			</div>
			<div className="graveyard__side">
				<DispositionPill hobby={hobby} />
				<span className="graveyard__record-link">record →</span>
			</div>
		</div>
	);
}

function DispositionPill({ hobby }: { hobby: Hobby }) {
	const modifier = hobby.kind === 'alive' ? ' graveyard__pill--alive' : hobby.kind === 'haunt' ? ' graveyard__pill--haunt' : '';
	return <span className={`graveyard__pill${modifier}`}>{hobby.disposition}</span>;
}

function Marker({ hobby, index, hovered, flowerCount }: { hobby: Hobby; index: number; hovered: boolean; flowerCount: number }) {
	const alive = hobby.kind === 'alive';
	const w = effectiveWear(hobby);
	const tilt = TILTS[index % TILTS.length];
	const lit = hovered;

	const wrapStyle = {
		transform: `rotate(${(tilt + w * 2).toFixed(2)}deg)`,
		filter: lit ? 'drop-shadow(0 0 9px rgba(240,196,120,.3)) brightness(1.15)' : 'none',
	};

	let body: ReactElement;
	if (alive) {
		body = <LampMarker plot={plotLabel(hobby.order)} />;
	} else if (hobby.marker === 'sticks') {
		body = <SticksMarker plot={plotLabel(hobby.order)} />;
	} else if (hobby.marker === 'driftwood') {
		body = <DriftwoodMarker plot={plotLabel(hobby.order)} />;
	} else if (hobby.marker === 'cairn') {
		body = <CairnMarker plot={plotLabel(hobby.order)} />;
	} else if (hobby.marker === 'buoy') {
		body = <BuoyMarker plot={plotLabel(hobby.order)} />;
	} else {
		body = <StoneMarker hobby={hobby} index={index} wear={w} lit={hovered} />;
	}

	return (
		<div className="graveyard__marker" style={alive ? undefined : wrapStyle}>
			{body}
			<Sprigs count={flowerCount} index={index} />
		</div>
	);
}

function StoneMarker({ hobby, index, wear, lit }: { hobby: Hobby; index: number; wear: number; lit: boolean }) {
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
			<span className="graveyard__stone-plot">{plotLabel(hobby.order)}</span>
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
							<span className="record-modal__subtitle">kept {hobby.char} · {hobby.service}</span>
						</div>

						<div className="record-modal__lastlog">{hobby.lastLog}</div>

						<div className="record-modal__grid">
							<span className="record-modal__grid-label">what was found</span><span>{hobby.found}</span>
							<span className="record-modal__grid-label">cause of vanishing</span><span>{hobby.cause}</span>
							<span className="record-modal__grid-label">re-appointment</span><span>{hobby.return}</span>
						</div>

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
							<span className="record-modal__disposition">disposition · {hobby.disposition}</span>
							<span className="record-modal__signature">- the keeper who stayed</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

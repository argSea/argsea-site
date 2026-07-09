// The stateful part of the Projects page: filter pills + count line, the
// night coast (beacons positioned from the API's wallPos), the light-list
// register below it, and the shared entry overlay. Content arrives as
// build-time props; this island only holds `filter`, `open`, and the
// row-flash state a beacon click triggers.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { FigureheadDesign, Light, Project, WallPos } from '../../lib/api';
import { DEFAULT_LIGHT, codeFor, glowFor, registryNo } from '../../lib/lightChar';
import { pageCatPick } from '../../lib/catSpots';
import { useLamp } from './useLamp';
import LightEntryOverlay from './LightEntryOverlay';
import './LightsBoard.css';

const FILTERS = ['all', 'backend', 'games', 'this website', 'tinkering'] as const;

type Filter = (typeof FILTERS)[number];

// One quip per filter, shown after the count (approved copy, em dashes stripped)
const QUIPS: Record<Filter, string> = {
	'all':          'the whole coast',
	'backend':      'the mains, always burning',
	'games':        'one light, lit once, brilliantly',
	'this website': 'you are standing in it',
	'tinkering':    'the small lights, kept for love',
};

// Not in the design comp: the plan's one asked-for distinctive touch, a dot
// on the active pill that runs the real engine. Each filter borrows the
// characteristic of the light that best represents it rather than an
// arbitrary blink, so the dot reads as a light off this coast.
const FILTER_LIGHT: Record<Filter, Light> = {
	'all':          { kind: 'iso',   color: 'white', period: 3, extinguished: '', letter: '' },
	'backend':      { kind: 'flash', color: 'white', period: 8, extinguished: '', letter: '' },
	'games':        { kind: 'flash', color: 'green', period: 4, extinguished: '', letter: '' },
	'this website': { kind: 'iso',   color: 'white', period: 3, extinguished: '', letter: '' },
	'tinkering':    { kind: 'fixed', color: 'red',   period: 0, extinguished: '', letter: '' },
};

// The panorama's fixed aspect: horizon sits 132px down a 216px band, same
// numbers the wallPos mapping below is built against.
const HORIZON_Y = 132;

// Specular twinkle near the horizon: deterministic positions/timings (no
// Math.random) so server and client render the same dots on hydration. Long,
// staggered delays and durations keep them from ever syncing up.
const TWINKLES = [
	{ left: '6%',  top: '10px', delay: '.2s',  duration: '6.5s' },
	{ left: '14%', top: '26px', delay: '2.1s', duration: '7.8s' },
	{ left: '23%', top: '6px',  delay: '4.4s', duration: '5.6s' },
	{ left: '34%', top: '32px', delay: '1.3s', duration: '8.4s' },
	{ left: '46%', top: '15px', delay: '5.9s', duration: '6.9s' },
	{ left: '58%', top: '38px', delay: '.8s',  duration: '7.2s' },
	{ left: '67%', top: '9px',  delay: '3.6s', duration: '9.1s' },
	{ left: '78%', top: '28px', delay: '6.7s', duration: '6.1s' },
	{ left: '88%', top: '18px', delay: '2.9s', duration: '8.8s' },
	{ left: '95%', top: '40px', delay: '4.9s', duration: '7.5s' },
];

/** A safety net for a project with no wallPos yet: the design's deterministic scatter. */
function fallbackSpot(index: number): { x: number; y: number } {
	return { x: (index * 61.8034) % 100, y: ((index * 37) % 24) / 24 * 100 };
}

/** wallPos (0-100 shore/elevation percentages) to panorama pixels; elevPx also drives the reflection streak below. */
function beaconGeometry(wallPos: WallPos | null, index: number) {
	const { x, y } = wallPos ?? fallbackSpot(index);
	const elevPx = 10 + y * 0.24;
	return { left: `${4 + x * 0.92}%`, top: `${HORIZON_Y - elevPx}px`, elevPx };
}

function reducedMotion(): boolean {
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Whether a project belongs to a filter, 'all' being the pass-everything case. */
function matchesFilter(project: Project, target: Filter): boolean {
	return target === 'all' || project.category === target;
}

// The register's FLIP glide duration: drives the WAAPI call below and times
// the min-height settle's resizing window (its .4s CSS transition in
// LightsBoard.css, matched by eye, not by reference); entering/leaving rows
// are their own separate keyframes and don't use this.
const GLIDE_MS = 400;

interface Props {
	projects:    Project[];
	catEnabled:  boolean;
	catPages?:   Record<string, boolean>;
	catSpots?:   Record<string, boolean>;
	catDesigns?: FigureheadDesign[];
}

export default function LightsBoard({ projects, catEnabled, catPages, catSpots, catDesigns }: Props) {
	const [filter, setFilter] = useState<Filter>('all');
	const [openId, setOpenId] = useState<string | null>(null);
	const [flashId, setFlashId] = useState<string | null>(null);
	const flashTimer = useRef<number | undefined>(undefined);

	// The register locks to its full-list size at mount so filtering swaps
	// rows inside a steady page instead of yanking the footer up and down.
	// It does eventually give height back (see the settle effect below): once
	// a filter's leavers are gone, the lock glides to the survivors' real
	// height rather than holding the full-list size forever.
	const registerRef = useRef<HTMLDivElement | null>(null);
	const [registerMin, setRegisterMin] = useState<number | undefined>(undefined);
	const [registerResizing, setRegisterResizing] = useState(false);
	const resizeTimer = useRef<number | undefined>(undefined);

	useEffect(() => {
		if (registerRef.current) {
			setRegisterMin(registerRef.current.scrollHeight);
		}
	}, []);

	useEffect(() => () => window.clearTimeout(resizeTimer.current), []);

	useEffect(() => () => window.clearTimeout(flashTimer.current), []);

	// The cat rides the opened entry only when the page's one-cat pick is this spot
	const pick = catEnabled ? pageCatPick('projects', catPages, catSpots) : null;
	const catHere = pick?.id === 'projects.overlay';

	const close = () => setOpenId(null);

	const matching = new Set(projects.filter((project) => matchesFilter(project, filter)).map((project) => project.id));
	// The register only lists what matches; the coast keeps every beacon lit
	// and dims the rest, so the panorama never reflows on a filter change.
	const visible = projects.filter((project) => matching.has(project.id));
	const open = openId === null ? null : projects.find((project) => project.id === openId) ?? null;
	const hereId = projects.find((project) => project.category === 'this website')?.id ?? null;
	const burningCount = projects.filter((project) => !(project.light ?? DEFAULT_LIGHT).extinguished).length;

	// FLIP glide on a filter change: survivors keep their row node (measured in
	// pickFilter, animated below), leavers are pulled out of flow to fade in
	// place at their captured top, newcomers mount fresh. rowNodes is the live
	// map pickFilter reads from; flipFrom holds each survivor's pre-change top
	// until the layout effect below applies the invert.
	const rowNodes = useRef(new Map<string, HTMLDivElement>());
	const flipFrom = useRef(new Map<string, number>());
	const flipAnimations = useRef(new Map<string, Animation>());
	const prevVisibleIds = useRef<Set<string>>(new Set(matching));
	const [leaving, setLeaving] = useState<Map<string, { project: Project; top: number; left: number; width: number }>>(new Map());
	const [enteringIds, setEnteringIds] = useState<Set<string>>(new Set());

	// The register-void fix: once a filter's leavers are gone (or immediately,
	// if there were none), glide the locked min-height to the survivors' real
	// height instead of leaving a dead gap on a short filter. Guarded on
	// registerMin already being set so this never fires on the initial mount
	// pass, only after a real filter change; reduced motion just skips the
	// transition (the global kill switch already strips it), so the re-lock
	// there is instant with no extra branching needed.
	useEffect(() => {
		if (leaving.size > 0 || registerMin === undefined) {
			return;
		}
		const node = registerRef.current;
		if (!node) {
			return;
		}
		// scrollHeight is clamped by the locked min-height still applied at
		// this instant, so it never reads shorter than the current lock; drop
		// it for the one synchronous measurement, then let the state update
		// below put the real (old or new) value back.
		const lockedMinHeight = node.style.minHeight;
		node.style.minHeight = '';
		const natural = node.scrollHeight;
		node.style.minHeight = lockedMinHeight;
		if (natural === registerMin) {
			return;
		}
		setRegisterResizing(true);
		setRegisterMin(natural);
		window.clearTimeout(resizeTimer.current);
		resizeTimer.current = window.setTimeout(() => setRegisterResizing(false), GLIDE_MS);
	}, [leaving]);

	// Same cleanup discipline as the lamp animations: cancel in-flight glides
	// on unmount so nothing keeps ticking against a detached node.
	useEffect(() => () => {
		flipAnimations.current.forEach((animation) => animation.cancel());
	}, []);

	// Survivors glide from their pre-change position via WAAPI, which the CSS
	// reduced-motion kill switch never touches on its own; pickFilter simply
	// never populates flipFrom when motion is reduced, so this loop is a no-op.
	useLayoutEffect(() => {
		flipFrom.current.forEach((oldTop, id) => {
			const node = rowNodes.current.get(id);
			if (!node) {
				return;
			}
			const delta = oldTop - node.getBoundingClientRect().top;
			if (!delta) {
				return;
			}
			flipAnimations.current.get(id)?.cancel();
			const animation = node.animate(
				[{ transform: `translateY(${delta}px)` }, { transform: 'none' }],
				{ duration: GLIDE_MS, easing: 'ease', fill: 'backwards' },
			);
			flipAnimations.current.set(id, animation);
		});
		flipFrom.current.clear();
	}, [filter]);

	const settleLeave = (id: string) => {
		setLeaving((previous) => {
			if (!previous.has(id)) {
				return previous;
			}
			const next = new Map(previous);
			next.delete(id);
			return next;
		});
	};

	const pickFilter = (next: Filter) => {
		if (next === filter) {
			return;
		}
		const nextIds = new Set(projects.filter((project) => matchesFilter(project, next)).map((project) => project.id));

		// Reduced motion is an instant swap: no captured rects, no glide, no
		// fade, the register just shows the new set on the next render.
		if (reducedMotion()) {
			setFilter(next);
			setLeaving(new Map());
			setEnteringIds(new Set());
			prevVisibleIds.current = nextIds;
			return;
		}

		// left/width ride along with top: a leaver is pulled to position:absolute,
		// whose containing block is .register's padding box, not the content box
		// in-flow rows sit in, so the fade-out needs its own captured horizontal
		// rect too or it snaps to the padding edge for the length of the fade.
		const containerRect = registerRef.current?.getBoundingClientRect();
		const containerTop = containerRect?.top ?? 0;
		const containerLeft = containerRect?.left ?? 0;
		const departing = new Map<string, { project: Project; top: number; left: number; width: number }>();
		flipFrom.current.clear();

		prevVisibleIds.current.forEach((id) => {
			const node = rowNodes.current.get(id);
			if (!node) {
				return;
			}
			if (nextIds.has(id)) {
				flipFrom.current.set(id, node.getBoundingClientRect().top);
				return;
			}
			const project = projects.find((candidate) => candidate.id === id);
			if (project) {
				const rect = node.getBoundingClientRect();
				departing.set(id, {
					project,
					top: rect.top - containerTop,
					left: rect.left - containerLeft,
					width: rect.width,
				});
			}
		});

		const arriving = new Set<string>();
		nextIds.forEach((id) => {
			if (!prevVisibleIds.current.has(id)) {
				arriving.add(id);
			}
		});

		setFilter(next);
		setLeaving((previous) => {
			const merged = new Map(previous);
			// a row back in the new filter cancels its own leave, even mid-fade
			nextIds.forEach((id) => merged.delete(id));
			departing.forEach((value, id) => merged.set(id, value));
			return merged;
		});
		setEnteringIds(arriving);
		prevVisibleIds.current = nextIds;
	};

	// A beacon click never opens the entry: it points at the light's row.
	const goToRow = (id: string) => {
		const row = document.getElementById(`light-row-${id}`);
		if (!row) {
			return;
		}
		row.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' });
		window.clearTimeout(flashTimer.current);
		setFlashId(id);
		flashTimer.current = window.setTimeout(() => setFlashId(null), 900);
	};

	return (
		<>
			<div className="filter-row fade-up fade-up--3">
				{FILTERS.map((name) => (
					<FilterChip key={name} name={name} active={name === filter} onSelect={pickFilter} />
				))}
				<span className="count-line">{visible.length} of {projects.length} lights · {QUIPS[filter]}</span>
			</div>

			<div className="coast">
				<div className="coast__pano">
					<div className="coast__sea">
						{TWINKLES.map((twinkle, index) => (
							<span
								key={index}
								className="coast__twinkle"
								style={{ left: twinkle.left, top: twinkle.top, animationDelay: twinkle.delay, animationDuration: twinkle.duration }}
							/>
						))}
						<div className="coast__wave coast__wave--a" />
						<div className="coast__wave coast__wave--b" />
						<div className="coast__wave coast__wave--c" />
						<div className="coast__boat">
							<svg className="coast__boat-hull" width="22" height="18" viewBox="0 0 30 24" fill="none">
								<path d="M4 15 L26 15 L21 22 L9 22 Z" fill="rgba(38,44,72,.95)" />
								<path d="M15 15 V3" stroke="rgba(130,140,185,.75)" strokeWidth="1.3" />
								<path d="M15 3 L24 13 L15 13 Z" fill="rgba(48,55,88,.9)" />
							</svg>
						</div>
					</div>
					<div className="coast__horizon" />
					<div className="coast__coastline">
						<div className="coast__headland coast__headland--a" />
						<div className="coast__headland coast__headland--b" />
						<div className="coast__headland coast__headland--c" />
					</div>
					{projects.map((project, index) => (
						<Beacon
							key={project.id}
							project={project}
							index={index}
							matches={matching.has(project.id)}
							isHere={project.id === hereId}
							onActivate={goToRow}
						/>
					))}
					<div className="coast__rail" />
					<span className="coast__caption">the coast tonight · {burningCount} burning</span>
				</div>

				<div className={`register${registerResizing ? ' register--resizing' : ''}`} ref={registerRef} style={{ minHeight: registerMin }}>
					<div className="register__head">
						<span className="register__head-label">The light list</span>
						<span className="register__head-district">District · argsea</span>
					</div>
					<div className="register__cols">
						<span>no.</span><span /><span>light</span><span>characteristic</span><span>first lit</span><span>status</span><span />
					</div>
					{visible.map((project) => (
						<RegisterRow
							key={project.id}
							project={project}
							flashed={flashId === project.id}
							entering={enteringIds.has(project.id)}
							rowRef={(node) => {
								if (node) {
									rowNodes.current.set(project.id, node);
								} else {
									rowNodes.current.delete(project.id);
									// this id's glide (if any) is riding a node that's now
									// detached; nothing will ever cancel it otherwise
									flipAnimations.current.get(project.id)?.cancel();
									flipAnimations.current.delete(project.id);
								}
							}}
							onOpen={setOpenId}
						/>
					))}
					{Array.from(leaving.entries()).map(([id, { project, top, left, width }]) => (
						<RegisterRow
							key={id}
							project={project}
							flashed={false}
							leavingTop={top}
							leavingLeft={left}
							leavingWidth={width}
							onOpen={setOpenId}
							onLeaveEnd={() => settleLeave(id)}
						/>
					))}
				</div>
			</div>

			{open && <LightEntryOverlay project={open} catHere={catHere} catDesigns={catDesigns} onClose={close} />}
		</>
	);
}

interface BeaconProps {
	project:    Project;
	index:      number;
	matches:    boolean;
	isHere:     boolean;
	onActivate: (id: string) => void;
}

function Beacon({ project, index, matches, isHere, onActivate }: BeaconProps) {
	const light = project.light ?? DEFAULT_LIGHT;
	const dark = Boolean(light.extinguished);
	const glow = glowFor(light);
	// A little size jitter per beacon, deterministic on index (design's touch)
	const fs = 0.75 + ((index * 13) % 5) * 0.14;
	const haloSize = Math.round(34 * fs);
	const coreSize = Math.max(3, Math.round(5 * fs));
	const { left, top, elevPx } = beaconGeometry(project.wallPos, index);

	const haloRef = useLamp(light, dark ? 0.1 : 0.55);
	const coreRef = useLamp(light, dark ? 0.2 : 0.85);
	// A dark phase dims the reflection rather than vanishing it: same floor
	// pattern as the you-are-here ring, so the water never goes fully blank.
	const reflectRef = useLamp(light, 0.4, 0.1);
	// The you-are-here ring rides the same phase-locked clock as the lamp for a
	// blinking characteristic, dimming to a quarter opacity in the dark phase
	// rather than vanishing, so it keeps wayfinding through long dark spans. A
	// fixed light keeps its old independent idle breath (CSS, untouched below).
	const blinkingRing = light.kind !== 'fixed';
	const ringRef = useLamp(light, dark ? 0.25 : 1, 0.25);

	const code = codeFor(light);
	const tip = isHere
		? `${project.title} · ${code} · you are standing in this one`
		: `${project.title} · ${code}${dark ? ' · dark' : ''}`;

	const activate = () => onActivate(project.id);

	return (
		<div
			className="beacon"
			style={{ left, top, opacity: matches ? 1 : 0.12, pointerEvents: matches ? 'auto' : 'none' }}
			role="button"
			tabIndex={matches ? 0 : -1}
			aria-hidden={!matches}
			title={tip}
			onClick={activate}
			onKeyDown={(event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					activate();
				}
			}}
		>
			{/* Grounds the beacon instead of leaving it floating like a star:
			    the tower reaches exactly from the lamp down to the horizon
			    (elevPx is that same distance), rooted in a small knoll. */}
			<div className="beacon__base" style={{ height: elevPx }}>
				<div className="beacon__knoll" />
			</div>
			<div
				ref={haloRef}
				className="beacon__halo"
				style={{ width: haloSize, height: haloSize, background: `radial-gradient(circle, rgba(${glow},1) 0%, transparent 64%)` }}
			/>
			<div
				ref={coreRef}
				className="beacon__core"
				style={{
					width: coreSize,
					height: coreSize,
					background: dark ? '#4d5670' : '#fff',
					boxShadow: `0 0 ${Math.round(8 * fs)}px ${Math.round(2 * fs)}px rgba(${glow},1)`,
				}}
			/>
			{!dark && (
				<div
					ref={reflectRef}
					className="beacon__reflect"
					style={{ top: `${23 + elevPx}px`, height: `${Math.round(14 + elevPx * 0.7)}px`, background: `linear-gradient(180deg, rgba(${glow},1) 0%, transparent 100%)` }}
				/>
			)}
			{isHere && (
				blinkingRing
					? <div ref={ringRef} className="beacon__ring beacon__ring--locked" />
					: <div className="beacon__ring" />
			)}
		</div>
	);
}

interface RegisterRowProps {
	project:       Project;
	flashed:       boolean;
	entering?:     boolean;                            // fades in in place, delayed so the glide reads first
	leavingTop?:   number;                              // set only for a row mid fade-out: its captured, register-relative top/left/width
	leavingLeft?:  number;
	leavingWidth?: number;
	rowRef?:       (node: HTMLDivElement | null) => void; // in-flow rows only, so pickFilter can measure them for the glide
	onOpen:        (id: string) => void;
	onLeaveEnd?:   () => void;                          // fires when a leaving row's fade-out finishes, so the parent can drop it
}

function RegisterRow({ project, flashed, entering = false, leavingTop, leavingLeft, leavingWidth, rowRef, onOpen, onLeaveEnd }: RegisterRowProps) {
	const light = project.light ?? DEFAULT_LIGHT;
	const dark = Boolean(light.extinguished);
	const glow = glowFor(light);
	const code = codeFor(light);
	const no = registryNo(project.order);
	const leaving = leavingTop !== undefined;

	const haloRef = useLamp(light, dark ? 0.08 : 0.45);
	const coreRef = useLamp(light, dark ? 0.2 : 0.8);

	const open = () => onOpen(project.id);

	const className = [
		'register__row',
		entering ? 'register__row--entering' : '',
		leaving ? 'register__row--leaving' : '',
		flashed ? 'register__row--flash' : '',
	].filter(Boolean).join(' ');

	return (
		<div
			id={`light-row-${project.id}`}
			ref={rowRef}
			className={className}
			style={leaving ? { top: leavingTop, left: leavingLeft, width: leavingWidth, pointerEvents: 'none' } : undefined}
			role="button"
			tabIndex={leaving ? -1 : 0}
			onClick={open}
			onKeyDown={(event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					open();
				}
			}}
			onAnimationEnd={leaving ? onLeaveEnd : undefined}
		>
			<span className="register__no">{no}</span>
			<div className="register__lamp">
				<div ref={haloRef} className="register__halo" style={{ background: `radial-gradient(circle, rgba(${glow},1) 0%, transparent 64%)` }} />
				<div ref={coreRef} className="register__core" style={{ background: dark ? '#4d5670' : '#fff', boxShadow: `0 0 7px 2px rgba(${glow},1)` }} />
			</div>
			<div className="register__info">
				<div className="register__name-row">
					<span className="register__name" style={dark ? { color: '#9aa1c4' } : undefined}>{project.title}</span>
					<StatusPill dark={dark} year={light.extinguished} className="register__pill--mobile" />
				</div>
				<span className="register__desc" style={dark ? { color: '#767e9f' } : undefined}>{project.shortDesc}</span>
				<span className="register__mobile-char">{code} · first lit {project.firstLit}</span>
			</div>
			<span className="register__code" style={{ color: dark ? '#7a83ad' : `rgb(${glow})` }}>{code}</span>
			<span className="register__first-lit">{project.firstLit}</span>
			<span className="register__status"><StatusPill dark={dark} year={light.extinguished} /></span>
			<span className="register__read">read →</span>
		</div>
	);
}

function StatusPill({ dark, year, className }: { dark: boolean; year: string; className?: string }) {
	const label = dark ? `dark · ${year}` : 'lit';
	return <span className={`status-pill ${dark ? 'status-pill--dark' : 'status-pill--lit'}${className ? ` ${className}` : ''}`}>{label}</span>;
}

function FilterChip({ name, active, onSelect }: { name: Filter; active: boolean; onSelect: (name: Filter) => void }) {
	const light = FILTER_LIGHT[name];
	const glow = glowFor(light);
	// Same 0.25 floor as the you-are-here ring: a blinking active chip dims
	// in its dark phase instead of vanishing off the filter row entirely.
	const dotRef = useLamp(light, 0.9, 0.25);

	return (
		<button className={`chip ${active ? 'chip--active' : 'chip--idle'}`} onClick={() => onSelect(name)}>
			{name}
			{active && <span ref={dotRef} className="chip__dot" style={{ background: `rgb(${glow})`, boxShadow: `0 0 6px 2px rgba(${glow},.7)` }} />}
		</button>
	);
}

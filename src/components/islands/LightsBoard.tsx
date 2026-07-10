// The stateful part of the Projects page: filter pills + count line, the
// night coast (beacons positioned from the API's wallPos), the light-list
// register below it, and the shared entry overlay. Content arrives as
// build-time props; this island only holds `filter`, `open`, and the
// row-flash state a beacon click triggers.
import { useEffect, useRef, useState } from 'react';
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

// The panorama's fixed aspect: horizon sits 132px down a 352px band (a 220px
// sea below it), same numbers the wallPos mapping below is built against.
// Only the sea's own depth grew; HORIZON_Y itself never moves, which is what
// keeps every lamp, headland, and the boat's track pinned in place below.
const HORIZON_Y = 132;

// The This-website light stands on its own islet, front-center and closer to
// the viewer than the horizon-pinned lamps, so it scales up rather than
// riding the per-index jitter the rest use; the other lights are untouched.
const HERE_SCALE = 1.5;

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

	// Shared between a beacon and its register row: hovering (or focusing)
	// either one highlights both, keyed by project id rather than index so
	// it survives the filter reordering neither list actually does anymore.
	const [hoverId, setHoverId] = useState<string | null>(null);

	useEffect(() => () => window.clearTimeout(flashTimer.current), []);

	// The cat rides the opened entry only when the page's one-cat pick is this spot
	const pick = catEnabled ? pageCatPick('projects', catPages, catSpots) : null;
	const catHere = pick?.id === 'projects.overlay';

	const close = () => setOpenId(null);

	const matching = new Set(projects.filter((project) => matchesFilter(project, filter)).map((project) => project.id));
	// The coast keeps every beacon lit and dims the rest; the register keeps
	// every row mounted too and collapses the rest (see .register__row in
	// LightsBoard.css), so neither ever reflows on a filter change.
	const visible = projects.filter((project) => matching.has(project.id));
	const open = openId === null ? null : projects.find((project) => project.id === openId) ?? null;
	const hereId = projects.find((project) => project.category === 'this website')?.id ?? null;
	const burningCount = projects.filter((project) => !(project.light ?? DEFAULT_LIGHT).extinguished).length;

	const pickFilter = (next: Filter) => setFilter(next);

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
						<div className="coast__swell coast__swell--a" />
						<div className="coast__swell coast__swell--b" />
						<div className="coast__swell coast__swell--c" />
						<div className="coast__swell coast__swell--d" />
						<div className="coast__glitter" />
						<div className="coast__boat">
							<svg className="coast__boat-hull" width="40" height="28" viewBox="0 0 66 46" fill="none">
								<path d="M31 3 V32" stroke="#7c88c9" strokeWidth="1.3" />
								<path d="M33 6 L46 29 L33 29 Z" fill="#c9c2ab" />
								<path d="M29 8 L18 29 L29 29 Z" fill="#a89f85" />
								<path d="M31 2 L39 5 L31 8 Z" fill="#f0d9a8" />
								<path d="M12 32 L52 32 L46 40 L18 40 Z" fill="#1e2547" stroke="#7c88c9" strokeWidth="1.1" strokeLinejoin="round" />
								<path d="M15 35 H49" stroke="rgba(240,217,168,.4)" strokeWidth=".8" />
							</svg>
						</div>
					</div>
					{/* A private little squall, way out: charm on the same sailing
					    idiom as the boat, just up in the sky band above the horizon
					    rather than nested in .coast__sea. */}
					<div className="coast__squall">
						<div className="coast__squall-rain" />
						<div className="coast__squall-cloud coast__squall-cloud--mid" title="a passing squall. somebody's on call tonight" />
						<div className="coast__squall-cloud coast__squall-cloud--left" />
						<div className="coast__squall-cloud coast__squall-cloud--right" />
						<div className="coast__squall-shadow" />
					</div>
					<div className="coast__horizon-glow coast__horizon-glow--above" />
					<div className="coast__horizon" />
					<div className="coast__horizon-glow coast__horizon-glow--below" />
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
							hovered={hoverId === project.id}
							onActivate={goToRow}
							onHover={() => setHoverId(project.id)}
							onUnhover={() => setHoverId((current) => (current === project.id ? null : current))}
						/>
					))}
					<div className="coast__rail" />
					<span className="coast__caption">the coast tonight · {burningCount} burning</span>
				</div>

				<div className="register">
					<div className="register__head">
						<span className="register__head-label">The light list</span>
						<span className="register__head-district">District · argsea</span>
					</div>
					<div className="register__cols">
						<span>no.</span><span /><span>light</span><span>characteristic</span><span>first lit</span><span>status</span><span />
					</div>
					{/* Every row stays mounted; a non-matching one just collapses in
					    place (see .register__row--collapsed in LightsBoard.css), so
					    the register never reflows rows in or out on a filter change. */}
					{projects.map((project, index) => (
						<RegisterRow
							key={project.id}
							project={project}
							index={index}
							matches={matching.has(project.id)}
							flashed={flashId === project.id}
							hovered={hoverId === project.id}
							onOpen={setOpenId}
							onHover={() => setHoverId(project.id)}
							onUnhover={() => setHoverId((current) => (current === project.id ? null : current))}
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
	hovered:    boolean;
	onActivate: (id: string) => void;
	onHover:    () => void;
	onUnhover:  () => void;
}

function Beacon({ project, index, matches, isHere, hovered, onActivate, onHover, onUnhover }: BeaconProps) {
	const light = project.light ?? DEFAULT_LIGHT;
	const dark = Boolean(light.extinguished);
	const glow = glowFor(light);
	// A little size jitter per beacon, deterministic on index (design's touch);
	// the here light additionally scales up by HERE_SCALE on top of its own jitter.
	const fs = 0.75 + ((index * 13) % 5) * 0.14;
	const scale = isHere ? HERE_SCALE : 1;
	// Hovering grows the halo box itself (mock's ~1.45x); the core's own box
	// stays put and only its glow blooms, via coreBlur/coreSpread below.
	const haloSize = Math.round(34 * fs * scale * (hovered ? 1.45 : 1));
	const coreSize = Math.max(3, Math.round(5 * fs * scale));
	const coreBlur = Math.round((hovered ? 15 : 8) * fs * scale);
	const coreSpread = Math.round((hovered ? 5 : 2) * fs * scale);
	// This-website stands front-center on its own islet rather than riding
	// the horizon; elevPx still feeds the reflect formula below, just as a
	// deliberately taller stand-in for "closer, so its reflection runs longer."
	const { left, top, elevPx } = isHere
		? { left: '50%', top: `${HORIZON_Y + 46}px`, elevPx: 40 }
		: beaconGeometry(project.wallPos, index);

	// Hovering holds the lamp at full bright instead of blinking through it:
	// forcing 'fixed' routes ignite() through its static-opacity branch (the
	// same one an actually-fixed light already uses), so no new timing is
	// needed and the real characteristic just resumes once the hover ends.
	const effectiveLight = hovered ? { ...light, kind: 'fixed' as const } : light;
	const haloRef = useLamp(effectiveLight, dark ? 0.1 : 0.55);
	const coreRef = useLamp(effectiveLight, dark ? 0.2 : 0.85);
	// A dark phase dims the reflection rather than vanishing it: same floor
	// pattern as the you-are-here ring, so the water never goes fully blank.
	const reflectRef = useLamp(effectiveLight, 0.4, 0.1);
	// The you-are-here ring rides the same phase-locked clock as the lamp for a
	// blinking characteristic, dimming to a quarter opacity in the dark phase
	// rather than vanishing, so it keeps wayfinding through long dark spans. A
	// fixed light keeps its old independent idle breath (CSS, untouched below).
	const blinkingRing = light.kind !== 'fixed';
	const ringRef = useLamp(effectiveLight, dark ? 0.25 : 1, 0.25);

	const code = codeFor(light);
	const tip = isHere
		? `${project.title} · ${code} · you are here. but you are also there. wait`
		: `${project.title} · ${code}${dark ? ' · dark' : ''}`;

	const activate = () => onActivate(project.id);

	return (
		<div
			className={`beacon${isHere ? ' beacon--here' : ''}${hovered ? ' beacon--hover' : ''}`}
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
			onMouseEnter={onHover}
			onMouseLeave={onUnhover}
			onFocus={onHover}
			onBlur={onUnhover}
		>
			{isHere ? (
				// A wide islet instead of a tower, carrying a miniature graveyard
				// and a shipwreck easter egg: the light you're standing in gets to
				// stand on something, not just burn at the horizon like the rest.
				<div className="beacon__islet">
					<div className="beacon__grave">
						<span className="beacon__headstone beacon__headstone--a" />
						<span className="beacon__headstone beacon__headstone--b" />
						<span className="beacon__cross" />
						<span className="beacon__headstone beacon__headstone--c" />
					</div>
					<div className="beacon__wreck">
						<span className="beacon__wreck-hull" />
						<span className="beacon__wreck-mast" />
					</div>
				</div>
			) : (
				// Grounds the beacon instead of leaving it floating like a star:
				// the tower reaches exactly from the lamp down to the horizon
				// (elevPx is that same distance), rooted in a small knoll.
				<div className="beacon__base" style={{ height: elevPx }}>
					<div className="beacon__knoll" />
				</div>
			)}
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
					boxShadow: `0 0 ${coreBlur}px ${coreSpread}px rgba(${glow},1)`,
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
	project:   Project;
	index:     number;    // drives the initial-load stagger delay
	matches:   boolean;   // false collapses the row in place (see .register__row--collapsed)
	flashed:   boolean;
	hovered:   boolean;
	onOpen:    (id: string) => void;
	onHover:   () => void;
	onUnhover: () => void;
}

function RegisterRow({ project, index, matches, flashed, hovered, onOpen, onHover, onUnhover }: RegisterRowProps) {
	const light = project.light ?? DEFAULT_LIGHT;
	const dark = Boolean(light.extinguished);
	const glow = glowFor(light);
	const code = codeFor(light);
	const no = registryNo(project.order);

	const haloRef = useLamp(light, dark ? 0.08 : 0.45);
	const coreRef = useLamp(light, dark ? 0.2 : 0.8);

	const open = () => onOpen(project.id);

	const className = [
		'register__row',
		matches ? '' : 'register__row--collapsed',
		hovered ? 'register__row--hover' : '',
		flashed ? 'register__row--flash' : '',
	].filter(Boolean).join(' ');

	return (
		<div
			id={`light-row-${project.id}`}
			className={className}
			style={{ animationDelay: `${index * 45}ms` }}
			role="button"
			tabIndex={matches ? 0 : -1}
			aria-hidden={!matches}
			onClick={open}
			onKeyDown={(event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					open();
				}
			}}
			onMouseEnter={onHover}
			onMouseLeave={onUnhover}
			onFocus={onHover}
			onBlur={onUnhover}
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

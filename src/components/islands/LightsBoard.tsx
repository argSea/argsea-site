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
	'all':          { kind: 'iso',   color: 'white', period: 3, extinguished: '' },
	'backend':      { kind: 'flash', color: 'white', period: 8, extinguished: '' },
	'games':        { kind: 'flash', color: 'green', period: 4, extinguished: '' },
	'this website': { kind: 'iso',   color: 'white', period: 3, extinguished: '' },
	'tinkering':    { kind: 'fixed', color: 'red',   period: 0, extinguished: '' },
};

// The panorama's fixed aspect: horizon sits 132px down a 216px band, same
// numbers the wallPos mapping below is built against.
const HORIZON_Y = 132;

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
	// Alternates between two identical enter keyframes so consecutive filter
	// clicks restart the row stagger (same trick the wall used for its cards)
	const [flip, setFlip] = useState(false);
	const flashTimer = useRef<number | undefined>(undefined);

	// The register never gives height back: it is locked to its full-list
	// size at mount so filtering swaps rows inside a steady page instead of
	// yanking the footer up and down. The spare room below is just night.
	const registerRef = useRef<HTMLDivElement | null>(null);
	const [registerMin, setRegisterMin] = useState<number | undefined>(undefined);

	useEffect(() => {
		if (registerRef.current) {
			setRegisterMin(registerRef.current.scrollHeight);
		}
	}, []);

	useEffect(() => () => window.clearTimeout(flashTimer.current), []);

	// The cat rides the opened entry only when the page's one-cat pick is this spot
	const pick = catEnabled ? pageCatPick('projects', catPages, catSpots) : null;
	const catHere = pick?.id === 'projects.overlay';

	const close = () => setOpenId(null);

	const matching = new Set(
		projects.filter((project) => filter === 'all' || project.category === filter).map((project) => project.id),
	);
	// The register only lists what matches; the coast keeps every beacon lit
	// and dims the rest, so the panorama never reflows on a filter change.
	const visible = projects.filter((project) => matching.has(project.id));
	const open = openId === null ? null : projects.find((project) => project.id === openId) ?? null;
	const hereId = projects.find((project) => project.category === 'this website')?.id ?? null;
	const burningCount = projects.filter((project) => !(project.light ?? DEFAULT_LIGHT).extinguished).length;

	const pickFilter = (next: Filter) => {
		setFilter(next);
		setFlip((previous) => !previous);
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
					<div className="coast__sea" />
					<div className="coast__horizon" />
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

				<div className="register" ref={registerRef} style={{ minHeight: registerMin }}>
					<div className="register__head">
						<span className="register__head-label">The light list</span>
						<span className="register__head-district">District · argsea</span>
					</div>
					<div className="register__cols">
						<span>no.</span><span /><span>light</span><span>characteristic</span><span>first lit</span><span>status</span><span />
					</div>
					{visible.map((project, index) => (
						<RegisterRow
							key={project.id}
							project={project}
							flashed={flashId === project.id}
							enterClass={flip ? 'register__row--enter-a' : 'register__row--enter-b'}
							enterDelay={index * 45}
							onOpen={setOpenId}
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
	const reflectRef = useLamp(light, 0.4);

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
			{isHere && <div className="beacon__ring" />}
		</div>
	);
}

interface RegisterRowProps {
	project:    Project;
	flashed:    boolean;
	enterClass: string;
	enterDelay: number;
	onOpen:     (id: string) => void;
}

function RegisterRow({ project, flashed, enterClass, enterDelay, onOpen }: RegisterRowProps) {
	const light = project.light ?? DEFAULT_LIGHT;
	const dark = Boolean(light.extinguished);
	const glow = glowFor(light);
	const code = codeFor(light);
	const no = registryNo(project.order);

	const haloRef = useLamp(light, dark ? 0.08 : 0.45);
	const coreRef = useLamp(light, dark ? 0.2 : 0.8);

	const open = () => onOpen(project.id);

	return (
		<div
			id={`light-row-${project.id}`}
			className={`register__row ${enterClass}${flashed ? ' register__row--flash' : ''}`}
			style={{ '--row-delay': `${enterDelay}ms` } as React.CSSProperties}
			role="button"
			tabIndex={0}
			onClick={open}
			onKeyDown={(event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					open();
				}
			}}
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
	const dotRef = useLamp(light, 0.9);

	return (
		<button className={`chip ${active ? 'chip--active' : 'chip--idle'}`} onClick={() => onSelect(name)}>
			{name}
			{active && <span ref={dotRef} className="chip__dot" style={{ background: `rgb(${glow})`, boxShadow: `0 0 6px 2px rgba(${glow},.7)` }} />}
		</button>
	);
}

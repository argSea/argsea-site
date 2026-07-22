// The stateful part of the Projects page: filter pills + count line, the
// night coast (beacon x pinned by the API's wallPos, everything else per
// the mock's own formulas), the light-list register below it, and the
// shared entry overlay. Content arrives as build-time props; this island
// only holds `filter`, `open`, and the beacon/row hover pairing.
import { useState } from 'react';
import type { Doodle, FigureheadDesign, Note, Project, WallPos } from '../../lib/api';
import { DEFAULT_LIGHT, codeFor, glowFor, registryNo } from '../../lib/lightChar';
import { pageCatPick } from '../../lib/catSpots';
import { hasLampAnchor } from '../../lib/carvings';
import { useLamp } from './useLamp';
import LightEntryOverlay from './LightEntryOverlay';
import BoltedSvg from './BoltedSvg';
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

// The panorama's fixed aspect (the mock's own H/horizonY, H=260): horizon
// sits 150px down a 260px band (see .coast__pano in LightsBoard.css). Every
// beacon's y and the water furniture below are placed against this number.
const HORIZON_Y = 150;

// Beacon scale: 0.6 for every far light hugging the horizon, 1.5 for the
// This-website light standing front-center on its own islet. Operator
// amendment: the mock's own golden-ratio x formula is NOT used here; a
// beacon's horizontal position still comes from the API's wallPos (below),
// This-website's overriding to front-center regardless of its own wallPos.
const FAR_SCALE = 0.6;
const HERE_SCALE = 1.5;

/** A safety net for a project with no wallPos yet: the design's deterministic scatter. */
function fallbackX(index: number): number {
	return (index * 61.8034) % 100;
}

/** wallPos's x (0-100 shore percentage) to a panorama left offset; the existing mapping, unchanged. */
function beaconGeometry(wallPos: WallPos | null, index: number): { left: string } {
	const x = wallPos?.x ?? fallbackX(index);
	return { left: `${4 + x * 0.92}%` };
}

/** The mock's far-light y: clamped to the horizon, jittered a couple px per index so the coast doesn't read as a ruled line. */
function farY(index: number): number {
	return Math.round(HORIZON_Y - 13 * FAR_SCALE + ((index * 37) % 5) - 2);
}

/** The mock's near-light y: This-website's fixed stand, well below the horizon toward the viewer. */
function hereY(): number {
	return Math.round(HORIZON_Y + 62 - 13 * HERE_SCALE);
}

/** The mock's halo/core size factor: per-index jitter scaled by how close the light stands (depth 0 far, 1 here). */
function sizeFactor(index: number, depth: 0 | 1): number {
	return (0.8 + ((index * 13) % 5) * 0.08) * (0.6 + depth * 0.75);
}

/** Whether a project belongs to a filter, 'all' being the pass-everything case. */
function matchesFilter(project: Project, target: Filter): boolean {
	return target === 'all' || project.category === target;
}

interface Props {
	projects:    Project[];
	notes:       Note[];
	doodles:     Doodle[]; // the keeper's doodles, so a pulled-out note in the entry overlay can draw its own
	catEnabled:  boolean;
	catPages?:   Record<string, boolean>;
	catSpots?:   Record<string, boolean>;
	catDesigns?: FigureheadDesign[];
	boatSvg?:    string | null; // boat/tower-stub carvings, resolved build-time by projects.astro (this is an island)
	towerSvg?:   string | null;
}

export default function LightsBoard({ projects, notes, doodles, catEnabled, catPages, catSpots, catDesigns, boatSvg = null, towerSvg = null }: Props) {
	const [filter, setFilter] = useState<Filter>('all');
	const [openId, setOpenId] = useState<string | null>(null);

	// Shared between a beacon and its register row: hovering (or focusing)
	// either one highlights both, keyed by project id rather than index so
	// it survives the filter reordering neither list actually does anymore.
	const [hoverId, setHoverId] = useState<string | null>(null);

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
					<div className="coast__swell coast__swell--a" />
					<div className="coast__swell coast__swell--b" />
					<div className="coast__swell coast__swell--c" />
					<div className="coast__swell coast__swell--d" />
					<div className="coast__glitter" />
					<div className="coast__boat">
						{/* The Hello boat art, re-tuned for the coast: same hull/mast/sail
						    path data as the hero's own boat (Hello.dc.html), drifting the
						    panorama's width instead of bobbing in place. */}
						<BoltedSvg svg={boatSvg} spot="boat" className="coast__boat-hull" width={26} height={21} viewBox="0 0 30 24">
							<path d="M4 15 L26 15 L21 22 L9 22 Z" fill="#93a0e8" />
							<path d="M15 15 V3" stroke="#5f6ec4" strokeWidth="1.5" />
							<path d="M15 3 L24 13 L15 13 Z" fill="#f0d9a8" />
						</BoltedSvg>
					</div>
					{/* A private little squall, way out: the same sailBy idiom as
					    the boat, just up in the sky band above the horizon. */}
					<div className="coast__squall">
						<div className="coast__squall-rain" />
						<div className="coast__squall-cloud coast__squall-cloud--mid" title="a passing squall. somebody's on call tonight" />
						<div className="coast__squall-cloud coast__squall-cloud--left" />
						<div className="coast__squall-cloud coast__squall-cloud--right" />
						<div className="coast__squall-shadow" />
					</div>
					{projects.map((project, index) => (
						<Beacon
							key={project.id}
							project={project}
							index={index}
							matches={matching.has(project.id)}
							isHere={project.id === hereId}
							hovered={hoverId === project.id}
							towerSvg={towerSvg}
							onActivate={setOpenId}
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
						<span className="register__head-district">District · home waters</span>
					</div>
					<div className="register__cols">
						<span>no.</span><span /><span>light</span><span>characteristic</span><span>est.</span><span>status</span><span />
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
							hovered={hoverId === project.id}
							onOpen={setOpenId}
							onHover={() => setHoverId(project.id)}
							onUnhover={() => setHoverId((current) => (current === project.id ? null : current))}
						/>
					))}
				</div>
			</div>

			{open && <LightEntryOverlay project={open} notes={notes} doodles={doodles} catHere={catHere} catDesigns={catDesigns} towerSvg={towerSvg} onClose={close} />}
		</>
	);
}

interface BeaconProps {
	project:    Project;
	index:      number;
	matches:    boolean;
	isHere:     boolean;
	hovered:    boolean;
	towerSvg:   string | null;
	onActivate: (id: string) => void;
	onHover:    () => void;
	onUnhover:  () => void;
}

function Beacon({ project, index, matches, isHere, hovered, towerSvg, onActivate, onHover, onUnhover }: BeaconProps) {
	const light = project.light ?? DEFAULT_LIGHT;
	const dark = Boolean(light.extinguished);
	const glow = glowFor(light);

	// A bolted tower-stub carving without the lamp anchor holds every beacon's
	// glow layer steady instead of igniting it: graceful degradation, never a
	// crash over a shape the carving doesn't define. Nothing bolted (the
	// ordinary case) never touches this.
	const towerHeld = towerSvg != null && !hasLampAnchor(towerSvg);

	// A fixed, burning light breathes its halo instead of sitting fully
	// static (ruling 5); the core stays steady either way.
	const fixedBreath = light.kind === 'fixed' && !dark;

	const depth: 0 | 1 = isHere ? 1 : 0;
	const scale = isHere ? HERE_SCALE : FAR_SCALE;
	// The mock's own per-index halo/core jitter; wrapper/stub/islet/reflect
	// sizes below are bucket-constant (only scale/depth, not index), so those
	// stay plain CSS keyed on .beacon--here rather than computed here.
	const fs = sizeFactor(index, depth);
	const wrapSize = Math.round(46 * scale);
	// Hovering grows the halo box itself (mock's 1.45x); the core's own box
	// stays put and only its glow blooms, via coreBlur/coreSpread below.
	const haloSize = Math.round(34 * fs * (hovered ? 1.45 : 1));
	const coreSize = Math.max(3, Math.round(5 * fs));
	const coreBlur = Math.round((hovered ? 15 : 8) * fs);
	const coreSpread = Math.round((hovered ? 5 : 2) * fs);

	// Operator amendment: This-website ignores its own wallPos and stands
	// front-center as the focal point; every other light still takes its x
	// from the API's wallPos, clamped to the horizon on y (no elevation).
	const left = isHere ? '50%' : beaconGeometry(project.wallPos, index).left;
	const top = `${isHere ? hereY() : farY(index)}px`;

	// Hovering holds the lamp at full bright instead of blinking through it:
	// forcing 'fixed' routes ignite() through its static-opacity branch (the
	// same one an actually-fixed light already uses), so no new timing is
	// needed and the real characteristic just resumes once the hover ends.
	const effectiveLight = hovered ? { ...light, kind: 'fixed' as const } : light;
	const haloRef = useLamp(effectiveLight, dark ? 0.1 : 0.55, 0, towerHeld);
	const coreRef = useLamp(effectiveLight, dark ? 0.2 : 0.85, 0, towerHeld);
	// A dark phase dims the reflection rather than vanishing it: same floor
	// pattern as the you-are-here ring, so the water never goes fully blank.
	const reflectRef = useLamp(effectiveLight, 0.4, 0.1, towerHeld);
	// The you-are-here ring rides the same phase-locked clock as the lamp for a
	// blinking characteristic, dimming to a quarter opacity in the dark phase
	// rather than vanishing, so it keeps wayfinding through long dark spans. A
	// fixed light keeps its old independent idle breath (CSS, untouched below).
	const blinkingRing = light.kind !== 'fixed';
	const ringRef = useLamp(effectiveLight, dark ? 0.25 : 1, 0.25, towerHeld);

	const code = codeFor(light);
	const tip = isHere
		? `${project.title} · ${code} · you are here. but you are also there. wait`
		: `${project.title} · ${code}${dark ? ' · dark' : ''}`;

	const activate = () => onActivate(project.id);

	return (
		<div
			className={`beacon${isHere ? ' beacon--here' : ''}${hovered ? ' beacon--hover' : ''}`}
			style={{ left, top, width: wrapSize, height: wrapSize, opacity: matches ? 1 : 0.12, pointerEvents: matches ? 'auto' : 'none' }}
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
			{isHere && (
				// A wide islet instead of open water: the light you're standing
				// in gets to stand on something, carrying a miniature graveyard
				// and a shipwreck easter egg tucked at its far edge.
				<div className="beacon__islet" />
			)}
			{isHere && (
				<div className="beacon__grave">
					<span className="beacon__headstone beacon__headstone--a" />
					<span className="beacon__headstone beacon__headstone--b" />
					<span className="beacon__cross" />
					<span className="beacon__headstone beacon__headstone--c" />
					<span className="beacon__headstone beacon__headstone--d" />
					<span className="beacon__wreck-hull" />
					<span className="beacon__wreck-piece" />
					<span className="beacon__wreck-mast" />
				</div>
			)}
			{/* Every light, here or far, is this same lighthouse-stub SVG,
			    scaled per .beacon--here below: open water, no headlands. */}
			<BoltedSvg svg={towerSvg} spot="tower-stub" className="beacon__stub" width={12} height={16} viewBox="0 0 26 34">
				<path d="M13 3 L17 10 L9 10 Z" fill="rgba(150,160,220,.4)" />
				<rect x="10" y="10" width="6" height="15" fill="none" stroke="rgba(150,160,220,.45)" strokeWidth="1.3" />
				<path d="M10 14 h6 M10 19 h6" stroke="rgba(150,160,220,.34)" strokeWidth="1.1" />
				<path d="M5 30 q8 -4 16 0" stroke="rgba(150,160,220,.36)" strokeWidth="1.3" fill="none" />
			</BoltedSvg>
			<div
				ref={haloRef}
				className={`beacon__halo${fixedBreath ? ' beacon__halo--breathe' : ''}`}
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
					style={{ background: `linear-gradient(180deg, rgba(${glow},1) 0%, transparent 100%)` }}
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
	hovered:   boolean;
	onOpen:    (id: string) => void;
	onHover:   () => void;
	onUnhover: () => void;
}

function RegisterRow({ project, index, matches, hovered, onOpen, onHover, onUnhover }: RegisterRowProps) {
	const light = project.light ?? DEFAULT_LIGHT;
	const dark = Boolean(light.extinguished);
	const glow = glowFor(light);
	const code = codeFor(light);
	const no = registryNo(project.order);
	const fixedBreath = light.kind === 'fixed' && !dark;

	const haloRef = useLamp(light, dark ? 0.08 : 0.45);
	const coreRef = useLamp(light, dark ? 0.2 : 0.8);

	const open = () => onOpen(project.id);

	const className = [
		'register__row',
		matches ? '' : 'register__row--collapsed',
		hovered ? 'register__row--hover' : '',
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
				<div ref={haloRef} className={`register__halo${fixedBreath ? ' register__halo--breathe' : ''}`} style={{ background: `radial-gradient(circle, rgba(${glow},1) 0%, transparent 64%)` }} />
				<div ref={coreRef} className="register__core" style={{ background: dark ? '#4d5670' : '#fff', boxShadow: `0 0 7px 2px rgba(${glow},1)` }} />
			</div>
			<div className="register__info">
				<div className="register__name-row">
					<span className="register__name" style={dark ? { color: '#9aa1c4' } : undefined}>{project.title}</span>
					<StatusPill dark={dark} year={light.extinguished} className="register__pill--mobile" />
				</div>
				<span className="register__desc" style={dark ? { color: '#767e9f' } : undefined}>{project.shortDesc}</span>
				<span className="register__mobile-char">{code} · est. {project.firstLit}</span>
			</div>
			<span className="register__code" style={{ color: dark ? '#7a83ad' : `rgb(${glow})` }}>{code}</span>
			<span className="register__first-lit">{project.firstLit}</span>
			<span className="register__status"><StatusPill dark={dark} year={light.extinguished} /></span>
			<span className={`register__read${project.hasLog ? ' register__read--full' : ''}`}>{project.hasLog ? 'full log →' : 'read →'}</span>
		</div>
	);
}

function StatusPill({ dark, year, className }: { dark: boolean; year: string; className?: string }) {
	const label = dark ? `dark · ${year}` : 'lit';
	return <span className={`status-pill ${dark ? 'status-pill--dark' : 'status-pill--lit'}${className ? ` ${className}` : ''}`}>{label}</span>;
}

function FilterChip({ name, active, onSelect }: { name: Filter; active: boolean; onSelect: (name: Filter) => void }) {
	return (
		<button className={`chip ${active ? 'chip--active' : 'chip--idle'}`} onClick={() => onSelect(name)}>
			{name}
			{active && <span className="chip__dot" />}
		</button>
	);
}

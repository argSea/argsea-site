// "Selected work" on the homepage: the light-list register (split-watch
// round, ratified 2026-07-17). Ruled ledger rows, never cards: the flagship
// gets the full row (fact rows, snapshot, journal-entry chips), up to two
// more get plainer rows. Flagship is the `flagship` flag; the two rows below
// it are the `featured` flag in list order, never title matching (a project
// can be `featured` without being the `flagship`). Falls back to the next two
// projects by order when nothing else is featured, so the section never
// shows just the flagship alone. Clicking any row opens the same Light List
// entry the coast uses.
//
// Every row carries `id="light-<no>"` so the coast's wayfinding beacons
// (WaveDivider.astro) can anchor-scroll straight to it, and a `data-lamp`/
// `data-num` pair so its one-time arrival flare has something to flare.
//
// The lamp rhythm rule (split-watch round): a lit lamp runs its real
// characteristic at the notation's own period, floored at 45% so a lit
// station never reads dead (Fl blooms up from the floor, Oc dips down to it,
// F W never blinks). That's the same characteristic engine every other lamp
// on the site runs (src/lib/lightChar.ts via useLamp), just parameterized
// with a floor instead of the coast/projects register's floor of 0.
import { useEffect, useRef, useState } from 'react';
import type { Doodle, FigureheadDesign, Light, Note, Project } from '../../lib/api';
import { DEFAULT_LIGHT, codeFor, registryNo } from '../../lib/lightChar';
import { pageCatPick } from '../../lib/catSpots';
import { mediaUrl } from '../../lib/media';
import { useLamp } from './useLamp';
import LightEntryOverlay from './LightEntryOverlay';
import './HomeLights.css';

// The register's lamp and notation text glow the design's own warm cream
// regardless of the project's actual light color (verbatim to Hello.dc.html:
// the wave beacons and the /projects register do look the color up per
// project, this vocabulary deliberately doesn't).
const CARD_GLOW = '246,236,207';

// Lamp rhythm rule: a lit lamp blooms/dips between 1 and a 0.45 floor; a dark
// (extinguished) one holds a dim, unblinking peak with no floor to bloom from.
const LIT_PEAK = 1;
const LIT_FLOOR = 0.45;
const DARK_PEAK = 0.2;

interface Props {
	flagship:    Project | null;
	featured:    Project[]; // up to 2, already resolved by the caller (featured flag order, falling back to order)
	notes:       Note[];
	doodles:     Doodle[]; // the keeper's doodles, so a pulled-out note in the entry overlay can draw its own
	correctedTo: string; // the register head's "corrected to <date>" line: the newest journal entry's date
	catEnabled:  boolean;
	catPages?:   Record<string, boolean>;
	catSpots?:   Record<string, boolean>;
	catDesigns?: FigureheadDesign[];
	towerSvg?:   string | null; // tower-stub carving, resolved build-time by index.astro; forwarded to the shared entry overlay
}

export default function HomeLights({ flagship, featured, notes, doodles, correctedTo, catEnabled, catPages, catSpots, catDesigns, towerSvg = null }: Props) {
	const [openId, setOpenId] = useState<string | null>(null);

	// The cat rides the opened entry only when the page's one-cat pick is this spot
	const pick = catEnabled ? pageCatPick('hello', catPages, catSpots) : null;
	const catHere = pick?.id === 'hello.postcard';

	const close = () => setOpenId(null);
	const all = [flagship, ...featured].filter((project): project is Project => project !== null);
	const open = openId === null ? null : all.find((project) => project.id === openId) ?? null;

	const notesFor = (project: Project) => notes.filter((note) => (project.noteIds ?? []).includes(note.id));

	return (
		<>
			<div className="home-register">
				<div className="home-register__head">
					<span className="home-register__head-label">light list · home waters · corrected to {correctedTo}</span>
				</div>
				{flagship && (
					<FlagshipRow project={flagship} notes={notesFor(flagship)} onOpen={() => setOpenId(flagship.id)} />
				)}
				{featured.map((project) => (
					<FeaturedRow
						key={project.id}
						project={project}
						notes={notesFor(project)}
						onOpen={() => setOpenId(project.id)}
					/>
				))}
			</div>

			{open && <LightEntryOverlay project={open} notes={notes} doodles={doodles} catHere={catHere} catDesigns={catDesigns} towerSvg={towerSvg} coastLink onClose={close} />}
		</>
	);
}

/** The register's lamp: halo + core, both floored at 45% while lit so the station never reads dead; F W (fixed) never blinks. */
function useRegisterLamp(light: Light, dark: boolean) {
	const haloRef = useLamp(light, dark ? DARK_PEAK * 0.6 : LIT_PEAK, dark ? 0 : LIT_FLOOR);
	const coreRef = useLamp(light, dark ? DARK_PEAK : LIT_PEAK, dark ? 0 : LIT_FLOOR);
	return { haloRef, coreRef };
}

/**
 * The snapshot frame's state. A light with no image name at all collapses the
 * whole snapshot (the register's per-entry rule); a light with a name renders
 * the frame either way, showing empty paper rather than a broken glyph when the
 * print isn't pinned yet or its fetch fails (a print struck from the darkroom
 * after the light cited it). Mirrors the entry overlay's own failed-print guard.
 */
function useSnapshot(photo: string | null | undefined) {
	const [failed, setFailed] = useState(false);
	const imgRef = useRef<HTMLImageElement>(null);
	useEffect(() => {
		const img = imgRef.current;
		if (img && img.complete && img.naturalWidth === 0) {
			setFailed(true);
		}
	}, []);
	return { imgRef, hasName: Boolean(photo), failed, markFailed: () => setFailed(true) };
}

function FlagshipRow({ project, notes, onOpen }: { project: Project; notes: Note[]; onOpen: () => void }) {
	const light: Light = project.light ?? DEFAULT_LIGHT;
	const dark = Boolean(light.extinguished);
	const fixedBreath = light.kind === 'fixed' && !dark;
	const { haloRef, coreRef } = useRegisterLamp(light, dark);
	const no = registryNo(project.order);

	// Render capped at 4 (2x2), even though the data model holds up to 6;
	// facts arrives null from the live API for a pre-contract document.
	const facts = (project.facts ?? []).slice(0, 4);
	const photo = project.images && project.images.length > 0 ? project.images[0] : project.image;
	const { imgRef, hasName, failed, markFailed } = useSnapshot(photo);

	const openRow = (event: React.MouseEvent | React.KeyboardEvent) => {
		if ('key' in event && event.key !== 'Enter' && event.key !== ' ') {
			return;
		}
		if ('key' in event) {
			event.preventDefault();
		}
		onOpen();
	};

	return (
		<div
			id={`light-${no}`}
			data-ll-row
			className="home-register__row home-register__row--flagship"
			role="button"
			tabIndex={0}
			onClick={onOpen}
			onKeyDown={openRow}
		>
			<span className="home-register__beam" aria-hidden="true" />
			<div className="home-register__lampcol">
				<span data-lamp className="home-register__lamp">
					<span ref={haloRef} className={`home-register__halo${fixedBreath ? ' home-register__halo--breathe' : ''}`} style={{ background: `radial-gradient(circle, rgba(${CARD_GLOW},1) 0%, transparent 64%)` }} />
					<span ref={coreRef} className="home-register__core" style={{ background: dark ? '#4d5670' : '#fff', boxShadow: `0 0 10px 3px rgba(${CARD_GLOW},.9)` }} />
				</span>
				<span className="home-register__notation">{codeFor(light)}</span>
				<span data-num className="home-register__no home-register__no--flagship">{no}</span>
			</div>
			<div className="home-register__info">
				<div className="home-register__title-row">
					<span className="home-register__title home-register__title--flagship">{project.title}</span>
					<span className="home-register__seal" title="entered into the list">
						lit
						<span className="home-register__seal-est">est. {project.firstLit}</span>
					</span>
				</div>
				<div className="home-register__desc">{project.shortDesc}</div>

				{facts.length > 0 && (
					<div className="home-register__facts">
						{facts.map((fact) => (
							<div key={fact.heading} className="home-register__facts-row">
								<span className="home-register__facts-label">{fact.heading}</span>
								<span className="home-register__facts-value">{fact.fact}</span>
							</div>
						))}
					</div>
				)}

				<div className="home-register__chips">
					{(project.tags ?? []).map((tag) => <span key={tag} className="home-register__chip">{tag}</span>)}
				</div>

				{notes.length > 0 && (
					<div className="home-register__notes">
						<span className="home-register__notes-label">notes found here</span>
						<div className="home-register__notes-chips">
							{notes.map((note) => <span key={note.id} className="home-register__notes-chip">✎ {note.title}</span>)}
						</div>
					</div>
				)}

				<div className="home-register__foot">
					<span className="home-register__moral">{project.moral}</span>
					{project.hasLog && (
						<a
							href={`/projects/${project.slug}`}
							className="home-register__caselink"
							onClick={(event) => event.stopPropagation()}
						>
							read the full log →
						</a>
					)}
				</div>
			</div>

			{hasName && (
				<div className="home-register__snapshot" onClick={(event) => event.stopPropagation()}>
					<div className={`polaroid-frame home-register__polaroid${failed ? ' polaroid-frame--empty' : ''}`}>
						{failed
							? <div className="polaroid-frame__paper" aria-hidden="true" />
							: <img ref={imgRef} src={mediaUrl(photo!)} alt={project.title} onError={markFailed} />}
					</div>
					<span className="home-register__snapshot-caption">from the station archive · no. {no}</span>
				</div>
			)}
		</div>
	);
}

function FeaturedRow({ project, notes, onOpen }: { project: Project; notes: Note[]; onOpen: () => void }) {
	const light: Light = project.light ?? DEFAULT_LIGHT;
	const dark = Boolean(light.extinguished);
	const fixedBreath = light.kind === 'fixed' && !dark;
	const { haloRef, coreRef } = useRegisterLamp(light, dark);
	const no = registryNo(project.order);

	const notesLine = notes.length === 0 ? null : notes.length === 1 ? '1 journal entry' : `${notes.length} journal entries`;
	const photo = project.images && project.images.length > 0 ? project.images[0] : project.image;
	const { imgRef, hasName, failed, markFailed } = useSnapshot(photo);

	const openRow = (event: React.KeyboardEvent) => {
		if (event.key !== 'Enter' && event.key !== ' ') {
			return;
		}
		event.preventDefault();
		onOpen();
	};

	return (
		<div
			id={`light-${no}`}
			data-ll-row
			className="home-register__row"
			role="button"
			tabIndex={0}
			onClick={onOpen}
			onKeyDown={openRow}
		>
			<span className="home-register__beam" aria-hidden="true" />
			<div className="home-register__lampcol">
				<span data-lamp className="home-register__lamp home-register__lamp--sm">
					<span ref={haloRef} className={`home-register__halo home-register__halo--sm${fixedBreath ? ' home-register__halo--breathe' : ''}`} style={{ background: `radial-gradient(circle, rgba(${CARD_GLOW},1) 0%, transparent 64%)` }} />
					<span ref={coreRef} className="home-register__core home-register__core--sm" style={{ background: dark ? '#4d5670' : '#fff', boxShadow: `0 0 8px 2.5px rgba(${CARD_GLOW},.9)` }} />
				</span>
				<span className="home-register__notation home-register__notation--sm">{codeFor(light)}</span>
				<span data-num className="home-register__no">{no}</span>
			</div>
			<div className="home-register__info">
				<div className="home-register__title-row">
					<span className="home-register__title">{project.title}</span>
					<span className="home-register__est">est. {project.firstLit}</span>
				</div>
				<div className="home-register__desc home-register__desc--sm">{project.shortDesc}</div>
				<div className="home-register__foot-row">
					<span className="home-register__chips home-register__chips--sm">
						{(project.tags ?? []).map((tag) => <span key={tag} className="home-register__chip home-register__chip--sm">{tag}</span>)}
					</span>
					<span className="home-register__rule" aria-hidden="true" />
					<span className="home-register__read">read →</span>
					{notesLine && <span className="home-register__notes-line">✎ {notesLine}</span>}
				</div>
			</div>
			{project.moral && (
				<div className="home-register__aside">
					<span className="home-register__moral home-register__moral--aside">{project.moral}</span>
				</div>
			)}
			{hasName && (
				<div className={`home-register__thumb${failed ? ' home-register__thumb--empty' : ''}`} onClick={(event) => event.stopPropagation()}>
					{failed
						? <div className="home-register__thumb-paper" aria-hidden="true" />
						: <img ref={imgRef} src={mediaUrl(photo!)} alt="" onError={markFailed} />}
				</div>
			)}
		</div>
	);
}

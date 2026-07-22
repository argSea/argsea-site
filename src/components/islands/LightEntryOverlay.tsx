// The Light List entry: the overlay shared by the coast (LightsBoard) and
// the home preview (HomeLights). A self-contained modal: it owns Escape,
// the backdrop click, the scroll lock, and the open-focus move itself, so
// neither caller has to wire that up twice. The harbor cat perches on the
// card's top edge only when the page's one-cat pick landed on this overlay
// spot (the caller decides and passes catHere).
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Doodle, FigureheadDesign, Note, Project } from '../../lib/api';
import { DEFAULT_LIGHT, codeFor, decodeFor, glowFor, registryNo } from '../../lib/lightChar';
import { mediaUrl } from '../../lib/media';
import { hasLampAnchor } from '../../lib/carvings';
import { sightFlip, sightRead } from '../../lib/sightings';
import { useLamp } from './useLamp';
import { useEscapeKey } from './useEscapeKey';
import HarborCat from './HarborCat';
import BoltedSvg from './BoltedSvg';
import DoodleSvg from './DoodleSvg';
import './LightEntryOverlay.css';

// The close animation's own duration: the entryDown/backdropOut CSS
// (LightEntryOverlay.css) is timed to the same 220ms so the real unmount
// lands exactly when the animation finishes, not before or after it.
const CLOSE_MS = 220;

// The note-tuck teardown: noteTuckIn (LightEntryOverlay.css) runs .24s, so the
// log swaps back in at 230ms, right as the paper finishes sliding away.
const TUCK_MS = 230;

// The decorative thumb strip's per-index rotation (ProjectOverlay.dc.html's
// own `rots`), cycling for a gallery beyond five thumbs.
const THUMB_ROTATIONS = ['-2deg', '1.5deg', '-1deg', '2deg', '-1.6deg'];

function reducedMotion(): boolean {
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

interface Props {
	project:     Project;
	signoff:     string;
	notes?:      Note[]; // the full journal, so noteIds can resolve to real titles; [] if the caller has none loaded
	doodles?:    Doodle[]; // the keeper's doodles, so a pulled-out note can draw its own by doodleId; [] if the caller has none loaded
	catHere?:    boolean;
	catDesigns?: FigureheadDesign[];
	coastLink?:  boolean; // "the whole coast →": the home mount only (Hello.dc.html)
	towerSvg?:   string | null; // tower-stub carving, resolved build-time by the caller (this is an island)
	onClose:     () => void;
}

export default function LightEntryOverlay({ project, signoff, notes = [], doodles = [], catHere = false, catDesigns, coastLink = false, towerSvg = null, onClose }: Props) {
	const light = project.light ?? DEFAULT_LIGHT;
	const dark = Boolean(light.extinguished);
	const glow = glowFor(light);

	// A bolted tower-stub carving without the lamp anchor holds the halo/core
	// steady instead of igniting them: graceful degradation, never a crash
	// over a shape that isn't there. Nothing bolted (the ordinary case) never
	// touches this, so the lamp's behavior stays exactly what it was before.
	const towerHeld = towerSvg != null && !hasLampAnchor(towerSvg);
	const haloRef = useLamp(light, dark ? 0.05 : 0.5, 0, towerHeld);
	const coreRef = useLamp(light, dark ? 0.18 : 0.9, 0, towerHeld);

	const closeRef = useRef<HTMLButtonElement>(null);

	// The overlay animates itself shut before telling the parent to unmount
	// it: closing guards against a second trigger mid-animation, and reduced
	// motion (no entryDown/backdropOut to wait on) just closes immediately.
	const [closing, setClosing] = useState(false);
	const closeTimer = useRef<number | undefined>(undefined);

	const requestClose = () => {
		if (closing) {
			return;
		}
		if (reducedMotion()) {
			onClose();
			return;
		}
		setClosing(true);
		closeTimer.current = window.setTimeout(onClose, CLOSE_MS);
	};

	useEscapeKey(true, requestClose);

	useEffect(() => () => window.clearTimeout(closeTimer.current), []);

	// Report the light opening, wherever this overlay was mounted from (the
	// coast, the home mantel, a note's step-into-the-tower). The beacon dedupes
	// per project, so a reopen within the same page view never double-counts.
	useEffect(() => {
		sightFlip(project.id);
	}, [project.id]);

	// Pull-the-note-out: a note tied to this light can be lifted out of the log
	// in place. The one wrapper frame swaps the dark log for the cream paper;
	// `closing` runs the tuck animation, `cameFrom` plays the log's brighten
	// flourish on the way back. Escape tucks the paper before it closes the
	// whole overlay (the capture listener below), a second Escape then closes.
	const [pull, setPull] = useState<{ id: string | null; closing: boolean; cameFrom: boolean }>({ id: null, closing: false, cameFrom: false });
	const tuckTimer = useRef<number | undefined>(undefined);

	const pullOut = (id: string) => {
		sightRead(id);
		setPull({ id, closing: false, cameFrom: false });
	};

	const tuckBack = () => {
		if (pull.closing) {
			return;
		}
		if (reducedMotion()) {
			setPull({ id: null, closing: false, cameFrom: true });
			return;
		}
		setPull((current) => ({ ...current, closing: true }));
		tuckTimer.current = window.setTimeout(() => setPull({ id: null, closing: false, cameFrom: true }), TUCK_MS);
	};

	// Capture phase, so a pulled-out note tucks back before the overlay's own
	// (bubble-phase) Escape closes the whole thing: only active while a note is
	// out, so once the log is back the next Escape falls through and closes.
	useEscapeKey(pull.id !== null, tuckBack, true);

	useEffect(() => () => window.clearTimeout(tuckTimer.current), []);

	const pulledNote = pull.id !== null ? notes.find((note) => note.id === pull.id) ?? null : null;
	const pulledDoodle = pulledNote?.doodleId ? doodles.find((doodle) => doodle.id === pulledNote.doodleId) ?? null : null;

	useEffect(() => {
		closeRef.current?.focus();
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => { document.body.style.overflow = previousOverflow; };
	}, []);

	// Up to 6 prints total: the main polaroid plus up to 5 decorative thumbs;
	// a project with fewer photos than that just shows fewer, never a
	// placeholder. The main print always leads (no click-to-swap: the thumb
	// strip is decorative, per the mock's rotated-prints treatment).
	const gallery = (project.images && project.images.length
		? project.images
		: project.image ? [project.image] : []
	).slice(0, 6);
	const thumbs = gallery.slice(1);

	// A print not yet pinned: no image name at all, or a name whose fetch
	// failed (the print can be struck from the darkroom after the project
	// referenced it). Tracked by name so the main print and any thumb fail
	// independently; the frame stays mounted either way, blank paper and
	// caption, never a broken glyph.
	const [failedPrints, setFailedPrints] = useState<Set<string>>(new Set());
	const markFailed = (name: string) => setFailedPrints((prev) => (prev.has(name) ? prev : new Set(prev).add(name)));
	const mainPrint = gallery[0];
	const mainOk = Boolean(mainPrint) && !failedPrints.has(mainPrint);

	// Ties resolve by stable note id (ruling 6: sessions/repo/2026-07-11-bank-
	// portfolio-evolution-mocks.md), never title matching. noteIds arrives
	// null from the live API for a pre-contract document.
	const noteIds = project.noteIds ?? [];
	const tiedNotes = notes.filter((note) => noteIds.includes(note.id));
	const showNudge = tiedNotes.length === 0 && !project.hasLog;
	const facts = project.facts ?? [];

	// Portaled to document.body so the backdrop sits in the root stacking
	// context, same as HarborCatDirector's cat-mount, instead of being
	// trapped under the cat inside .page's own context.
	return createPortal(
		<div className={`overlay-backdrop${closing ? ' overlay-backdrop--closing' : ''}`} onClick={requestClose}>
			<div className={`light-entry-wrap${closing ? ' light-entry-wrap--closing' : ''}`} onClick={(event) => event.stopPropagation()}>
				{catHere && <div className="cat-mount cat-mount--light-entry"><HarborCat pose="perched" context="postcard" designs={catDesigns} /></div>}
				{pull.id !== null && pulledNote ? (
				<div key="paper" className={`light-entry__note${pull.closing ? ' light-entry__note--tucking' : ''}`}>
					<div className="light-entry__note-paper">
						<div className="light-entry__note-head">
							<button type="button" className="light-entry__tuck-back" onClick={tuckBack}>← tuck it back into no. {registryNo(project.order)}</button>
							<button className="pill-close" onClick={requestClose}>close ✕</button>
						</div>
						<div className="light-entry__note-body">
							<div className="light-entry__note-metarow">
								<span className="light-entry__note-date">Journal entry · {pulledNote.date}</span>
								{pulledNote.conditions && <span className="light-entry__note-wx">{pulledNote.conditions}</span>}
							</div>
							<div className="light-entry__note-title">{pulledNote.title}</div>
							{/* body is sanitized HTML from the API; rendered as-is by contract */}
							<div className="light-entry__note-prose" dangerouslySetInnerHTML={{ __html: pulledNote.body }} />
							<div className="light-entry__note-signrow">
								<div className="light-entry__note-signature">{signoff}, keeper</div>
								{pulledDoodle && (
									<div className="light-entry__note-marginalia">
										<DoodleSvg doodle={pulledDoodle} className="light-entry__note-doodle" />
										<span className="light-entry__note-doodle-caption">{pulledNote.doodleCaption}</span>
									</div>
								)}
							</div>
							<div className="light-entry__note-credit">found tucked into the log of {project.title}</div>
						</div>
					</div>
				</div>
				) : (
				<div key="log" className={`overlay-card light-entry${pull.cameFrom ? ' light-entry--flourish' : ''}`}>
					<div className="overlay-head">
						<span className="overlay-kicker">The Light List · No. {registryNo(project.order)}</span>
						<button ref={closeRef} className="pill-close" onClick={requestClose}>close ✕</button>
					</div>

					<div className="light-entry__body">
						<div className="light-entry__masthead">
							<div className="lamp lamp--big">
								<div className="lamp__halo-under" style={{ background: `radial-gradient(circle, rgba(${glow},${dark ? 0.05 : 0.16}) 0%, transparent 70%)` }} />
								<div ref={haloRef} className="lamp__halo" style={{ background: `radial-gradient(circle, rgba(${glow},1) 0%, transparent 62%)` }} />
								<BoltedSvg svg={towerSvg} spot="tower-stub" className="lamp__ghost" width={40} height={54} viewBox="0 0 26 34">
									<path d="M13 3 L17 10 L9 10 Z" fill="rgba(150,160,220,.4)" />
									<rect x="10" y="10" width="6" height="15" fill="none" stroke="rgba(150,160,220,.45)" strokeWidth="1.3" />
									<path d="M10 14 h6 M10 19 h6" stroke="rgba(150,160,220,.34)" strokeWidth="1.1" />
									<path d="M5 30 q8 -4 16 0" stroke="rgba(150,160,220,.36)" strokeWidth="1.3" fill="none" />
								</BoltedSvg>
								<div
									ref={coreRef}
									className="lamp__core"
									style={{ background: dark ? '#59647f' : '#fff', boxShadow: `0 0 13px 4px rgba(${glow},1)` }}
								/>
							</div>
							<div className="light-entry__intro">
								<span className="light-entry__title">{project.title}</span>
								<div className="light-entry__status-row">
									<span className="light-entry__meta-line">
										<span className="light-entry__code">{codeFor(light)}</span> · est. <span className="light-entry__meta-value">{project.firstLit}</span> · home waters
									</span>
									<span className={`status-pill ${dark ? 'status-pill--dark' : 'status-pill--lit'}`}>{dark ? `dark · ${light.extinguished}` : 'lit'}</span>
								</div>
								<span className="light-entry__decoded">{decodeFor(light)}</span>
							</div>
						</div>

						{tiedNotes.length > 0 && (
							<div className="light-entry__notes">
								<span className="light-entry__notes-label">notes found here</span>
								<div className="light-entry__notes-links">
									{tiedNotes.map((note) => (
										<button key={note.id} type="button" title="pull it out and read it" className="light-entry__notes-link" onClick={() => pullOut(note.id)}>✎ {note.title} →</button>
									))}
								</div>
							</div>
						)}

						{showNudge && <div className="light-entry__nudge">no notes here yet. the keeper has been meaning to.</div>}

						{facts.length > 0 && (
							<div className="light-entry__facts">
								{facts.map((fact) => (
									<div key={fact.heading} className="light-entry__facts-row">
										<span className="light-entry__facts-label">{fact.heading}</span>
										<span className="light-entry__facts-value">{fact.fact}</span>
									</div>
								))}
							</div>
						)}

						<div className="light-entry__cols">
							<div className="light-entry__left">
								{/* body is sanitized HTML from the API; rendered as-is by contract */}
								<div className="light-entry__text" dangerouslySetInnerHTML={{ __html: project.body }} />

								{(project.hasLog || coastLink) && (
									<div className="light-entry__links">
										{project.hasLog && <a href={`/projects/${project.slug}`} className="light-entry__caselink-link">read the full log →</a>}
										{coastLink && <a href="/projects" className="light-entry__coastlink-link">the whole coast →</a>}
									</div>
								)}
							</div>

							<div className="light-entry__right">
								<div className={`photo-print${mainOk ? '' : ' photo-print--empty'}`}>
									{mainOk ? (
										<img src={mediaUrl(mainPrint)} alt={project.title} onError={() => markFailed(mainPrint)} />
									) : (
										<div className="photo-print__paper" aria-hidden="true" />
									)}
								</div>
								<span className="light-entry__photo-caption">from the station archive</span>
								{thumbs.length > 0 && (
									<div className="light-entry__thumbs">
										{thumbs.map((name, index) => {
											const thumbOk = !failedPrints.has(name);
											return (
												<div key={name} className={`light-entry__thumb${thumbOk ? '' : ' light-entry__thumb--empty'}`} style={{ transform: `rotate(${THUMB_ROTATIONS[index % THUMB_ROTATIONS.length]})` }}>
													{thumbOk ? (
														<img src={mediaUrl(name)} alt="" onError={() => markFailed(name)} />
													) : (
														<div className="light-entry__thumb-paper" aria-hidden="true" />
													)}
												</div>
											);
										})}
									</div>
								)}
								<span className="light-entry__tags">{(project.tags ?? []).join('  ·  ')}</span>
							</div>
						</div>

						<div className="light-entry__final">
							<span className="light-entry__moral">{project.moral}</span>
							<span className="light-entry__signoff">{signoff}, the keeper</span>
						</div>
					</div>
				</div>
				)}
			</div>
		</div>,
		document.body,
	);
}

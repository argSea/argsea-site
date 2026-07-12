// The journal entry: the overlay shared by the Notes page and the home
// journal strip. A self-contained modal: it owns Escape (at capture, so it
// beats any other overlay's own listener on the same page), the backdrop
// click, and its own open/close animation, so neither caller has to wire
// that up twice. The harbor cat perches on the card's top edge only when the
// caller's own one-cat pick landed on this overlay spot.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Doodle, FigureheadDesign, Note, Project } from '../../lib/api';
import { useEscapeKey } from './useEscapeKey';
import HarborCat from './HarborCat';
import DoodleSvg from './DoodleSvg';
import './JournalEntryOverlay.css';

interface Props {
	note:        Note;
	doodle:      Doodle | null;
	signoff:     string;
	foundIn?:    Project[]; // the lights that tie this note via their own noteIds; [] or absent hides the block entirely
	onStepInto?: (project: Project) => void; // step into the tower: close this entry, open the light in place. Absent falls back to the plain /projects link
	catHere?:    boolean;
	catDesigns?: FigureheadDesign[];
	onClose:     () => void;
}

// How long the exit animation runs before the caller actually unmounts us;
// mirrors cardOut/backdropOut in JournalEntryOverlay.css.
const CLOSE_MS = 220;

function reducedMotion(): boolean {
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function JournalEntryOverlay({ note, doodle, signoff, foundIn = [], onStepInto, catHere = false, catDesigns, onClose }: Props) {
	const [closing, setClosing] = useState(false);
	const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	useEffect(() => () => clearTimeout(closeTimer.current), []);

	// The exit animation plays first and onClose (the caller's actual unmount)
	// follows after it finishes; reduced motion skips straight to onClose.
	const requestClose = () => {
		if (closing) {
			return;
		}
		if (reducedMotion()) {
			onClose();
			return;
		}
		setClosing(true);
		closeTimer.current = setTimeout(onClose, CLOSE_MS);
	};

	useEscapeKey(true, requestClose, true);

	// Portaled to document.body so the backdrop sits in the root stacking
	// context regardless of which page mounted us (the Notes list or the home
	// journal strip), same as LightEntryOverlay.
	return createPortal(
		<div className={`overlay-backdrop${closing ? ' overlay-backdrop--closing' : ''}`} onClick={requestClose}>
			<div className={`letter-wrap${closing ? ' letter-wrap--closing' : ''}`} onClick={(event) => event.stopPropagation()}>
				{catHere && <div className="cat-mount cat-mount--note"><HarborCat pose="perched" context="note" designs={catDesigns} /></div>}
				<div className="overlay-card letter">
					<div className="overlay-head">
						<span className="overlay-kicker">Journal entry · {note.date}</span>
						<button className="pill-close" onClick={requestClose}>close ✕</button>
					</div>
					<div className="letter__content">
						<div className="letter__conditions">{note.conditions}</div>
						<div className="letter__title">{note.title}</div>
						{/* body is sanitized HTML from the API, rendered as-is by contract */}
						<div className="letter__body" dangerouslySetInnerHTML={{ __html: note.body }} />
						{foundIn.length > 0 && (
							<div className="letter__found-in">
								<span className="letter__found-in-label">found in</span>
								<div className="letter__found-in-links">
									{foundIn.map((project) => (
										onStepInto
											? <button key={project.id} type="button" title="step into the tower" className="letter__found-in-link" onClick={() => onStepInto(project)}>✷ {project.title} →</button>
											: <a key={project.id} href="/projects" title="a light on the coast · the full list" className="letter__found-in-link">✷ {project.title} →</a>
									))}
								</div>
							</div>
						)}
						<div className="letter__signrow">
							<div className="letter__signature">{signoff}</div>
							{doodle && (
								<div className="letter__marginalia">
									<DoodleSvg doodle={doodle} className="letter__doodle" />
									<span className="letter__doodle-caption">{note.doodleCaption}</span>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>,
		document.body,
	);
}

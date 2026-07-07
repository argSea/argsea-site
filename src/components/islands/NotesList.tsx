// The stateful part of the Notes page: the list rows and the letter overlay.
// Notes with an image carry a photo print — a small tilted thumbnail in the
// row, a larger snapshot in the letter (design v4).
import { useState } from 'react';
import type { FigureheadDesign, Note } from '../../lib/api';
import { mediaUrl } from '../../lib/media';
import { pageCatPick } from '../../lib/catSpots';
import HarborCat from './HarborCat';
import { useEscapeKey } from './useEscapeKey';
import './NotesList.css';

interface Props {
	notes:       Note[];
	signoff:     string;
	catEnabled:  boolean;
	catPages?:   Record<string, boolean>;
	catSpots?:   Record<string, boolean>;
	catDesigns?: FigureheadDesign[];
}

export default function NotesList({ notes, signoff, catEnabled, catPages, catSpots, catDesigns }: Props) {
	const [openId, setOpenId] = useState<string | null>(null);

	// The cat rides the letter only when the page's one-cat pick is this overlay
	// spot; the note-row perch is a separate spot the director owns.
	const pick = catEnabled ? pageCatPick('notes', catPages, catSpots) : null;
	const catHere = pick?.id === 'notes.overlay';

	const openNote = (id: string) => {
		setOpenId(id);
	};

	const close = () => setOpenId(null);
	useEscapeKey(openId !== null, close);

	const open = openId === null ? null : notes.find((note) => note.id === openId) ?? null;

	return (
		<>
			{notes.map((note) => (
				<div
					key={note.id}
					className="note-row"
					role="button"
					tabIndex={0}
					onClick={() => openNote(note.id)}
					onKeyDown={(event) => {
						if (event.key === 'Enter' || event.key === ' ') {
							event.preventDefault();
							openNote(note.id);
						}
					}}
				>
					<span className="note-row__date">{note.date}</span>
					{note.image && (
						<span className="note-row__print">
							<img src={mediaUrl(note.image)} alt="" />
						</span>
					)}
					<span className="note-row__middle">
						<span className="note-row__title">{note.title}</span>
						<span className="note-row__teaser">{note.teaser}</span>
					</span>
					<span className="note-row__read">read →</span>
				</div>
			))}

			{open && (
				<div className="overlay-backdrop" onClick={close}>
					<div className="letter-wrap" onClick={(event) => event.stopPropagation()}>
						{catHere && <div className="cat-mount cat-mount--note"><HarborCat pose="perched" context="note" designs={catDesigns} /></div>}
						<div className="overlay-card letter">
							<div className="overlay-head">
								<span className="overlay-kicker">Note · {open.date}</span>
								<button className="pill-close" onClick={close}>close ✕</button>
							</div>
							<div className="letter__content">
								<div className="letter__title">{open.title}</div>
								{open.image && (
									<div className="letter__print">
										<img src={mediaUrl(open.image)} alt={open.title} />
									</div>
								)}
								{/* body is sanitized HTML from the API — rendered as-is by contract */}
								<div className="letter__body" dangerouslySetInnerHTML={{ __html: open.body }} />
								<div className="letter__signature">{signoff}</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</>
	);
}

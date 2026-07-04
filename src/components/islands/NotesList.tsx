// The stateful part of the Notes page: the list rows and the letter overlay.
// Content arrives as build-time props; the only state is which note is open.
import { useState } from 'react';
import type { Note } from '../../lib/api';
import { useEscapeKey } from './useEscapeKey';
import './NotesList.css';

interface Props {
	notes: Note[];
}

export default function NotesList({ notes }: Props) {
	const [openId, setOpenId] = useState<string | null>(null);

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
					onClick={() => setOpenId(note.id)}
					onKeyDown={(event) => {
						if (event.key === 'Enter' || event.key === ' ') {
							event.preventDefault();
							setOpenId(note.id);
						}
					}}
				>
					<span className="note-row__date">{note.date}</span>
					<span className="note-row__middle">
						<span className="note-row__title">{note.title}</span>
						<span className="note-row__teaser">{note.teaser}</span>
					</span>
					<span className="note-row__read">read →</span>
				</div>
			))}

			{open && (
				<div className="overlay-backdrop" onClick={close}>
					<div className="overlay-card letter" onClick={(event) => event.stopPropagation()}>
						<div className="overlay-head">
							<span className="overlay-kicker">Note · {open.date}</span>
							<button className="pill-close" onClick={close}>close ✕</button>
						</div>
						<div className="letter__content">
							<div className="letter__title">{open.title}</div>
							{/* body is sanitized HTML from the API — rendered as-is by contract */}
							<div className="letter__body" dangerouslySetInnerHTML={{ __html: open.body }} />
							<div className="letter__signature">— j</div>
						</div>
					</div>
				</div>
			)}
		</>
	);
}

// The stateful part of the Keeper's Journal: the journal-spread rows. The
// journal-entry overlay itself is JournalEntryOverlay, shared with the home
// journal strip (design: The Keeper's Journal).
import { useState } from 'react';
import type { Doodle, FigureheadDesign, Note, Project } from '../../lib/api';
import { pageCatPick } from '../../lib/catSpots';
import JournalEntryOverlay from './JournalEntryOverlay';
import LightEntryOverlay from './LightEntryOverlay';
import './NotesList.css';

interface Props {
	notes:       Note[];
	doodles:     Doodle[];
	projects:    Project[]; // resolves each note's "found in" ties via project.noteIds
	signoff:     string;
	catEnabled:  boolean;
	catPages?:   Record<string, boolean>;
	catSpots?:   Record<string, boolean>;
	catDesigns?: FigureheadDesign[];
}

export default function NotesList({ notes, doodles, projects, signoff, catEnabled, catPages, catSpots, catDesigns }: Props) {
	const [openId, setOpenId] = useState<string | null>(null);
	const [lightId, setLightId] = useState<string | null>(null);

	// The cat rides the letter only when the page's one-cat pick is this overlay
	// spot; the note-row perch is a separate spot the director owns.
	const pick = catEnabled ? pageCatPick('notes', catPages, catSpots) : null;
	const catHere = pick?.id === 'notes.overlay';

	const doodleFor = (doodleId: string | null) => doodleId ? doodles.find((doodle) => doodle.id === doodleId) ?? null : null;

	const openNote = (id: string) => {
		setOpenId(id);
	};

	const close = () => setOpenId(null);

	// Step into the tower: close the entry, open its light in place. The Notes
	// page carries no light overlay of its own, so it mounts one here.
	const stepInto = (project: Project) => {
		setOpenId(null);
		setLightId(project.id);
	};
	const closeLight = () => setLightId(null);

	const open = openId === null ? null : notes.find((note) => note.id === openId) ?? null;
	const openDoodle = open ? doodleFor(open.doodleId) : null;
	const foundIn = open ? projects.filter((project) => (project.noteIds ?? []).includes(open.id)) : [];
	const openLight = lightId === null ? null : projects.find((project) => project.id === lightId) ?? null;

	// Zero-to-five spelled, then digits; singular only at one, and past five the
	// journal has officially earned the name (Notes.dc.html's own footLine).
	const footLine = (() => {
		const n = notes.length;
		const word = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five'][n] || String(n);
		return n < 5
			? `${word} entr${n === 1 ? 'y' : 'ies'} so far. The bar for "journal" is five. We'll see.`
			: `${word} entries. It's officially a journal now. Nobody is more surprised than the keeper.`;
	})();

	return (
		<>
			<div className="journal">
				<div className="journal__binding" aria-hidden="true" />
				<div className="journal__ribbon" aria-hidden="true" />
				{catEnabled && <div className="journal__coffee-ring" aria-hidden="true" />}
				<div className="journal__header">
					<span className="journal__header-label">Keeper's journal · private-ish</span>
					<span className="journal__header-vol">vol. 1</span>
				</div>

				<div className="journal__rows">
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
							<span className="note-row__dateline">
								<span className="note-row__date">{note.date}</span>
								<span className="note-row__conditions">{note.conditions}</span>
							</span>
							<span className="note-row__middle">
								<span className="note-row__titlerow">
									<span className="note-row__title">{note.title}</span>
									<span className="note-row__read">read →</span>
								</span>
								<span className="note-row__teaser">{note.teaser}</span>
							</span>
						</div>
					))}
				</div>

				<div className="journal__foot">
					<div className="journal__footer">{footLine}</div>
					{catEnabled && (
						<div className="journal__pawprints">
							<span className="journal__paw-dots">
								<span className="journal__paw-dot" />
								<span className="journal__paw-dot" />
								<span className="journal__paw-dot" />
							</span>
							<span className="journal__paw-caption">the cat has read these</span>
						</div>
					)}
				</div>
			</div>

			{open && (
				<JournalEntryOverlay
					note={open}
					doodle={openDoodle}
					signoff={signoff}
					foundIn={foundIn}
					onStepInto={stepInto}
					catHere={catHere}
					catDesigns={catDesigns}
					onClose={close}
				/>
			)}

			{openLight && (
				<LightEntryOverlay
					project={openLight}
					notes={notes}
					doodles={doodles}
					signoff={signoff}
					catDesigns={catDesigns}
					onClose={closeLight}
				/>
			)}
		</>
	);
}

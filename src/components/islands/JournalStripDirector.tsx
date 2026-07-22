// Progressive enhancement over the home journal strip's static <a> rows
// (JournalStrip.astro): intercepts a plain left-click, or its Enter-key
// equivalent on a focused row, to open the shared journal-entry overlay in
// place. A modified click (ctrl/meta/shift), a middle click, or no JS at all
// all fall through to the row's real /notes href. One delegated listener on
// the strip's container, so the rows themselves stay server-rendered HTML
// rather than hydrating one island per row.
import { useEffect, useState } from 'react';
import type { Doodle, Hobby, Note, Project } from '../../lib/api';
import JournalEntryOverlay from './JournalEntryOverlay';
import LightEntryOverlay from './LightEntryOverlay';

interface Props {
	notes:    Note[]; // the preview rows (the newest few); resolves a clicked strip row
	allNotes: Note[]; // the full journal, so a stepped-into light resolves its own "notes found here"
	doodles:  Doodle[];
	projects: Project[]; // resolves each note's "found in" ties via project.noteIds
	hobbies:  Hobby[]; // resolves each note's bearing ties via hobby.noteIds (the ◈ chart links)
	towerSvg?: string | null; // tower-stub carving, resolved build-time by index.astro; forwarded to the stepped-into light
}

export default function JournalStripDirector({ notes, allNotes, doodles, projects, hobbies, towerSvg }: Props) {
	const [openId, setOpenId] = useState<string | null>(null);
	const [lightId, setLightId] = useState<string | null>(null);

	useEffect(() => {
		const container = document.querySelector('.journal-strip__rows');
		if (!container) {
			return;
		}
		const onClick = (event: Event) => {
			if (!(event instanceof MouseEvent) || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey) {
				return;
			}
			const row = (event.target as HTMLElement).closest<HTMLElement>('[data-journal-row]');
			if (!row || !container.contains(row)) {
				return;
			}
			event.preventDefault();
			setOpenId(row.dataset.journalRow ?? null);
		};
		container.addEventListener('click', onClick);
		return () => container.removeEventListener('click', onClick);
	}, []);

	const close = () => setOpenId(null);

	// Step into the tower: close the entry, open its light in place. The home
	// journal strip is its own island, so it mounts the light overlay here
	// (HomeLights' one only knows the flagship + featured; a tie can point at
	// any light, and this director already carries the full projects list).
	const stepInto = (project: Project) => {
		setOpenId(null);
		setLightId(project.id);
	};
	const closeLight = () => setLightId(null);

	const open = openId === null ? null : notes.find((note) => note.id === openId) ?? null;
	const openDoodle = open ? doodles.find((doodle) => doodle.id === open.doodleId) ?? null : null;
	const foundIn = open ? projects.filter((project) => (project.noteIds ?? []).includes(open.id)) : [];
	const foundHobbies = open ? hobbies.filter((hobby) => (hobby.noteIds ?? []).includes(open.id)) : [];
	const openLight = lightId === null ? null : projects.find((project) => project.id === lightId) ?? null;

	return (
		<>
			{open && <JournalEntryOverlay note={open} doodle={openDoodle} foundIn={foundIn} foundHobbies={foundHobbies} onStepInto={stepInto} onClose={close} />}
			{openLight && <LightEntryOverlay project={openLight} notes={allNotes} doodles={doodles} towerSvg={towerSvg} coastLink onClose={closeLight} />}
		</>
	);
}

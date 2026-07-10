// Progressive enhancement over the home journal strip's static <a> rows
// (JournalStrip.astro): intercepts a plain left-click, or its Enter-key
// equivalent on a focused row, to open the shared journal-entry overlay in
// place. A modified click (ctrl/meta/shift), a middle click, or no JS at all
// all fall through to the row's real /notes href. One delegated listener on
// the strip's container, so the rows themselves stay server-rendered HTML
// rather than hydrating one island per row.
import { useEffect, useState } from 'react';
import type { Doodle, Note } from '../../lib/api';
import JournalEntryOverlay from './JournalEntryOverlay';

interface Props {
	notes:   Note[];
	doodles: Doodle[];
	signoff: string;
}

export default function JournalStripDirector({ notes, doodles, signoff }: Props) {
	const [openId, setOpenId] = useState<string | null>(null);

	useEffect(() => {
		const container = document.querySelector('.journal-strip__block');
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
	const open = openId === null ? null : notes.find((note) => note.id === openId) ?? null;
	const openDoodle = open ? doodles.find((doodle) => doodle.id === open.doodleId) ?? null : null;

	if (!open) {
		return null;
	}
	return <JournalEntryOverlay note={open} doodle={openDoodle} signoff={signoff} onClose={close} />;
}

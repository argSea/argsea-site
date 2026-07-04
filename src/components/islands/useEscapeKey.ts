import { useEffect } from 'react';

/** Both overlays close on Escape; listen only while one is open. */
export function useEscapeKey(active: boolean, onEscape: () => void): void {
	useEffect(() => {
		if (!active) {
			return;
		}
		const onKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				onEscape();
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [active, onEscape]);
}

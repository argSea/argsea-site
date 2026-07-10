import { useEffect, useRef } from 'react';

/**
 * Both overlays close on Escape; listen only while one is open. The callback
 * lives in a ref so the listener attaches once per open/close cycle instead
 * of re-subscribing every render (callers pass fresh closures). capture, when
 * set, both attaches the listener to the capture phase and stops the event
 * there, so this overlay's Escape always wins over a bubble-phase listener
 * (every other overlay's) on the same page, regardless of mount order.
 */
export function useEscapeKey(active: boolean, onEscape: () => void, capture = false): void {
	const callback = useRef(onEscape);
	callback.current = onEscape;

	useEffect(() => {
		if (!active) {
			return;
		}
		const onKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				if (capture) {
					event.stopPropagation();
				}
				callback.current();
			}
		};
		window.addEventListener('keydown', onKey, capture);
		return () => window.removeEventListener('keydown', onKey, capture);
	}, [active, capture]);
}

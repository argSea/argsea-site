import { useCallback, useEffect, useRef } from 'react';
import type { Light } from '../../lib/api';
import { ENGINE_ANIMATION_ID, ignite } from '../../lib/lightChar';

/**
 * Wires one element to the characteristic engine. Deps are the light's
 * scalar fields, not the object itself: fixture/API data hands back a stable
 * object per project, but keying on identity would still be fragile, and a
 * primitive-keyed effect only ever re-ignites when the characteristic
 * actually changes, never on an unrelated re-render. The ref callback is
 * memoized so React doesn't churn it (and el.current) on every render.
 * floor is the dark-phase opacity (0 by default); a caller can raise it so
 * the element dims instead of vanishing between flashes. held freezes the
 * element at peak opacity instead of igniting it, for a caller that wants to
 * hold the lamp steady bright on its own trigger (e.g. hover) without
 * touching the shared phase-locked clock.
 */
export function useLamp(light: Light, peak: number, floor = 0, held = false): React.RefCallback<HTMLElement> {
	const el = useRef<HTMLElement | null>(null);
	const setEl = useCallback((node: HTMLElement | null) => { el.current = node; }, []);

	useEffect(() => {
		if (!el.current) {
			return;
		}
		if (held) {
			// Same targeted cancel as ignite(): only the engine's own animation,
			// never a CSS one (e.g. haloBreath) sharing the element.
			el.current.getAnimations()
				.filter((animation) => animation.id === ENGINE_ANIMATION_ID)
				.forEach((animation) => animation.cancel());
			el.current.style.opacity = String(peak);
			return;
		}
		const animation = ignite(el.current, light, peak, floor);
		return () => animation?.cancel();
	}, [light.kind, light.color, light.period, light.extinguished, light.letter, peak, floor, held]);

	return setEl;
}

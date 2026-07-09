import { useCallback, useEffect, useRef } from 'react';
import type { Light } from '../../lib/api';
import { ignite } from '../../lib/lightChar';

/**
 * Wires one element to the characteristic engine. Deps are the light's
 * scalar fields, not the object itself: fixture/API data hands back a stable
 * object per project, but keying on identity would still be fragile, and a
 * primitive-keyed effect only ever re-ignites when the characteristic
 * actually changes, never on an unrelated re-render. The ref callback is
 * memoized so React doesn't churn it (and el.current) on every render.
 */
export function useLamp(light: Light, peak: number): React.RefCallback<HTMLElement> {
	const el = useRef<HTMLElement | null>(null);
	const setEl = useCallback((node: HTMLElement | null) => { el.current = node; }, []);

	useEffect(() => {
		if (!el.current) {
			return;
		}
		const animation = ignite(el.current, light, peak);
		return () => animation?.cancel();
	}, [light.kind, light.color, light.period, light.extinguished, peak]);

	return setEl;
}

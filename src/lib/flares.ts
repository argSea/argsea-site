// The shared local flare tally (argsea-flares): ShipsLog and Helm both read
// and write the same bucket, so a flare fired on either page tallies once,
// no matter which one it was fired from. Client-safe; islands may import
// this (unlike api.ts).
import type { Hobby } from './api';

const FLARES_KEY = 'argsea-flares';

export type FlareTally = Record<string, number>;

/**
 * Loads the stored tally, migrated to id keys: for each hobby, `stored[id]
 * ?? stored[name]` becomes its id-keyed count, so a rename never orphans
 * one. Every other stored key rides forward untouched (a count is never
 * dropped) and the migrated shape is written back only when it actually
 * changed. A corrupt or blocked store just means no tally remembered.
 */
export function loadFlares(hobbies: Hobby[]): FlareTally {
	try {
		const stored = JSON.parse(localStorage.getItem(FLARES_KEY) ?? '{}');
		if (!stored || typeof stored !== 'object') {
			return {};
		}
		const migrated: FlareTally = { ...stored };
		let changed = false;
		for (const hobby of hobbies) {
			const value = stored[hobby.id] ?? stored[hobby.name];
			if (value !== undefined && migrated[hobby.id] !== value) {
				migrated[hobby.id] = value;
				changed = true;
			}
		}
		if (changed) {
			localStorage.setItem(FLARES_KEY, JSON.stringify(migrated));
		}
		return migrated;
	} catch {
		return {};
	}
}

/** Bumps one hobby's own tally by one, id-keyed, and persists it. */
export function recordFlare(hobbyId: string, current: FlareTally): FlareTally {
	const next = { ...current, [hobbyId]: (current[hobbyId] ?? 0) + 1 };
	try {
		localStorage.setItem(FLARES_KEY, JSON.stringify(next));
	} catch {
		// storage may be unavailable (private mode, quota); the tally just won't survive a reload
	}
	return next;
}

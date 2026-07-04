// Client-safe media helper — islands may import this (unlike api.ts).

/**
 * Resolve an API media name to a same-origin URL. The production site and its
 * media store share the argsea.com domain, so a root-relative path suffices.
 */
export function mediaUrl(name: string): string {
	return `/media/images/${name}`;
}

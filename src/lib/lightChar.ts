// The characteristic engine: turns a project's Light into a real, phase-locked
// blink instead of a decorative CSS loop. Framework-free on purpose (mirrored
// conceptually in the admin repo for the same reason) so a lib module, not an
// island, owns it. Every lamp on the page shares one clock (animation
// startTime pinned to 0), so the coast, the register, and the overlay's big
// lamp all agree with each other on what instant it is.
import type { Light, LightColor } from './api';

export const DEFAULT_LIGHT: Light = { kind: 'fixed', color: 'white', period: 0, extinguished: '', letter: '' };

// Glow RGB per color, fed into rgba(...) at render time; dark is the
// extinguished tint, never a color a burning light carries.
export const GLOW: Record<LightColor | 'dark', string> = {
	white: '246,236,207',
	red:   '231,122,112',
	green: '111,202,151',
	dark:  '120,132,170',
};

/** The glow triple for a light: dark once extinguished, its color's glow otherwise. */
export function glowFor(light: Light): string {
	if (light.extinguished) {
		return GLOW.dark;
	}
	return GLOW[light.color];
}

/** The Light List's registry number: gapped so a future insertion never renumbers its neighbors. */
export function registryNo(order: number): string {
	return String(order * 2).padStart(3, '0');
}

const COLOR_LETTER: Record<LightColor, string> = { white: 'W', red: 'R', green: 'G' };
const KIND_PREFIX: Record<'flash' | 'occult' | 'iso', string> = { flash: 'Fl', occult: 'Oc', iso: 'Iso' };

/** The Light List code: `F W`, `Fl W 8s`, `Oc R 6s`, `Iso G 3s`, `Q W`, `VQ R`, `Mo(A) W 8s`. Quick and veryquick carry no period, same as fixed: their rate is a fixed convention, not a stored value. */
export function codeFor(light: Light): string {
	const letter = COLOR_LETTER[light.color];
	switch (light.kind) {
		case 'fixed':
			return `F ${letter}`;
		case 'quick':
			return `Q ${letter}`;
		case 'veryquick':
			return `VQ ${letter}`;
		case 'morse':
			return `Mo(${light.letter}) ${letter} ${light.period}s`;
		default:
			return `${KIND_PREFIX[light.kind]} ${letter} ${light.period}s`;
	}
}

function plainLanguage(light: Light): string {
	const color = light.color || 'white';
	switch (light.kind) {
		case 'fixed':
			return `fixed ${color}, a steady light that never blinks`;
		case 'occult':
			return `occulting ${color}, steady with a brief eclipse every ${light.period} seconds`;
		case 'iso':
			return `isophase ${color}, equal parts light and dark every ${light.period} seconds`;
		case 'quick':
			return `quick ${color}, flashing about once a second`;
		case 'veryquick':
			return `very quick ${color}, flashing about twice a second`;
		case 'morse':
			return `morse ${color}, tapping the letter ${light.letter} in Morse code every ${light.period} seconds`;
		case 'flash':
		default:
			return `flashing ${color}, dark with a bright flash every ${light.period} seconds`;
	}
}

/** The decoded plain-language line: `formerly ...` once the light is extinguished. */
export function decodeFor(light: Light): string {
	const plain = plainLanguage(light);
	if (light.extinguished) {
		return `formerly ${plain}, extinguished ${light.extinguished}`;
	}
	return plain;
}

export interface Timeline {
	period: number;
	spans:  [number, number][];
}

// International Morse, A-Z only (the contract's letter field is a single A-Z rune).
const MORSE: Record<string, string> = {
	A: '.-',   B: '-...', C: '-.-.', D: '-..',  E: '.',
	F: '..-.', G: '--.',  H: '....', I: '..',   J: '.---',
	K: '-.-',  L: '.-..', M: '--',   N: '-.',   O: '---',
	P: '.--.', Q: '--.-', R: '.-.',  S: '...',  T: '-',
	U: '..-',  V: '...-', W: '.--',  X: '-..-', Y: '-.--',
	Z: '--..',
};

const MORSE_UNIT = 0.4;

/** A morse letter's lit spans at the 0.4s unit: dot 1 unit, dash 3, a 1-unit gap between elements; whatever's left of the period stays dark. */
function morseTimeline(letter: string, period: number): Timeline {
	const pattern = MORSE[letter.toUpperCase()] ?? '';
	const spans: [number, number][] = [];
	let t = 0;
	for (const symbol of pattern) {
		const on = symbol === '-' ? MORSE_UNIT * 3 : MORSE_UNIT;
		spans.push([t, t + on]);
		t += on + MORSE_UNIT;
	}
	return { period, spans };
}

/** Lit intervals within one period, in seconds; fixed carries no spans, callers treat it as static. Quick/veryquick ignore the stored period: their cycle is a fixed convention, not a stored value. */
export function timeline(light: Light): Timeline {
	const period = light.period || 0;
	switch (light.kind) {
		case 'flash':
			return { period, spans: [[0, 0.8]] };
		case 'occult':
			return { period, spans: [[0, 0.6], [1.7, period]] };
		case 'iso':
			return { period, spans: [[0, period / 2]] };
		case 'quick':
			return { period: 1.0, spans: [[0, 0.3]] };
		case 'veryquick':
			return { period: 0.5, spans: [[0, 0.15]] };
		case 'morse':
			return morseTimeline(light.letter, period);
		case 'fixed':
		default:
			return { period, spans: [] };
	}
}

const RAMP = 0.07;

function reducedMotion(): boolean {
	return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Opacity keyframes for one period: peak inside a span, floor outside, a
 * 0.07s ramp at each real edge. A span touching t=0 or t=period is already
 * lit going into the wrap, so no ramp is drawn there: the point of a shared,
 * looping clock is that the seam must not read as a second, spurious blink.
 */
function buildKeyframes(period: number, spans: [number, number][], peak: number, floor: number): Keyframe[] {
	const points: { t: number; opacity: number }[] = [];
	const nudge = Math.max(period * 0.0002, 0.0005);

	const push = (t: number, opacity: number) => {
		const clamped = Math.min(period, Math.max(0, t));
		const prev = points[points.length - 1];
		const at = prev && clamped <= prev.t ? Math.min(period, prev.t + nudge) : clamped;
		points.push({ t: at, opacity });
	};

	const startsLit = spans.length > 0 && spans[0][0] === 0;
	const endsLit = spans.length > 0 && spans[spans.length - 1][1] === period;

	push(0, startsLit ? peak : floor);
	spans.forEach(([onStart, onEnd], index) => {
		if (!(index === 0 && startsLit)) {
			push(onStart - RAMP, floor);
			push(onStart, peak);
		}
		if (!(index === spans.length - 1 && endsLit)) {
			push(onEnd - RAMP, peak);
			push(onEnd, floor);
		}
	});
	push(period, endsLit ? peak : floor);

	return points.map((point) => ({ offset: point.t / period, opacity: point.opacity }));
}

/**
 * Runs a light's real characteristic on an element via the Web Animations
 * API, phase-locked to a shared clock so every lamp on the page reads the
 * same instant the same way. Fixed, extinguished, and reduced-motion all
 * settle on a static opacity instead: there is nothing there to animate.
 * floor is the dark-phase opacity (0 by default, so most lamps fully vanish
 * between flashes); a caller like the you-are-here ring can raise it so the
 * element only dims. Any blink already running on the element is cancelled
 * first, and the new one is returned so a caller can cancel it in its own
 * cleanup.
 */
export function ignite(el: HTMLElement, light: Light, peak: number, floor = 0): Animation | null {
	el.getAnimations().forEach((animation) => animation.cancel());

	if (light.extinguished) {
		el.style.opacity = String(peak);
		return null;
	}
	if (light.kind === 'fixed') {
		el.style.opacity = String(peak);
		return null;
	}
	if (reducedMotion()) {
		el.style.opacity = String(peak);
		return null;
	}

	const { period, spans } = timeline(light);
	if (!(period > 0) || spans.length === 0) {
		el.style.opacity = String(peak);
		return null;
	}

	el.style.opacity = '';
	const keyframes = buildKeyframes(period, spans, peak, floor);
	const animation = el.animate(keyframes, { duration: period * 1000, iterations: Infinity });
	animation.startTime = 0;
	return animation;
}

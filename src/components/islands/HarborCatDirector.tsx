// The placement director: one cat per page view. It reads the page's pick
// from the shared catalog (memoized, so it and the overlay islands agree on a
// single spot) and, when that pick is a static perch, measures the anchor
// element and portals the cat onto it, clamped to the viewport. When the pick
// is an overlay spot the director renders nothing: the owning overlay island
// shows the cat on open. Never two cats on a page.
//
// The eggs.cat master gate lives in the layout: this island only mounts when
// the egg is on. Data arrives as props from frontmatter; an island never
// imports src/lib/api.ts.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import HarborCat from './HarborCat';
import { pageCatPick, NAV_TABBAR_MAX, type CatPage, type CatSpot } from '../../lib/catSpots';
import type { FigureheadDesign } from '../../lib/api';
import './HarborCat.css';

// Rendered sizes per pose and the paw line as a fraction of height: the paws
// rest on the anchor's edge, so the cat sits above (or below) it naturally.
const SIZE = {
	perched: { w: 56, h: 64, paw: 0.71 },
	lying:   { w: 88, h: 42, paw: 0.89 },
} as const;

const GUTTER = 8;

interface Props {
	page:        CatPage;
	catPages?:   Record<string, boolean>;
	catSpots?:   Record<string, boolean>;
	catDesigns?: FigureheadDesign[];
}

interface Placement {
	left: number;
	top:  number;
	w:    number;
	h:    number;
	side: 'left' | 'right';
}

export default function HarborCatDirector({ page, catPages, catSpots, catDesigns }: Props) {
	const [spot] = useState<CatSpot | null>(() => pageCatPick(page, catPages, catSpots));
	const [placement, setPlacement] = useState<Placement | null>(null);

	useEffect(() => {
		if (!spot || spot.overlay || !spot.anchor) {
			return;
		}
		const { selector, edge, align, dx = 0, dy = 0 } = spot.anchor;
		const size = SIZE[spot.pose];
		// A menu-gated header spot stands down at or below the tab-bar breakpoint:
		// the desktop nav is gone there, so the director yields the perch.
		const phoneLine = window.matchMedia(`(max-width: ${NAV_TABBAR_MAX}px)`);
		let raf = 0;
		let tries = 0;
		let alive = true;

		const measure = () => {
			if (spot.menuGated && phoneLine.matches) {
				setPlacement(null);
				return;
			}
			const el = document.querySelector(selector);
			if (!el) {
				// The anchor may live in an island that hasn't hydrated yet; wait it out
				if (tries++ < 90) {
					raf = requestAnimationFrame(measure);
				}
				return;
			}
			const rect = el.getBoundingClientRect();
			const docW = document.documentElement.clientWidth;
			const anchorY = (edge === 'top' ? rect.top : rect.bottom) + window.scrollY - size.paw * size.h + dy;
			let left =
				align === 'center' ? rect.left + rect.width / 2 - size.w / 2 :
				align === 'left'   ? rect.left - 4 :
				                     rect.right - size.w + 6;
			left = Math.max(GUTTER, Math.min(left + window.scrollX + dx, docW - size.w - GUTTER));
			// Clamp to the top of the document, never the viewport: a re-measure
			// can fire mid-scroll (hover class flips, animationend), and a
			// viewport clamp would keep re-gluing the cat to wherever the screen
			// happens to be instead of leaving it on its perch.
			const top = Math.max(2, anchorY);
			const side: 'left' | 'right' = left + size.w / 2 > docW / 2 ? 'left' : 'right';
			setPlacement({ left, top, w: size.w, h: size.h, side });
		};

		const replace = () => {
			cancelAnimationFrame(raf);
			tries = 0;
			raf = requestAnimationFrame(measure);
		};

		replace();
		window.addEventListener('resize', replace);
		phoneLine.addEventListener('change', replace);
		// Entry animations (fade-up, the placard, card re-entry) shift anchors as
		// they settle; remeasure when each finishes
		document.addEventListener('animationend', replace, true);
		// Some anchors move by class change alone (the active filter chip), and
		// under reduced motion animationend never fires; watch class swaps too
		const classWatch = new MutationObserver(replace);
		classWatch.observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: true });
		document.fonts?.ready.then(() => { if (alive) replace(); });

		return () => {
			alive = false;
			cancelAnimationFrame(raf);
			window.removeEventListener('resize', replace);
			phoneLine.removeEventListener('change', replace);
			document.removeEventListener('animationend', replace, true);
			classWatch.disconnect();
		};
	}, [spot]);

	if (!spot || spot.overlay || !placement) {
		return null;
	}

	return createPortal(
		<div className="cat-mount" style={{ left: placement.left, top: placement.top, width: placement.w, height: placement.h }}>
			<HarborCat pose={spot.pose} context={spot.context} bubbleSide={placement.side} designs={catDesigns} />
		</div>,
		document.body,
	);
}

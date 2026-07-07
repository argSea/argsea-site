// The placement director — one cat per page view. It reads the page's pick
// from the shared catalog (memoized, so it and the overlay islands agree on a
// single spot) and, when that pick is a static perch, measures the anchor
// element and portals the cat onto it, clamped to the viewport. When the pick
// is an overlay spot the director renders nothing — the owning overlay island
// shows the cat on open. Never two cats on a page.
//
// The eggs.cat master gate lives in the layout: this island only mounts when
// the egg is on. Data arrives as props from frontmatter — an island never
// imports src/lib/api.ts.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import HarborCat from './HarborCat';
import { pageCatPick, type CatPage, type CatSpot } from '../../lib/catSpots';
import './HarborCat.css';

// Rendered sizes per pose and the paw line as a fraction of height — the paws
// rest on the anchor's edge, so the cat sits above (or below) it naturally.
const SIZE = {
	perched: { w: 56, h: 64, paw: 0.71 },
	lying:   { w: 84, h: 42, paw: 0.85 },
} as const;

const GUTTER = 8;

interface Props {
	page:      CatPage;
	catPages?: Record<string, boolean>;
	catSpots?: Record<string, boolean>;
}

interface Placement {
	left: number;
	top:  number;
	w:    number;
	h:    number;
	side: 'left' | 'right';
}

export default function HarborCatDirector({ page, catPages, catSpots }: Props) {
	const [spot] = useState<CatSpot | null>(() => pageCatPick(page, catPages, catSpots));
	const [placement, setPlacement] = useState<Placement | null>(null);

	useEffect(() => {
		if (!spot || spot.overlay || !spot.anchor) {
			return;
		}
		const { selector, edge, align } = spot.anchor;
		const size = SIZE[spot.pose];
		let raf = 0;
		let tries = 0;
		let alive = true;

		const measure = () => {
			const el = document.querySelector(selector);
			if (!el) {
				// The anchor may live in an island that hasn't hydrated yet — wait it out
				if (tries++ < 90) {
					raf = requestAnimationFrame(measure);
				}
				return;
			}
			const rect = el.getBoundingClientRect();
			const docW = document.documentElement.clientWidth;
			const anchorY = (edge === 'top' ? rect.top : rect.bottom) + window.scrollY - size.paw * size.h;
			let left =
				align === 'center' ? rect.left + rect.width / 2 - size.w / 2 :
				align === 'left'   ? rect.left - 4 :
				                     rect.right - size.w + 6;
			left = Math.max(GUTTER, Math.min(left + window.scrollX, docW - size.w - GUTTER));
			const top = Math.max(window.scrollY + 2, anchorY);
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
		// Entry animations (fade-up, the placard, card re-entry) shift anchors as
		// they settle — remeasure when each finishes
		document.addEventListener('animationend', replace, true);
		document.fonts?.ready.then(() => { if (alive) replace(); });

		return () => {
			alive = false;
			cancelAnimationFrame(raf);
			window.removeEventListener('resize', replace);
			document.removeEventListener('animationend', replace, true);
		};
	}, [spot]);

	if (!spot || spot.overlay || !placement) {
		return null;
	}

	return createPortal(
		<div className="cat-mount" style={{ left: placement.left, top: placement.top, width: placement.w, height: placement.h }}>
			<HarborCat pose={spot.pose} context={spot.context} bubbleSide={placement.side} />
		</div>,
		document.body,
	);
}

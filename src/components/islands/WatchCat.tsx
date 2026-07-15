// The watch panel's perch: the cat straddles the header gap between the
// kicker and the dateline, but only when the page's one-cat pick lands on
// hello.watch. That spot is anchorless in the catalog, so the director stands
// down and this mount owns the render, the same handoff the overlay islands
// use; its lines come from the watch record, not a built-in context set.
// bubbleSide is forced left like the mock: the dateline sits to the right.
import { useEffect, useState } from 'react';
import HarborCat from './HarborCat';
import { pageCatPick, type CatSpot } from '../../lib/catSpots';
import type { FigureheadDesign } from '../../lib/api';
import './WatchCat.css';

interface Props {
	quips:       string[];
	catPages?:   Record<string, boolean>;
	catSpots?:   Record<string, boolean>;
	catDesigns?: FigureheadDesign[];
}

export default function WatchCat({ quips, catPages, catSpots, catDesigns }: Props) {
	// The pick only exists after mount: it's a per-page-view client decision
	// (a fresh load can move the cat), so the build must not freeze one
	// build-time pick into the static HTML for every visitor.
	const [pick, setPick] = useState<CatSpot | null>(null);
	useEffect(() => {
		setPick(pageCatPick('hello', catPages, catSpots));
	}, []);

	if (pick?.id !== 'hello.watch') {
		return null;
	}

	return (
		<div className="cat-mount watch-cat-mount">
			<HarborCat pose="perched" context="watch" bubbleSide="left" quips={quips} designs={catDesigns} />
		</div>
	);
}

// The watch panel's perch: the cat straddles the header gap between the
// kicker and the dateline, but only when the page's one-cat pick lands on
// hello.watch. That spot is anchorless in the catalog, so the director stands
// down and this mount owns the render, the same handoff the overlay islands
// use; its lines come from the watch record, not a built-in context set.
// bubbleSide is forced left like the mock: the dateline sits to the right.
//
// The Gull Post finale rides along here too: ten pokes deliver the finale
// line, then the page phases to paper (a fixed cream wash, the mock's
// gazettePhase) before navigating to /gazette. Reduced motion never sets an
// inline opacity of its own, so the kill-switch's animation:none leaves the
// wash at its default full opacity rather than stuck invisible.
import { useEffect, useState } from 'react';
import HarborCat from './HarborCat';
import { pageCatPick, type CatSpot } from '../../lib/catSpots';
import type { FigureheadDesign } from '../../lib/api';
import './WatchCat.css';

const GULL_FINALE = 'EXTRA! EXTRA! cat poked ten times, refuses to comment. full story in the Gull Post. hold still.';

// The phase wash holds a beat before the navigation actually fires, so the
// visitor sees the page start to turn to paper rather than a hard cut.
const GAZETTE_DELAY_MS = 1000;

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

	const [gazette, setGazette] = useState(false);
	useEffect(() => {
		if (!gazette) {
			return;
		}
		const timer = window.setTimeout(() => { window.location.href = '/gazette'; }, GAZETTE_DELAY_MS);
		return () => window.clearTimeout(timer);
	}, [gazette]);

	if (pick?.id !== 'hello.watch') {
		return null;
	}

	return (
		<>
			<div className="cat-mount watch-cat-mount">
				<HarborCat pose="perched" context="watch" bubbleSide="left" quips={quips} designs={catDesigns} finale={GULL_FINALE} onFinale={() => setGazette(true)} />
			</div>
			{gazette && (
				<div className="watch-cat__gazette-phase">
					<span className="watch-cat__gazette-line">the morning edition · inbound by gull</span>
				</div>
			)}
		</>
	);
}

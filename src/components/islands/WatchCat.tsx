// The watch panel's perch: the cat straddles the header gap between the
// kicker and the dateline, but only when the page's one-cat pick lands on
// hello.watch. That spot is anchorless in the catalog, so the director stands
// down and this mount owns the render, the same handoff the overlay islands
// use; its lines come from the watch record, not a built-in context set.
// bubbleSide is forced left like the mock: the dateline sits to the right.
//
// The Gull Post finale used to ride along here too (ten pokes, the finale
// line, a phase to paper before navigating to /gazette): retired by operator
// ruling 2026-07-21 (caravan-meta docs/argsea-identity.md: "the Gull Post has
// one door: the roosting gull; the cat's ten-poke finale retired"). The
// finale prop below defaults off so a poke here only ever pops a quip; the
// wiring stays (HarborCat's finale/onFinale are a shared mechanism, not this
// component's to delete) in case some other surface still wants it.
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
	finale?:     boolean; // retired 2026-07-21; off unless a caller opts back in
}

export default function WatchCat({ quips, catPages, catSpots, catDesigns, finale = false }: Props) {
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
				<HarborCat pose="perched" context="watch" bubbleSide="left" quips={quips} designs={catDesigns} finale={finale ? GULL_FINALE : undefined} onFinale={finale ? () => setGazette(true) : undefined} />
			</div>
			{finale && gazette && (
				<div className="watch-cat__gazette-phase">
					<span className="watch-cat__gazette-line">the morning edition · inbound by gull</span>
				</div>
			)}
		</>
	);
}

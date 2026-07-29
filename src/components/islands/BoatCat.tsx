// The tug's own passenger: the cat rides the sea footer's crossing boat, but
// only when the page's one-cat pick lands on hello.boat. Anchorless in the
// catalog like hello.watch, so the director stands down and this mount owns
// the render; unlike the watch, it is anchorless out of necessity as well as
// symmetry, because the tug crosses on a 110s infinite transform that never
// fires animationend for a measured anchor to re-read. Being a DOM child of
// the crossing is the only way the cat stays on the boat.
//
// Its lines are the mock's own (design/Hello.dc.html), transcribed here the
// way ShipsLog's BEARING_QUIPS are: three fixed asides with no wire field
// behind them and no keeper surface asking for one.
import { useEffect, useState } from 'react';
import HarborCat from './HarborCat';
import { pageCatPick, type CatSpot } from '../../lib/catSpots';
import type { FigureheadDesign } from '../../lib/api';
import './BoatCat.css';

const BOAT_QUIPS = [
	"surf's fine.",
	'i am the figurehead.',
	'do not tell the lighthouse.',
];

interface Props {
	catPages?:   Record<string, boolean>;
	catSpots?:   Record<string, boolean>;
	catDesigns?: FigureheadDesign[];
}

export default function BoatCat({ catPages, catSpots, catDesigns }: Props) {
	// The pick only exists after mount, same reason as the watch's: a fresh
	// load can move the cat, so no build-time pick gets frozen into the HTML.
	const [pick, setPick] = useState<CatSpot | null>(null);
	useEffect(() => {
		setPick(pageCatPick('hello', catPages, catSpots));
	}, []);

	if (pick?.id !== 'hello.boat') {
		return null;
	}

	return (
		<div className="cat-mount boat-cat-mount">
			<HarborCat pose="perched" context="chart" quips={BOAT_QUIPS} designs={catDesigns} />
		</div>
	);
}

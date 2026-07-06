// The light list — the 404 placard's "last position" is the real coordinates
// of a real lighthouse, one random pick per wreck. Clicking flips the line in
// place to the light's name and its one-liner; clicking again flips back.
// The 404 page only mounts this when the egg is on and the list is non-empty.
import { useEffect, useState } from 'react';
import type { Lighthouse } from '../../lib/api';
import './LightList.css';

interface Props {
	lighthouses: Lighthouse[];
}

export default function LightList({ lighthouses }: Props) {
	const [pick, setPick] = useState(0);
	const [revealed, setRevealed] = useState(false);

	// The wreck picks its light after hydration: a random pick during render
	// would mismatch the server-rendered HTML
	useEffect(() => {
		setPick(Math.floor(Math.random() * lighthouses.length));
	}, [lighthouses.length]);

	const light = lighthouses[pick];

	return (
		<span
			className="light-list"
			title="that position looks... charted"
			role="button"
			tabIndex={0}
			onClick={() => setRevealed(!revealed)}
			onKeyDown={(event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					setRevealed(!revealed);
				}
			}}
		>
			{revealed ? `${light.name} — ${light.line}` : `last position: ${light.pos}`}
		</span>
	);
}

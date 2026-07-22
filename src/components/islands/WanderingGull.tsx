// The wandering gull: the gazette door away from home, mounted on projects/
// hobbies/notes via BaseLayout's `gull` prop (the pattern nightWatch used).
// One in four page loads, after a 12-30s delay it glides in and roosts at the
// right margin until the visitor navigates away. Reuses home's own
// .gull-mark bird markup (index.astro); the roost/hover behavior here is this
// island's own, since home's gull already has its own script.
import { useEffect, useState } from 'react';
import './WanderingGull.css';

export default function WanderingGull() {
	const [roosted, setRoosted] = useState(false);

	useEffect(() => {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
			return;
		}
		// the keeper's binoculars: force an immediate roost for testing
		if (location.hash === '#gull') {
			setRoosted(true);
			return;
		}
		if (Math.random() >= 0.25) {
			return;
		}
		const timer = setTimeout(() => setRoosted(true), 12000 + Math.random() * 18000);
		return () => clearTimeout(timer);
	}, []);

	if (!roosted) {
		return null;
	}

	return (
		<a className="wandering-gull" href="/gazette" aria-label="a passing gull with news" title="the gull post">
			<svg width="38" height="26" viewBox="0 0 38 26" fill="none" aria-hidden="true">
				<path d="M3 14 Q10 6 19 12 Q28 6 35 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
				<path d="M14 20 q5 -3 10 0" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity=".5" fill="none" />
			</svg>
		</a>
	);
}

// The "next: ???" chip; clicking cycles through suggestions and loops. Values
// come from the API via the page's frontmatter (islands don't fetch); an
// empty list just shows the "???" default. variant swaps the visual only:
// 'pill' is the Hobbies page's own look, 'round' is the home chart strip's
// smaller uppercase pill, sea room held for the next hobby (the headstone
// variant retired with the graveyard motif).
import { useState } from 'react';
import './NextHobbyChip.css';

interface NextHobbyChipProps {
	values:   string[];
	variant?: 'pill' | 'round';
}

export default function NextHobbyChip({ values, variant = 'pill' }: NextHobbyChipProps) {
	const suggestions = ['???', ...values];
	const [index, setIndex] = useState(0);

	return (
		<button
			className={variant === 'round' ? 'next-chip next-chip--round' : 'next-chip'}
			title={variant === 'round' ? 'sea room held for the next hobby' : undefined}
			onClick={() => setIndex((previous) => (previous + 1) % suggestions.length)}
		>
			next: {suggestions[index]}
		</button>
	);
}

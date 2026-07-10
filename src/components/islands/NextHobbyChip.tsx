// The "next: ???" chip; clicking cycles through suggestions and loops. Values
// come from the API via the page's frontmatter (islands don't fetch); an
// empty list just shows the "???" default. variant swaps the visual only:
// 'pill' is the Hobbies page's own look, 'headstone' is the home graveyard's
// dashed empty headstone (design: the lights-polish pass).
import { useState } from 'react';
import './NextHobbyChip.css';

interface NextHobbyChipProps {
	values:   string[];
	variant?: 'pill' | 'headstone';
}

export default function NextHobbyChip({ values, variant = 'pill' }: NextHobbyChipProps) {
	const suggestions = ['???', ...values];
	const [index, setIndex] = useState(0);

	return (
		<button
			className={variant === 'headstone' ? 'next-chip next-chip--headstone' : 'next-chip'}
			title={variant === 'headstone' ? 'pre-dug, awaiting the next hobby' : undefined}
			onClick={() => setIndex((previous) => (previous + 1) % suggestions.length)}
		>
			next: {suggestions[index]}
		</button>
	);
}

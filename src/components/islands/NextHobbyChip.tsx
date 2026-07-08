// The "next: ???" chip on the Hobbies page; clicking cycles through
// suggestions and loops. Values come from the API via the page's frontmatter
// (islands don't fetch); an empty list just shows the "???" default.
import { useState } from 'react';
import './NextHobbyChip.css';

interface NextHobbyChipProps {
	values: string[];
}

export default function NextHobbyChip({ values }: NextHobbyChipProps) {
	const suggestions = ['???', ...values];
	const [index, setIndex] = useState(0);

	return (
		<button
			className="next-chip"
			onClick={() => setIndex((previous) => (previous + 1) % suggestions.length)}
		>
			next: {suggestions[index]}
		</button>
	);
}

// The "next: ???" chip on the Hobbies page — clicking cycles through
// suggestions and loops. Pure whimsy, deliberately not API data.
import { useState } from 'react';
import './NextHobbyChip.css';

const SUGGESTIONS = [
	'???',
	'blacksmithing?',
	'sourdough?',
	'birdwatching?',
	'3d printing?',
	'kayaking?',
	'chess?',
	'fermenting things?',
	'ham radio?',
	'no. surely not.',
];

export default function NextHobbyChip() {
	const [index, setIndex] = useState(0);

	return (
		<button
			className="next-chip"
			onClick={() => setIndex((previous) => (previous + 1) % SUGGESTIONS.length)}
		>
			next: {SUGGESTIONS[index]}
		</button>
	);
}

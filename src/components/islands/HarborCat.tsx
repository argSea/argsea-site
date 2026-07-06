// The harbor cat — the lighthouse's resident, out on its rounds. It perches on
// the postcard and letter overlays and heckles the wreck from the 404 placard;
// each poke gets a context-specific quip in a speech bubble that dismisses
// itself. The host positions it via the context modifier class.
import { useEffect, useRef, useState } from 'react';
import './HarborCat.css';

export type CatContext = 'postcard' | 'note' | 'wreck';

// One quip set per perch (approved copy). A poke never repeats the quip
// currently on screen.
const QUIPS: Record<CatContext, string[]> = {
	postcard: ['mrrp.', 'i sat on this one first.', 'read it to me.', 'this postcard is mine now.', 'i approve. mostly.', 'the stamp tastes fine.', 'you opened it, i inspected it.'],
	note:     ['mrrp.', 'i walked across the keyboard during this one.', 'typo on line two. i left it.', 'read it to me.', 'i supervised this draft.', 'nap first. then read.', 'i have read it. no comment.'],
	wreck:    ['told you to turn left.', 'i would not have hit that.', 'a cat never runs aground.', 'nice parking, captain.', 'i saw the rocks. did you?', 'this is why i steer.', 'should have asked the cat.'],
};

/**
 * One roll per overlay open — design ruling: the cat shows on roughly 1 in 3
 * opens, so it stays a discovery instead of furniture. (The 404 skips the
 * roll; the wreck always has an audience.)
 */
export function catComesAboard(): boolean {
	return Math.random() < 1 / 3;
}

interface Props {
	context: CatContext;
}

export default function HarborCat({ context }: Props) {
	const [say, setSay] = useState<string | null>(null);
	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	useEffect(() => () => clearTimeout(timer.current), []);

	const poke = () => {
		clearTimeout(timer.current);
		const pool = QUIPS[context].filter((quip) => quip !== say);
		setSay(pool[Math.floor(Math.random() * pool.length)]);
		timer.current = setTimeout(() => setSay(null), 2600);
	};

	return (
		<div className={`harbor-cat harbor-cat--${context}`}>
			{/* keyed by quip so a re-poke restarts the pop-in */}
			{say && <div key={say} className="harbor-cat__bubble">{say}</div>}
			<svg
				className="harbor-cat__svg"
				viewBox="0 0 64 74"
				fill="none"
				role="button"
				tabIndex={0}
				aria-label="the harbor cat"
				onClick={poke}
				onKeyDown={(event) => {
					if (event.key === 'Enter' || event.key === ' ') {
						event.preventDefault();
						poke();
					}
				}}
			>
				{/* draped tail, swaying */}
				<path className="harbor-cat__tail" d="M45 55 C57 52 61 62 56 70 C54.5 72.5 51 72.5 50 70 C52.5 64.5 50 60 43 60 Z" fill="#232a4d" stroke="#93a0e8" strokeWidth="1.4" strokeLinejoin="round" />
				{/* front paws resting on the edge */}
				<ellipse cx="26" cy="52.5" rx="4.4" ry="3.2" fill="#232a4d" stroke="#93a0e8" strokeWidth="1.3" />
				<ellipse cx="37.5" cy="52.5" rx="4.4" ry="3.2" fill="#232a4d" stroke="#93a0e8" strokeWidth="1.3" />
				{/* body + head + ears */}
				<path d="M12.95 51.8 C9.25 40.7 13.9 29.6 22.2 25.9 L21.3 15.7 L27.4 21.8 L33.7 21.8 L39.8 15.7 L38.85 25.9 C47.2 29.6 51.8 40.7 48.1 51.8 Z" fill="#232a4d" stroke="#93a0e8" strokeWidth="1.6" strokeLinejoin="round" />
				{/* inner ears */}
				<path d="M22.7 18.2 L25.6 21.6 L22.2 21.6 Z" fill="#f0d9a8" opacity=".5" />
				<path d="M38.3 18.2 L38.8 21.6 L35.4 21.6 Z" fill="#f0d9a8" opacity=".5" />
				{/* eyes */}
				<g className="harbor-cat__eyes">
					<circle cx="25.9" cy="30.8" r="1.9" fill="#f0d9a8" />
					<circle cx="35.2" cy="30.8" r="1.9" fill="#f0d9a8" />
				</g>
				{/* nose + mouth */}
				<path d="M29.4 35 L32.2 35 L30.8 36.6 Z" fill="#f0d9a8" />
				<path d="M30.8 36.6 v1.4 M30.8 38 q-2 1.4 -3.6 .4 M30.8 38 q2 1.4 3.6 .4" stroke="#5f6ec4" strokeWidth="1" fill="none" strokeLinecap="round" />
				{/* whiskers */}
				<path d="M22 33 l-7 -1.4 M22 35.4 l-7 1 M39.5 33 l7 -1.4 M39.5 35.4 l7 1" stroke="#5f6ec4" strokeWidth="0.9" strokeLinecap="round" opacity=".7" />
			</svg>
		</div>
	);
}

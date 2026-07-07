// The harbor cat — the lighthouse's resident, out on its rounds across the spot
// catalog. Two poses: perched (front paws on an edge) and lying (loafed along a
// horizontal element, the current page's nav link). It's a pure sprite — the
// host (the director's mount or an overlay) positions it; the cat only knows
// its pose, its quip context, and which way to open its speech bubble. Each
// poke pops a context-specific quip that dismisses itself.
import { useEffect, useRef, useState } from 'react';
import type { CatContext, CatPose } from '../../lib/catSpots';
import './HarborCat.css';

export type { CatContext } from '../../lib/catSpots';

// One quip set per context (approved copy from HarborCat.dc.html); a poke never
// repeats the quip currently on screen. An unknown context falls back to the
// roaming header set.
const QUIPS: Record<CatContext, string[]> = {
	postcard:  ['mrrp.', 'i sat on this one first.', 'read it to me.', 'this postcard is mine now.', 'i approve. mostly.', 'the stamp tastes fine.', 'you opened it, i inspected it.'],
	note:      ['mrrp.', 'i walked across the keyboard during this one.', 'typo on line two. i left it.', 'read it to me.', 'i supervised this draft.', 'nap first. then read.', 'i have read it. no comment.'],
	wreck:     ['told you to turn left.', 'i would not have hit that.', 'a cat never runs aground.', 'nice parking, captain.', 'i saw the rocks. did you?', 'this is why i steer.', 'should have asked the cat.'],
	header:    ['mrrp.', 'this is my page now.', 'you may look. briefly.', 'i live up here.', 'the lighthouse sent me.', 'mind the tail.'],
	hero:      ['mrrp.', 'yes, that is the guy.', 'he does keep the lights on. i supervise.', 'hire him. i vouch. mostly.', 'the boxes-and-arrows are mine.'],
	manifest:  ['mrrp.', 'you forgot to list me.', 'i am also a tool. currently aboard.', 'inventory looks fine. i counted.', 'the queue is mine now.'],
	graveyard: ['mrrp.', 'good hobbies. all dead.', 'the graveyard is warm. i checked.', 'nothing here is resting harder than me.', 'i outlasted the piano.'],
	contact:   ['mrrp.', 'say hi. or do not. i will know.', 'he answers email. i answer to no one.', 'the light is on.'],
	card:      ['mrrp.', 'i sat on this one first.', 'this one shipped. i was there.', 'good project. mine now.', 'i approve. mostly.'],
	tag:       ['mrrp.', 'good filter. i agree.', 'this is the tag that survives.', 'sorted. by me.', 'tinkering is a lifestyle.'],
	row:       ['mrrp.', 'read it to me.', 'i supervised this one.', 'typo on line two. i left it.', 'nap first. then read.'],
	next:      ['mrrp.', 'do not pick up another one.', 'blacksmithing? absolutely not.', 'the next hobby is napping. trust me.', 'i am the only hobby you need.'],
};

interface Props {
	pose:        CatPose;
	context:     CatContext;
	bubbleSide?: 'left' | 'right';  // which way the quip opens; hosts near an edge open it inward
}

export default function HarborCat({ pose, context, bubbleSide = 'right' }: Props) {
	const [say, setSay] = useState<string | null>(null);
	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	useEffect(() => () => clearTimeout(timer.current), []);

	const poke = () => {
		clearTimeout(timer.current);
		const set = QUIPS[context] ?? QUIPS.header;
		const pool = set.filter((quip) => quip !== say);
		setSay(pool[Math.floor(Math.random() * pool.length)]);
		timer.current = setTimeout(() => setSay(null), 2600);
	};

	const onKeyDown = (event: React.KeyboardEvent) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			poke();
		}
	};

	return (
		<div className={`harbor-cat harbor-cat--${pose} harbor-cat--${context}${bubbleSide === 'left' ? ' harbor-cat--bubble-left' : ''}`}>
			{/* keyed by quip so a re-poke restarts the pop-in */}
			{say && <div key={say} className="harbor-cat__bubble">{say}</div>}
			{pose === 'lying' ? (
				<svg
					className="harbor-cat__svg"
					viewBox="0 0 96 48"
					fill="none"
					role="button"
					tabIndex={0}
					aria-label="the harbor cat"
					onClick={poke}
					onKeyDown={onKeyDown}
				>
					{/* tail draping off the rump, gentle drape sway */}
					<path className="harbor-cat__tail" d="M74 36 C86 30 92 39 86 45 C83.5 47.5 80 47 80.5 43.5 C83 39 79 37 73 40 Z" fill="#232a4d" stroke="#93a0e8" strokeWidth="1.4" strokeLinejoin="round" />
					{/* front paws forward */}
					<ellipse cx="18" cy="41" rx="4" ry="2.8" fill="#232a4d" stroke="#93a0e8" strokeWidth="1.3" />
					<ellipse cx="26" cy="41" rx="4" ry="2.8" fill="#232a4d" stroke="#93a0e8" strokeWidth="1.3" />
					{/* body loaf + head + ears */}
					<path d="M12 41 C6 34 7 24 15 20 L14.5 17 L14 7 L20 14 L25 14 L30 7 L31 18 C40 21 44 18 54 19 C70 20 79 25 80 33 C81 39 77 41 71 41 Z" fill="#232a4d" stroke="#93a0e8" strokeWidth="1.6" strokeLinejoin="round" />
					{/* inner ears */}
					<path d="M15 15 L15 9 L19 13 Z" fill="#f0d9a8" opacity=".5" />
					<path d="M29 15 L29.5 9 L25.5 13 Z" fill="#f0d9a8" opacity=".5" />
					{/* eyes */}
					<g className="harbor-cat__eyes harbor-cat__eyes--lying">
						<circle cx="18.5" cy="25" r="1.9" fill="#f0d9a8" />
						<circle cx="26" cy="25" r="1.9" fill="#f0d9a8" />
					</g>
					{/* nose + mouth */}
					<path d="M20.8 28.6 L23.6 28.6 L22.2 30.2 Z" fill="#f0d9a8" />
					<path d="M22.2 30.2 v1.4 M22.2 31.6 q-2 1.4 -3.6 .4 M22.2 31.6 q2 1.4 3.6 .4" stroke="#5f6ec4" strokeWidth="1" fill="none" strokeLinecap="round" />
					{/* whiskers */}
					<path d="M14 27 l-7 -1.2 M14 29 l-7 .8 M30 27 l7 -1.2 M30 29 l7 .8" stroke="#5f6ec4" strokeWidth="0.9" strokeLinecap="round" opacity=".7" />
				</svg>
			) : (
				<svg
					className="harbor-cat__svg"
					viewBox="0 0 64 74"
					fill="none"
					role="button"
					tabIndex={0}
					aria-label="the harbor cat"
					onClick={poke}
					onKeyDown={onKeyDown}
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
			)}
		</div>
	);
}

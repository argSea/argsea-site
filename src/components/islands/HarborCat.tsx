// The harbor cat: the lighthouse's resident, out on its rounds across the spot
// catalog. Two poses: perched (front paws on an edge) and lying (loafed along a
// horizontal element, the current page's nav link). It's a pure sprite: the
// host (the director's mount or an overlay) positions it; the cat only knows
// its pose, its quip context, and which way to open its speech bubble. Each
// poke pops a context-specific quip that dismisses itself.
import { useEffect, useRef, useState } from 'react';
import type { CatContext, CatPose } from '../../lib/catSpots';
import type { FigureheadDesign, FigureheadShape } from '../../lib/api';
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
	bubbleSide?: 'left' | 'right';         // which way the quip opens; hosts near an edge open it inward
	designs?:    FigureheadDesign[];       // published figurehead designs; the pose's design replaces its built-in SVG
}

// The animation transform-origin a shape carries, as an inline style; it wins
// over the pose classes' CSS origins, so a design can move the pivot.
const originStyle = (origin?: [number, number]) =>
	origin ? { transformOrigin: `${origin[0]}px ${origin[1]}px` } : undefined;

// One stored shape → its SVG element. Only the fields present on the shape are
// written (absent = the SVG attribute default); there is no stored markup to
// render, ever: shapes only, per the figurehead contract.
function shapeElement(shape: FigureheadShape, className?: string) {
	const presentation = {
		className,
		style:           originStyle(shape.origin),
		fill:            shape.fill,
		stroke:          shape.stroke,
		strokeWidth:     shape.strokeWidth,
		opacity:         shape.opacity,
		strokeLinecap:   shape.linecap as React.SVGAttributes<SVGElement>['strokeLinecap'],
		strokeLinejoin:  shape.linejoin as React.SVGAttributes<SVGElement>['strokeLinejoin'],
	};
	switch (shape.type) {
		case 'path':    return <path key={shape.id} d={shape.d} {...presentation} />;
		case 'ellipse': return <ellipse key={shape.id} cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} {...presentation} />;
		case 'rect':    return <rect key={shape.id} x={shape.x} y={shape.y} width={shape.w} height={shape.h} {...presentation} />;
		case 'line':    return <line key={shape.id} x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} {...presentation} />;
	}
}

// A design's shapes in stored (paint) order, with the roles driving the
// canonical animations: tail shapes wear the pose's sway/drape class, eye
// shapes gather into one blink group like the built-in <g> (a shared pivot,
// emitted where the first eye sits so stacking is preserved), and everything
// else (untagged or role "body") stays static.
function designShapes(shapes: FigureheadShape[]) {
	const eyes = shapes.filter((shape) => shape.role === 'eyes');
	return shapes.map((shape) => {
		if (shape.role === 'eyes') {
			return shape === eyes[0]
				? (
					<g key="eyes" className="harbor-cat__eyes" style={originStyle(eyes.find((eye) => eye.origin)?.origin)}>
						{eyes.map((eye) => shapeElement(eye))}
					</g>
				)
				: null;
		}
		return shapeElement(shape, shape.role === 'tail' ? 'harbor-cat__tail' : undefined);
	});
}

export default function HarborCat({ pose, context, bubbleSide = 'right', designs }: Props) {
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

	// A published design for this pose replaces the built-in SVG; an empty shape
	// list would draw nothing, so it falls back rather than vanish the cat.
	const design = designs?.find((candidate) => candidate.pose === pose && candidate.shapes.length > 0) ?? null;

	return (
		<div className={`harbor-cat harbor-cat--${pose} harbor-cat--${context}${bubbleSide === 'left' ? ' harbor-cat--bubble-left' : ''}`}>
			{/* keyed by quip so a re-poke restarts the pop-in */}
			{say && <div key={say} className="harbor-cat__bubble">{say}</div>}
			{design ? (
				<svg
					className="harbor-cat__svg"
					viewBox={design.viewBox}
					fill="none"
					role="button"
					tabIndex={0}
					aria-label="the harbor cat"
					data-figurehead={design.id}
					onClick={poke}
					onKeyDown={onKeyDown}
				>
					{designShapes(design.shapes)}
				</svg>
			) : pose === 'lying' ? (
				<svg
					className="harbor-cat__svg"
					viewBox="0 0 100 48"
					fill="none"
					role="button"
					tabIndex={0}
					aria-label="the harbor cat"
					onClick={poke}
					onKeyDown={onKeyDown}
				>
					{/* tail draping off the rump, gentle drape sway */}
					<path className="harbor-cat__tail" d="M72 38 C85 33 91 41 86 46.5 C84 49 80.2 48.4 80.8 45.2 C83 41.4 78.6 39.6 72.6 42.4 Z" fill="#232a4d" stroke="#93a0e8" strokeWidth="1.4" strokeLinejoin="round" />
					{/* front paws stretched forward */}
					<ellipse cx="10.5" cy="42.6" rx="4.6" ry="2.7" fill="#232a4d" stroke="#93a0e8" strokeWidth="1.3" />
					<ellipse cx="18.5" cy="42.9" rx="4.4" ry="2.6" fill="#232a4d" stroke="#93a0e8" strokeWidth="1.3" />
					{/* body sprawl + head + ears */}
					<path d="M13.5 44 C8.5 39 9 30 13 25 L12.8 22 L12.4 10 L18.6 17 L24.5 17 L30 10 L30.5 22 C35.5 25 38.5 27 44.5 28.5 C56 25.5 69 26.5 77.5 32.5 C83.5 36.8 83 42 76 44 Z" fill="#232a4d" stroke="#93a0e8" strokeWidth="1.6" strokeLinejoin="round" />
					{/* hind paw peeking out under the hip */}
					<ellipse cx="68" cy="43.2" rx="5" ry="2.4" fill="#232a4d" stroke="#93a0e8" strokeWidth="1.2" />
					{/* inner ears */}
					<path d="M13.7 16 L13.5 11.5 L17 15 Z" fill="#f0d9a8" opacity=".5" />
					<path d="M29 16 L29.4 11.5 L26 15 Z" fill="#f0d9a8" opacity=".5" />
					{/* eyes */}
					<g className="harbor-cat__eyes harbor-cat__eyes--lying">
						<circle cx="17.8" cy="26.8" r="1.9" fill="#f0d9a8" />
						<circle cx="26" cy="26.8" r="1.9" fill="#f0d9a8" />
					</g>
					{/* nose + mouth */}
					<path d="M20.6 30.4 L23.4 30.4 L22 32 Z" fill="#f0d9a8" />
					<path d="M22 32 v1.3 M22 33.3 q-2 1.4 -3.6 .4 M22 33.3 q2 1.4 3.6 .4" stroke="#5f6ec4" strokeWidth="1" fill="none" strokeLinecap="round" />
					{/* whiskers */}
					<path d="M12.6 29 l-7 -1.3 M12.6 31.2 l-7 .9 M30.5 29 l7 -1.3 M30.5 31.2 l7 .9" stroke="#5f6ec4" strokeWidth="0.9" strokeLinecap="round" opacity=".7" />
					{/* chest stripe hint */}
					<path d="M15.8 36 q3 1.6 6.4 .6" stroke="#5f6ec4" strokeWidth="0.9" strokeLinecap="round" fill="none" opacity=".45" />
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

// The crossing sailboat and its message-in-a-bottle egg. Poking the boat
// drops a bottle that bobs on the wave where the boat was, and a proverb note
// rises from it: tap to release, Escape, or a 9s tide takes it back. With no
// proverbs (egg off) the boat just sails and isn't clickable; the homepage
// then renders this without a client directive, so no JS ships.
import { useEffect, useRef, useState } from 'react';
import { useEscapeKey } from './useEscapeKey';
import './BottleBoat.css';

interface Bottle {
	x:       number;
	proverb: string;
	key:     number;
}

interface Props {
	proverbs: string[];
}

export default function BottleBoat({ proverbs }: Props) {
	const [bottle, setBottle] = useState<Bottle | null>(null);
	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	const dismiss = () => {
		clearTimeout(timer.current);
		setBottle(null);
	};
	useEscapeKey(bottle !== null, dismiss);
	useEffect(() => () => clearTimeout(timer.current), []);

	const drop = (event: React.MouseEvent | React.KeyboardEvent) => {
		const boat = event.currentTarget as HTMLElement;
		const strip = boat.closest('[data-wave]');
		if (!strip) {
			return;
		}
		// The bottle lands where the boat is right now, clamped so the note
		// that rises from it stays on screen
		let x = boat.getBoundingClientRect().left - strip.getBoundingClientRect().left + 4;
		x = Math.max(120, Math.min(x, strip.clientWidth - 120));
		const pool = proverbs.length > 1 ? proverbs.filter((proverb) => proverb !== bottle?.proverb) : proverbs;
		clearTimeout(timer.current);
		setBottle({ x, proverb: pool[Math.floor(Math.random() * pool.length)], key: Date.now() });
		timer.current = setTimeout(() => setBottle(null), 9000);
	};

	const pokeable = proverbs.length > 0;

	return (
		<>
			<div
				className={`boat-track${pokeable ? ' boat-track--pokeable' : ''}`}
				title="a little boat, out on a delivery"
				{...(pokeable && {
					role: 'button',
					tabIndex: 0,
					onClick: drop,
					onKeyDown: (event: React.KeyboardEvent) => {
						if (event.key === 'Enter' || event.key === ' ') {
							event.preventDefault();
							drop(event);
						}
					},
				})}
			>
				<div className="boat-wake" />
				<svg className="boat" width="30" height="24" viewBox="0 0 30 24" fill="none">
					<path d="M4 15 L26 15 L21 22 L9 22 Z" fill="#93a0e8" />
					<path d="M15 15 V3" stroke="#5f6ec4" strokeWidth="1.5" />
					<path d="M15 3 L24 13 L15 13 Z" fill="#f0d9a8" />
				</svg>
			</div>

			{bottle && (
				// keyed per poke so the splash and note-rise replay
				<div key={bottle.key} className="bottle-drop" style={{ left: `${bottle.x}px` }}>
					<div className="bottle-drop__splash" />
					<div
						className="bottle-note"
						role="button"
						tabIndex={0}
						onClick={dismiss}
						onKeyDown={(event) => {
							if (event.key === 'Enter' || event.key === ' ') {
								event.preventDefault();
								dismiss();
							}
						}}
					>
						<div className="bottle-note__paper">
							<div className="bottle-note__kicker">washed ashore</div>
							<div className="bottle-note__proverb">{bottle.proverb}</div>
							<div className="bottle-note__foot">
								<span>- the sea</span>
								<span className="bottle-note__hint">tap to release ✕</span>
							</div>
							<div className="bottle-note__nib" />
						</div>
					</div>
					<svg className="bottle" width="32" height="20" viewBox="0 0 40 24" fill="none">
						<rect x="6" y="7" width="28" height="11" rx="5.5" fill="rgba(147,160,232,.22)" stroke="#93a0e8" strokeWidth="1.3" />
						<rect x="33" y="9.5" width="5" height="6" rx="1.2" fill="#f0d9a8" />
						<path d="M12 10 h14 M12 12.5 h11 M12 15 h13" stroke="#f0d9a8" strokeWidth="1" strokeLinecap="round" opacity=".85" />
					</svg>
				</div>
			)}
		</>
	);
}

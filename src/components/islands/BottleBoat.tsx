// The crossing sailboat and its message-in-a-bottle egg. Poking the boat
// drops a bottle that bobs on the wave where the boat was, and a proverb note
// rises from it: tap to release, Escape, or a 9s tide takes it back. With no
// proverbs (egg off) the boat just sails and isn't clickable; the homepage
// then renders this without a client directive, so no JS ships. boat/bottle/
// wakeSvg are carving markup resolved build-time by WaveDivider.astro (this
// is an island, so it can't reach src/lib/api.ts itself); null renders the
// built-in exactly as before.
//
// `auto`: the sea footer's own bottles (design/Hello.dc.html's initBottles),
// adapted minimally rather than duplicated. The tug's boat is the page's own
// link to /helm, so in this mode the poke boat never renders; instead the
// sea sends bottles on its own schedule (18-40s apart, reduced motion or an
// emptied proverb list means none ever drift), each with its own life: a 74s
// tide takes an unopened one, opening one holds it 12s, tapping the note lets
// it go early. Several can drift at once, unlike the single poked bottle.
import { useEffect, useRef, useState } from 'react';
import { useEscapeKey } from './useEscapeKey';
import { svgBackground } from '../../lib/carvings';
import { sightBottle } from '../../lib/sightings';
import BoltedSvg from './BoltedSvg';
import './BottleBoat.css';

interface Bottle {
	x:       number;
	proverb: string;
	key:     number;
}

interface AutoBottle {
	id:      number;
	proverb: string;
	bottom:  number; // px
	dur:     number; // seconds, the crossing's own drift duration
	open:    boolean;
}

interface Props {
	proverbs: string[];
	boatSvg?:   string | null;
	bottleSvg?: string | null;
	wakeSvg?:   string | null;
	auto?:      boolean;
}

export default function BottleBoat({ proverbs, boatSvg = null, bottleSvg = null, wakeSvg = null, auto = false }: Props) {
	const [bottle, setBottle] = useState<Bottle | null>(null);
	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	const dismiss = () => {
		clearTimeout(timer.current);
		setBottle(null);
	};
	useEscapeKey(bottle !== null, dismiss);
	useEffect(() => () => clearTimeout(timer.current), []);

	const [autoBottles, setAutoBottles] = useState<AutoBottle[]>([]);
	const autoTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

	const dismissAuto = (id: number) => {
		clearTimeout(autoTimers.current.get(id));
		autoTimers.current.delete(id);
		setAutoBottles((current) => current.filter((b) => b.id !== id));
	};

	const openAuto = (id: number) => {
		setAutoBottles((current) => current.map((b) => (b.id === id ? { ...b, open: true } : b)));
		clearTimeout(autoTimers.current.get(id));
		autoTimers.current.set(id, setTimeout(() => dismissAuto(id), 12000));
	};

	// The poked note's own Escape is scoped to it; the sea's own bottles get a
	// second listener so Escape releases every open one at once
	useEscapeKey(autoBottles.some((b) => b.open), () => {
		autoBottles.forEach((b) => { if (b.open) dismissAuto(b.id); });
	});

	useEffect(() => {
		if (!auto || proverbs.length === 0 || matchMedia('(prefers-reduced-motion: reduce)').matches) {
			return;
		}
		let alive = true;
		let scheduled: ReturnType<typeof setTimeout>;
		let last: string | null = null;
		const pickProverb = () => {
			const pool = proverbs.length > 1 ? proverbs.filter((p) => p !== last) : proverbs;
			const proverb = pool[Math.floor(Math.random() * pool.length)];
			last = proverb;
			return proverb;
		};
		const schedule = () => { scheduled = setTimeout(drop, 18000 + Math.random() * 22000); };
		const drop = () => {
			if (!alive) {
				return;
			}
			if (document.hidden) {
				schedule();
				return;
			}
			const id = Date.now() + Math.random();
			sightBottle();
			setAutoBottles((current) => [...current, { id, proverb: pickProverb(), bottom: 34 + Math.random() * 26, dur: 40 + Math.random() * 30, open: false }]);
			autoTimers.current.set(id, setTimeout(() => dismissAuto(id), 74000));
			schedule();
		};
		scheduled = setTimeout(drop, 4000);
		return () => {
			alive = false;
			clearTimeout(scheduled);
			autoTimers.current.forEach((ttl) => clearTimeout(ttl));
			autoTimers.current.clear();
		};
		// proverbs is stable per page load (build-time copy); keying the effect on
		// it too would restart the schedule and drop the in-flight bottles
	}, [auto]);

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
		sightBottle();
		clearTimeout(timer.current);
		setBottle({ x, proverb: pool[Math.floor(Math.random() * pool.length)], key: Date.now() });
		timer.current = setTimeout(() => setBottle(null), 9000);
	};

	const pokeable = !auto && proverbs.length > 0;

	return (
		<>
			{!auto && (
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
					<div
						className="boat-wake"
						data-bolted={wakeSvg ? 'boat-wake' : undefined}
						style={wakeSvg ? { background: `${svgBackground(wakeSvg)} repeat-x` } : undefined}
					/>
					<BoltedSvg svg={boatSvg} spot="boat" className="boat" width={30} height={24} viewBox="0 0 30 24">
						<path d="M4 15 L26 15 L21 22 L9 22 Z" fill="#93a0e8" />
						<path d="M15 15 V3" stroke="#5f6ec4" strokeWidth="1.5" />
						<path d="M15 3 L24 13 L15 13 Z" fill="#f0d9a8" />
					</BoltedSvg>
				</div>
			)}

			{auto && autoBottles.map((b) => (
				<div
					key={b.id}
					className="bottle-drift"
					style={{ bottom: `${b.bottom}px`, animationDuration: `${b.dur}s`, animationPlayState: b.open ? 'paused' : 'running' }}
				>
					<div
						className="bottle-drift__glass-wrap"
						role="button"
						tabIndex={0}
						onClick={() => (b.open ? dismissAuto(b.id) : openAuto(b.id))}
						onKeyDown={(event) => {
							if (event.key === 'Enter' || event.key === ' ') {
								event.preventDefault();
								b.open ? dismissAuto(b.id) : openAuto(b.id);
							}
						}}
					>
						<BoltedSvg svg={bottleSvg} spot="bottle" className="bottle" width={32} height={20} viewBox="0 0 40 24" style={{ animationPlayState: b.open ? 'paused' : 'running' }}>
							<rect x="6" y="7" width="28" height="11" rx="5.5" fill="rgba(147,160,232,.22)" stroke="#93a0e8" strokeWidth="1.3" />
							<rect x="33" y="9.5" width="5" height="6" rx="1.2" fill="#f0d9a8" />
							<path d="M12 10 h14 M12 12.5 h11 M12 15 h13" stroke="#f0d9a8" strokeWidth="1" strokeLinecap="round" opacity=".85" />
						</BoltedSvg>
					</div>
					{b.open && (
						<div
							className="bottle-note"
							role="button"
							tabIndex={0}
							onClick={() => dismissAuto(b.id)}
							onKeyDown={(event) => {
								if (event.key === 'Enter' || event.key === ' ') {
									event.preventDefault();
									dismissAuto(b.id);
								}
							}}
						>
							<div className="bottle-note__paper">
								<div className="bottle-note__kicker">washed ashore</div>
								<div className="bottle-note__proverb">{b.proverb}</div>
								<div className="bottle-note__foot">
									<span>- the sea</span>
									<span className="bottle-note__hint">tap to release ✕</span>
								</div>
								<div className="bottle-note__nib" />
							</div>
						</div>
					)}
				</div>
			))}

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
					<BoltedSvg svg={bottleSvg} spot="bottle" className="bottle" width={32} height={20} viewBox="0 0 40 24">
						<rect x="6" y="7" width="28" height="11" rx="5.5" fill="rgba(147,160,232,.22)" stroke="#93a0e8" strokeWidth="1.3" />
						<rect x="33" y="9.5" width="5" height="6" rx="1.2" fill="#f0d9a8" />
						<path d="M12 10 h14 M12 12.5 h11 M12 15 h13" stroke="#f0d9a8" strokeWidth="1" strokeLinecap="round" opacity=".85" />
					</BoltedSvg>
				</div>
			)}
		</>
	);
}

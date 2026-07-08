// The stateful part of the Projects page: filter chips + count line, the
// keeper's wall (postcards pinned at their API-given wallPos), and the
// postcard-back overlay. Content arrives as build-time props; this island
// only holds `filter` and `open` state.
import { useState } from 'react';
import type { FigureheadDesign, Project, WallPos } from '../../lib/api';
import { mediaUrl } from '../../lib/media';
import { pageCatPick } from '../../lib/catSpots';
import PostcardOverlay from './PostcardOverlay';
import { useEscapeKey } from './useEscapeKey';
import './ProjectsBoard.css';

const FILTERS = ['all', 'backend', 'games', 'this website', 'tinkering'] as const;

type Filter = (typeof FILTERS)[number];

// One quip per filter, shown after the count (approved copy)
const QUIPS: Record<Filter, string> = {
	'all':          'nothing hidden yet',
	'backend':      'the day-job greatest hits',
	'games':        'undefeated: one for one',
	'this website': 'it counts',
	'tinkering':    'the hobby that survives every purge',
};

// A card's printed width, cycling per slot; the six wallPos defaults were
// tuned against these so the wall reads scattered rather than gridded.
const CARD_WIDTHS = ['34%', '29%', '28%', '28%', '31%', '26%'];

// Thumbtack left offset per card, a little off-center so a row of tacks
// never lines up in a row of its own.
const TACK_LEFTS = ['47%', '52%', '49%', '54%', '46%', '51%'];

// The ghost slot sits below the six pinned postcards, in the open strip the
// wall's fixed aspect ratio leaves under them; not derived from fallbackPos,
// which is only a safety net for a real project missing its wallPos.
const GHOST_SLOT: WallPos = { x: 38, y: 68, rotation: -1.8 };
const GHOST_WIDTH = '27%';

/** A safety net for a project with no wallPos yet: a loose jittered grid. */
function fallbackPos(index: number): WallPos {
	const col = index % 3;
	const row = Math.floor(index / 3);
	return {
		x: 4 + col * 32,
		y: 4 + row * 42,
		rotation: (index % 2 === 0 ? -1 : 1) * (1.2 + (index % 3) * 0.5),
	};
}

interface Props {
	projects:    Project[];
	catEnabled:  boolean;
	catPages?:   Record<string, boolean>;
	catSpots?:   Record<string, boolean>;
	catDesigns?: FigureheadDesign[];
}

export default function ProjectsBoard({ projects, catEnabled, catPages, catSpots, catDesigns }: Props) {
	const [filter, setFilter] = useState<Filter>('all');
	const [openId, setOpenId] = useState<string | null>(null);

	// The cat rides the opened postcard only when the page's one-cat pick is this spot
	const pick = catEnabled ? pageCatPick('projects', catPages, catSpots) : null;
	const catHere = pick?.id === 'projects.overlay';
	// Alternates between two identical enter keyframes so consecutive filter
	// clicks restart the stagger animation (same trick as the design prototype)
	const [flip, setFlip] = useState(false);

	const close = () => setOpenId(null);
	useEscapeKey(openId !== null, close);

	const matching = new Set(
		projects.filter((project) => filter === 'all' || project.category === filter).map((project) => project.id),
	);
	const open = openId === null ? null : projects.find((project) => project.id === openId) ?? null;
	const enterName = flip ? 'cardEnterA' : 'cardEnterB';

	const pickFilter = (next: Filter) => {
		setFilter(next);
		setFlip((previous) => !previous);
	};

	return (
		<>
			<div className="filter-row fade-up fade-up--3">
				{FILTERS.map((name) => (
					<button
						key={name}
						className={`chip ${name === filter ? 'chip--active' : 'chip--idle'}`}
						onClick={() => pickFilter(name)}
					>
						{name}
					</button>
				))}
				<span className="count-line">
					{matching.size} of {projects.length} pinned, {QUIPS[filter]}
				</span>
			</div>

			<div className="projects-grid">
				<div className="wall">
					{projects.map((project, index) => {
						const pos = project.wallPos ?? fallbackPos(index);
						const isMatch = matching.has(project.id);
						const wrapStyle = {
							'--wp-x': `${pos.x}%`,
							'--wp-y': `${pos.y}%`,
							'--wp-r': `${pos.rotation}deg`,
							'--wp-w': CARD_WIDTHS[index % CARD_WIDTHS.length],
							...(isMatch ? { animation: `${enterName} .45s ease ${index * 0.05}s both` } : {}),
						} as React.CSSProperties;

						return (
							<div
								key={project.id}
								className={`card-wrap${isMatch ? '' : ' card-wrap--hidden'}`}
								style={wrapStyle}
								role={isMatch ? 'button' : undefined}
								tabIndex={isMatch ? 0 : -1}
								aria-hidden={!isMatch}
								onClick={() => isMatch && setOpenId(project.id)}
								onKeyDown={(event) => {
									if (!isMatch) {
										return;
									}
									if (event.key === 'Enter' || event.key === ' ') {
										event.preventDefault();
										setOpenId(project.id);
									}
								}}
							>
								<div className="tack" style={{ left: TACK_LEFTS[index % TACK_LEFTS.length] }} />
								<div className="postcard">
									<div className="postcard__photo">
										{project.image
											? <img src={mediaUrl(project.image)} alt={project.title} />
											: <div className="postcard__photo-blank" />}
										<div className="postcard__caption">
											<span className="postcard__caption-title">{project.title}</span>
											<span className="postcard__caption-sub">from production, {project.postmarked}</span>
										</div>
									</div>
								</div>
							</div>
						);
					})}

					<div className="ghost-slot" style={{
						'--wp-x': `${GHOST_SLOT.x}%`,
						'--wp-y': `${GHOST_SLOT.y}%`,
						'--wp-r': `${GHOST_SLOT.rotation}deg`,
						'--wp-w': GHOST_WIDTH,
					} as React.CSSProperties}>
						<div className="tack" style={{ left: '50%' }} />
						<div className="ghost-slot__frame" />
						<div className="ghost-slot__label">out with the mail, back soon</div>
					</div>
				</div>
			</div>

			{open && <PostcardOverlay project={open} catHere={catHere} catDesigns={catDesigns} onClose={close} />}
		</>
	);
}

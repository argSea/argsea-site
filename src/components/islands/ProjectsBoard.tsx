// The stateful part of the Projects page: filter chips + count line, the
// keeper's wall (postcards pinned at their API-given wallPos), and the
// postcard-back overlay. Content arrives as build-time props; this island
// only holds `filter` and `open` state.
import { useState } from 'react';
import type { FigureheadDesign, Project, SiteCopy, WallPos } from '../../lib/api';
import { mediaUrl } from '../../lib/media';
import { pageCatPick } from '../../lib/catSpots';
import PostcardOverlay from './PostcardOverlay';
import Stamp from './Stamp';
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
// tuned against these so the wall reads scattered rather than gridded. Lifted
// straight from the comp's hand-placed wallSlots (400/330/320/320/360/296 of
// a 1150px-wide wall) so the cards read big and detailed, not thumbnailed.
const CARD_WIDTHS = ['35%', '29%', '28%', '28%', '31%', '26%'];

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
	wallGhost?:  SiteCopy['wallGhost'];
}

export default function ProjectsBoard({ projects, catEnabled, catPages, catSpots, catDesigns, wallGhost }: Props) {
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

	// wallGhost null/absent → the pre-existing default slot, enabled; the API
	// only started sending this field recently
	const ghostSlot = wallGhost ?? { ...GHOST_SLOT, enabled: true };
	const ghostVisible = ghostSlot.enabled !== false;

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
						// Lower order sits on top: projects arrive pre-sorted by order,
						// so the first card needs the highest z-index.
						const wrapStyle = {
							'--wp-x': `${pos.x}%`,
							'--wp-y': `${pos.y}%`,
							'--wp-r': `${pos.rotation}deg`,
							'--wp-w': CARD_WIDTHS[index % CARD_WIDTHS.length],
							zIndex: projects.length - index,
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
									{project.image
										? (
											<div className="postcard__photo">
												<img src={mediaUrl(project.image)} alt={project.title} />
												<div className="postcard__caption">
													<span className="postcard__caption-title">{project.title}</span>
													<span className="postcard__caption-sub">from production, {project.postmarked}</span>
												</div>
											</div>
										)
										: (
											<div className="postcard__back">
												<svg className="postcard__back-lines" viewBox="0 0 150 64" fill="none" stroke="rgba(70,76,120,.55)" strokeWidth="1.3" strokeLinecap="round">
													<path d="M4 8 q14 -5 28 0 t28 0 t28 0 t28 0 t24 -2 M4 22 q14 -5 28 0 t28 0 t28 0 t26 0 M4 36 q14 -5 28 0 t28 0 t30 -2 M4 50 q12 -4 24 0 t24 0" />
													<path d="M112 54 q10 -4 20 0" stroke="rgba(138,109,59,.6)" />
												</svg>
												<div className="postcard__back-corner">
													<svg className="postcard__back-postmark" width="38" height="38" viewBox="0 0 38 38" fill="none" stroke="rgba(95,110,196,.5)" strokeWidth="1.2">
														<circle cx="19" cy="19" r="14.5" strokeDasharray="3 4" />
														<path d="M7 15 q5.5 -3 11 0 t11 0 M7 19 q5.5 -3 11 0 t11 0 M7 23 q5.5 -3 11 0 t11 0" />
													</svg>
													{project.stamp && <Stamp stamp={project.stamp} scale={.72} />}
												</div>
												<div className="postcard__caption postcard__caption--back">
													<span className="postcard__caption-title">{project.title}</span>
													<span className="postcard__caption-sub">from production, {project.postmarked}</span>
												</div>
											</div>
										)}
								</div>
							</div>
						);
					})}

					{ghostVisible && (
						<div className="ghost-slot" style={{
							'--wp-x': `${ghostSlot.x}%`,
							'--wp-y': `${ghostSlot.y}%`,
							'--wp-r': `${ghostSlot.rotation}deg`,
							'--wp-w': GHOST_WIDTH,
						} as React.CSSProperties}>
							<div className="tack" style={{ left: '50%' }} />
							<div className="ghost-slot__frame" />
							<div className="ghost-slot__label">out with the mail, back soon</div>
						</div>
					)}
				</div>
			</div>

			{open && <PostcardOverlay project={open} catHere={catHere} catDesigns={catDesigns} onClose={close} />}
		</>
	);
}

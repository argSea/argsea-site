// The stateful part of the Projects page: filter chips + count line, the
// postcard grid (staggered re-entry on filter change), and the postcard-back
// overlay. Content arrives as build-time props; this island only holds
// `filter` and `open` state.
import { useState } from 'react';
import type { FigureheadDesign, Project } from '../../lib/api';
import { pageCatPick } from '../../lib/catSpots';
import Stamp from './Stamp';
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

// Six bob poses from the design — with more projects the cycle repeats
const BOB_CLASSES = ['bob-p1', 'bob-p2', 'bob-p3', 'bob-p4', 'bob-p5', 'bob-p6'];

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

	const visible = projects.filter((project) => filter === 'all' || project.category === filter);
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
					showing {visible.length} of {projects.length} — {QUIPS[filter]}
				</span>
			</div>

			<div className="projects-grid">
				{visible.map((project, index) => (
					<div
						key={project.id}
						className="card-wrap"
						style={{ animation: `${enterName} .45s ease ${index * 0.07}s both` }}
						role="button"
						tabIndex={0}
						onClick={() => setOpenId(project.id)}
						onKeyDown={(event) => {
							if (event.key === 'Enter' || event.key === ' ') {
								event.preventDefault();
								setOpenId(project.id);
							}
						}}
					>
						<div className={`postcard ${BOB_CLASSES[projects.indexOf(project) % BOB_CLASSES.length]}`}>
							{/* The grid renders stamps a touch smaller than the homepage preview (design v4) */}
							<div className="stamp-corner stamp-corner--grid">
								<Stamp stamp={project.stamp} scale={0.9} />
							</div>
							<div className="postcard__title postcard__title--grid">{project.title}</div>
							<div className="postcard__desc postcard__desc--grid">{project.shortDesc}</div>
							<div className="postcard__tags postcard__tags--grid">{project.tags.join('  ·  ')}</div>
						</div>
					</div>
				))}
			</div>

			{open && <PostcardOverlay project={open} catHere={catHere} catDesigns={catDesigns} onClose={close} />}
		</>
	);
}

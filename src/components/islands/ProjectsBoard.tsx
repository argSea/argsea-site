// The stateful part of the Projects page: filter chips + count line, the
// postcard grid (staggered re-entry on filter change), and the postcard-back
// overlay. Content arrives as build-time props; this island only holds
// `filter` and `open` state.
import { useState } from 'react';
import type { Project } from '../../lib/api';
import { mediaUrl } from '../../lib/media';
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
	projects: Project[];
}

export default function ProjectsBoard({ projects }: Props) {
	const [filter, setFilter] = useState<Filter>('all');
	const [openId, setOpenId] = useState<string | null>(null);
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
							<div className="postcard__title postcard__title--grid">{project.title}</div>
							<div className="postcard__desc postcard__desc--grid">{project.shortDesc}</div>
							<div className="postcard__tags postcard__tags--grid">{project.tags.join('  ·  ')}</div>
						</div>
					</div>
				))}
			</div>

			{open && (
				<div className="overlay-backdrop" onClick={close}>
					<div className="overlay-card postcard-back" onClick={(event) => event.stopPropagation()}>
						<div className="overlay-head">
							<span className="overlay-kicker">Postcard · from production</span>
							<button className="pill-close" onClick={close}>close ✕</button>
						</div>
						<div className="postcard-back__cols">
							<div className="postcard-back__left">
								<div className="postcard-back__title">{open.title}</div>
								{/* body is sanitized HTML from the API — rendered as-is by contract */}
								<div className="postcard-back__body" dangerouslySetInnerHTML={{ __html: open.body }} />
								<div className="postcard-back__moral">{open.moral}</div>
							</div>
							<div className="postcard-back__right">
								<div className="stamp-frame">
									<svg width="26" height="32" viewBox="0 0 26 30" fill="none">
										<path d="M13 3 L17 10 L9 10 Z" fill="#f0d9a8" />
										<rect x="10" y="10" width="6" height="13" fill="none" stroke="#93a0e8" strokeWidth="1.6" />
										<path d="M7 27 q6 -3 12 0" stroke="#5f6ec4" strokeWidth="1.6" fill="none" />
									</svg>
								</div>
								<div className="photo-print">
									{open.image
										? <img src={mediaUrl(open.image)} alt={open.title} />
										: <div className="photo-print__blank" />}
								</div>
								<div className="address-block">
									<span className="address-block__label">to:</span>
									<span className="address-block__value">{open.postcardTo}</span>
									<span className="address-block__label address-block__label--spaced">from:</span>
									<span className="address-block__value">{open.postcardFrom}</span>
									<span className="address-block__label address-block__label--spaced">postmarked:</span>
									<span className="address-block__value">{open.postmarked}</span>
								</div>
								<div className="postcard-back__tags">{open.tags.join('  ·  ')}</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</>
	);
}

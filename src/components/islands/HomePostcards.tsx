// "Postcards from production" on the homepage — the three proudest projects.
// Per the updated Hello design the cards no longer link to /projects: clicking
// opens the postcard-back overlay in place, with a "see all projects →" link
// inside. The only state is which card is open.
import { useState } from 'react';
import type { FigureheadDesign, Project } from '../../lib/api';
import { pageCatPick } from '../../lib/catSpots';
import Stamp, { resolveStamp } from './Stamp';
import PostcardOverlay from './PostcardOverlay';
import { useEscapeKey } from './useEscapeKey';
import './HomePostcards.css';

// Three bob poses from the design, one per preview card
const BOB_CLASSES = ['bob-home-a', 'bob-home-b', 'bob-home-c'];

interface Props {
	projects:    Project[];
	catEnabled:  boolean;
	catPages?:   Record<string, boolean>;
	catSpots?:   Record<string, boolean>;
	catDesigns?: FigureheadDesign[];
}

export default function HomePostcards({ projects, catEnabled, catPages, catSpots, catDesigns }: Props) {
	const [openId, setOpenId] = useState<string | null>(null);

	// The cat rides the opened postcard only when the page's one-cat pick is this spot
	const pick = catEnabled ? pageCatPick('hello', catPages, catSpots) : null;
	const catHere = pick?.id === 'hello.postcard';

	const close = () => setOpenId(null);
	useEscapeKey(openId !== null, close);

	const open = openId === null ? null : projects.find((project) => project.id === openId) ?? null;

	return (
		<>
			<div className="home-postcards">
				{projects.map((project, index) => {
					const stamp = resolveStamp(project.stamp);
					return (
						<div
							key={project.id}
							className="card-wrap"
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
							<div className={`postcard ${BOB_CLASSES[index % BOB_CLASSES.length]}`}>
								<div className={`stamp-corner stamp-corner--${stamp.shape}`}>
									<Stamp stamp={stamp} />
								</div>
								<div className={`postcard__title postcard__title--stamp-${stamp.shape}`}>{project.title}</div>
								<div className="postcard__desc">{project.shortDesc}</div>
								<div className="postcard__tags">
									{project.tags.map((tag) => <span key={tag}>{tag}</span>)}
								</div>
							</div>
						</div>
					);
				})}
			</div>

			{open && <PostcardOverlay project={open} showSeeAll catHere={catHere} catDesigns={catDesigns} onClose={close} />}
		</>
	);
}

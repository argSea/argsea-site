// "Lights I keep burning" on the homepage: the featured trio (or the first
// three by order, so the section never empties). Clicking a card opens the
// same Light List entry the coast uses. The only state is which card is open.
import { useState } from 'react';
import type { FigureheadDesign, Light, Project } from '../../lib/api';
import { DEFAULT_LIGHT, codeFor, glowFor } from '../../lib/lightChar';
import { pageCatPick } from '../../lib/catSpots';
import { useLamp } from './useLamp';
import LightEntryOverlay from './LightEntryOverlay';
import './HomeLights.css';

// Three bob poses from the design, one per preview card
const BOB_CLASSES = ['home-lights__card--bob-a', 'home-lights__card--bob-b', 'home-lights__card--bob-c'];

interface Props {
	projects:    Project[];
	catEnabled:  boolean;
	catPages?:   Record<string, boolean>;
	catSpots?:   Record<string, boolean>;
	catDesigns?: FigureheadDesign[];
}

export default function HomeLights({ projects, catEnabled, catPages, catSpots, catDesigns }: Props) {
	const [openId, setOpenId] = useState<string | null>(null);

	// The cat rides the opened entry only when the page's one-cat pick is this spot
	const pick = catEnabled ? pageCatPick('hello', catPages, catSpots) : null;
	const catHere = pick?.id === 'hello.postcard';

	const close = () => setOpenId(null);
	const open = openId === null ? null : projects.find((project) => project.id === openId) ?? null;

	return (
		<>
			<div className="home-lights">
				{projects.map((project, index) => (
					<LightCard
						key={project.id}
						project={project}
						bobClass={BOB_CLASSES[index % BOB_CLASSES.length]}
						onOpen={() => setOpenId(project.id)}
					/>
				))}
			</div>

			{open && <LightEntryOverlay project={open} catHere={catHere} catDesigns={catDesigns} onClose={close} />}
		</>
	);
}

function LightCard({ project, bobClass, onOpen }: { project: Project; bobClass: string; onOpen: () => void }) {
	const light: Light = project.light ?? DEFAULT_LIGHT;
	const dark = Boolean(light.extinguished);
	const glow = glowFor(light);

	const haloRef = useLamp(light, dark ? 0.1 : 0.5);
	const coreRef = useLamp(light, dark ? 0.2 : 0.85);

	return (
		<div
			className="card-wrap"
			role="button"
			tabIndex={0}
			onClick={onOpen}
			onKeyDown={(event) => {
				if ('Enter' === event.key || ' ' === event.key) {
					event.preventDefault();
					onOpen();
				}
			}}
		>
			<div className={`home-lights__card ${bobClass}`}>
				<div className="home-lights__lamp">
					<div ref={haloRef} className="home-lights__halo" style={{ background: `radial-gradient(circle, rgba(${glow},1) 0%, transparent 64%)` }} />
					<div ref={coreRef} className="home-lights__core" style={{ background: dark ? '#4d5670' : '#fff', boxShadow: `0 0 8px 2px rgba(${glow},1)` }} />
				</div>
				<div className="home-lights__title">{project.title}</div>
				<span className="home-lights__char" style={{ color: dark ? 'var(--text-dim)' : `rgb(${glow})` }}>{codeFor(light)} · {dark ? `dark · ${light.extinguished}` : 'lit'}</span>
				<div className="home-lights__desc">{project.shortDesc}</div>
				<div className="home-lights__tags">{project.tags.join(' · ')}</div>
			</div>
		</div>
	);
}

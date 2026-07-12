// "Selected work" on the homepage: the flagship project gets the big card
// (fact rows, polaroid, journal-entry chips), up to two more get the small
// cards. Flagship is the `flagship` flag; the two small cards are the
// `featured` flag in list order, never title matching (a project can be
// `featured` without being the `flagship`). Falls back to the next two
// projects by order when nothing else is featured, so the section never
// shows just the flagship alone. Clicking any card opens the same Light List
// entry the coast uses.
import { useState } from 'react';
import type { FigureheadDesign, Light, Note, Project } from '../../lib/api';
import { DEFAULT_LIGHT, codeFor, registryNo } from '../../lib/lightChar';
import { pageCatPick } from '../../lib/catSpots';
import { mediaUrl } from '../../lib/media';
import { useLamp } from './useLamp';
import LightEntryOverlay from './LightEntryOverlay';
import './HomeLights.css';

// Two idle bob poses from the design, one per small featured card
const BOB_CLASSES = ['home-lights__card--bob-b', 'home-lights__card--bob-c'];

// The flagship/featured cards' dot and characteristic text glow the design's
// own warm cream regardless of the project's actual light color (verbatim to
// Hello.dc.html: the wave beacons and the coast/register do look the color
// up per project, this card vocabulary deliberately doesn't).
const CARD_GLOW = '246,236,207';

interface Props {
	flagship:    Project | null;
	featured:    Project[]; // up to 2, already resolved by the caller (featured flag order, falling back to order)
	notes:       Note[];
	signoff:     string;
	catEnabled:  boolean;
	catPages?:   Record<string, boolean>;
	catSpots?:   Record<string, boolean>;
	catDesigns?: FigureheadDesign[];
}

export default function HomeLights({ flagship, featured, notes, signoff, catEnabled, catPages, catSpots, catDesigns }: Props) {
	const [openId, setOpenId] = useState<string | null>(null);

	// The cat rides the opened entry only when the page's one-cat pick is this spot
	const pick = catEnabled ? pageCatPick('hello', catPages, catSpots) : null;
	const catHere = pick?.id === 'hello.postcard';

	const close = () => setOpenId(null);
	const all = [flagship, ...featured].filter((project): project is Project => project !== null);
	const open = openId === null ? null : all.find((project) => project.id === openId) ?? null;

	const notesFor = (project: Project) => notes.filter((note) => (project.noteIds ?? []).includes(note.id));

	return (
		<>
			<div className="home-lights">
				{flagship && (
					<FlagshipCard project={flagship} notes={notesFor(flagship)} onOpen={() => setOpenId(flagship.id)} />
				)}
				{featured.length > 0 && (
					<div className="home-lights__featured">
						{featured.map((project, index) => (
							<FeaturedCard
								key={project.id}
								project={project}
								notes={notesFor(project)}
								bobClass={BOB_CLASSES[index % BOB_CLASSES.length]}
								onOpen={() => setOpenId(project.id)}
							/>
						))}
					</div>
				)}
			</div>

			{open && <LightEntryOverlay project={open} notes={notes} signoff={signoff} catHere={catHere} catDesigns={catDesigns} coastLink onClose={close} />}
		</>
	);
}

/** The characteristic line shared by the flagship and featured cards: `Fl W 8s · lit` / `F R · dark · 2020`. */
function charLine(light: Light, dark: boolean): string {
	return `${codeFor(light)} · ${dark ? `dark · ${light.extinguished}` : 'lit'}`;
}

function FlagshipCard({ project, notes, onOpen }: { project: Project; notes: Note[]; onOpen: () => void }) {
	const light: Light = project.light ?? DEFAULT_LIGHT;
	const dark = Boolean(light.extinguished);
	// A single dot, not a halo+core pair (unlike the coast/register lamps):
	// useLamp already settles a fixed or dark light to a flat opacity with no
	// animation, same as the design's own coreAnim() does for those cases.
	const dotRef = useLamp(light, dark ? 0.2 : 0.85);

	// Render capped at 4 (2x2), even though the data model holds up to 6;
	// facts arrives null from the live API for a pre-contract document.
	const facts = (project.facts ?? []).slice(0, 4);
	const photo = project.images && project.images.length > 0 ? project.images[0] : project.image;

	return (
		<div className="card-wrap home-lights__flagship-wrap" role="button" tabIndex={0} onClick={onOpen} onKeyDown={(event) => {
			if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(); }
		}}>
			<div className="home-lights__flagship">
				<div className="home-lights__flagship-text">
					<div className="home-lights__flagship-head">
						<span className="home-lights__no">no. {registryNo(project.order)}</span>
						<span className="home-lights__dot-row">
							<span ref={dotRef} className="home-lights__dot" style={{ background: dark ? '#4d5670' : '#fff', boxShadow: `0 0 8px 2px rgba(${CARD_GLOW},.85)` }} />
							<span className="home-lights__char" style={{ color: `rgb(${CARD_GLOW})` }}>{charLine(light, dark)}</span>
						</span>
						<span className="home-lights__no">est. {project.firstLit}</span>
						<span className="home-lights__flagship-pill">flagship</span>
					</div>

					<div className="home-lights__title home-lights__flagship-title">{project.title}</div>
					<div className="home-lights__flagship-desc">{project.shortDesc}</div>

					{facts.length > 0 && (
						<div className="home-lights__facts">
							{facts.map((fact) => (
								<div key={fact.heading} className="home-lights__facts-row">
									<span className="home-lights__facts-label">{fact.heading}</span>
									<span className="home-lights__facts-value">{fact.fact}</span>
								</div>
							))}
						</div>
					)}

					<div className="home-lights__chips">
						{(project.tags ?? []).map((tag) => <span key={tag} className="home-lights__chip">{tag}</span>)}
					</div>

					{notes.length > 0 && (
						<div className="home-lights__notes">
							<span className="home-lights__notes-label">notes found here</span>
							<div className="home-lights__notes-chips">
								{notes.map((note) => <span key={note.id} className="home-lights__notes-chip">✎ {note.title}</span>)}
							</div>
						</div>
					)}

					<div className="home-lights__flagship-foot">
						<span className="home-lights__moral">{project.moral}</span>
						{project.caseStudy && (
							<a
								href={`/projects/${project.slug}`}
								className="home-lights__caselink"
								onClick={(event) => event.stopPropagation()}
							>
								read the full log →
							</a>
						)}
					</div>
				</div>

				{photo && (
					<div className="home-lights__polaroid" onClick={(event) => event.stopPropagation()}>
						<div className="polaroid-frame">
							<img src={mediaUrl(photo)} alt={project.title} />
						</div>
						<span className="home-lights__polaroid-caption">from the station archive · no. {registryNo(project.order)}</span>
					</div>
				)}
			</div>
		</div>
	);
}

function FeaturedCard({ project, notes, bobClass, onOpen }: { project: Project; notes: Note[]; bobClass: string; onOpen: () => void }) {
	const light: Light = project.light ?? DEFAULT_LIGHT;
	const dark = Boolean(light.extinguished);
	const dotRef = useLamp(light, dark ? 0.2 : 0.85);

	const notesLine = notes.length === 0 ? null : notes.length === 1 ? '1 journal entry' : `${notes.length} journal entries`;

	return (
		<div
			className="card-wrap"
			role="button"
			tabIndex={0}
			onClick={onOpen}
			onKeyDown={(event) => {
				if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(); }
			}}
		>
			<div className={`home-lights__card ${bobClass}`}>
				<div className="home-lights__card-head">
					<span className="home-lights__no">no. {registryNo(project.order)}</span>
					<span className="home-lights__dot-row">
						<span ref={dotRef} className="home-lights__dot home-lights__dot--sm" style={{ background: dark ? '#4d5670' : '#fff', boxShadow: `0 0 7px 2px rgba(${CARD_GLOW},.85)` }} />
						<span className="home-lights__char home-lights__char--sm" style={{ color: `rgb(${CARD_GLOW})` }}>{charLine(light, dark)}</span>
					</span>
					<span className="home-lights__no">est. {project.firstLit}</span>
				</div>
				<div className="home-lights__title">{project.title}</div>
				<div className="home-lights__desc">{project.shortDesc}</div>
				<div className="home-lights__chips home-lights__chips--sm">
					{(project.tags ?? []).map((tag) => <span key={tag} className="home-lights__chip home-lights__chip--sm">{tag}</span>)}
				</div>
				<div className="home-lights__card-foot">
					<span className="home-lights__read">read →</span>
					{notesLine && <span className="home-lights__notes-line">✎ {notesLine}</span>}
				</div>
			</div>
		</div>
	);
}

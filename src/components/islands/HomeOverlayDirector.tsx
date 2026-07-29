// The home page's overlay layer (design/Hello.dc.html): the three section
// triggers stop navigating and open their subject in place instead. A flagship
// shot opens the light's entry, a journal card opens the entry on its paper, a
// hobby gauge opens the bearing card, and the three cross-link into each other.
//
// Progressive enhancement over static markup, the JournalStripDirector shape:
// one delegated listener per section, so the rows stay server-rendered HTML
// rather than hydrating an island each. A modified click (ctrl/meta/shift), a
// middle click, or no JS at all all fall through to the trigger's real href,
// which is why every trigger keeps one.
//
// The mock's own layer is strictly single-overlay: every cross-link nulls its
// source and sets its destination in the same commit, so two are never mounted
// at once. That is modelled here as one `view` union rather than three
// independent flags, because three flags is exactly how you end up rendering
// two backdrops. The Escape order (note, then bearing, then light) is the
// mock's and survives as defensive tie-breaking.
import { useEffect, useState } from 'react';
import type { Doodle, Hobby, Note, Project } from '../../lib/api';
import { STATE_META, fmtCoord, pillStyle } from '../../lib/bearings';
import JournalEntryOverlay from './JournalEntryOverlay';
import LightEntryOverlay from './LightEntryOverlay';

type View =
	| { kind: 'light';   project: Project }
	| { kind: 'note';    note: Note }
	| { kind: 'bearing'; hobby: Hobby };

interface Props {
	projects: Project[];  // the flagship rows, and the target of a journal entry's ✷ cross-link
	notes:    Note[];     // the journal preview cards, and every entry a light or bearing can pull up
	doodles:  Doodle[];
	hobbies:  Hobby[];    // the gauge rows, and the target of a journal entry's ◈ cross-link
	towerSvg?: string | null; // tower-stub carving, resolved build-time by index.astro; forwarded to the light entry
}

// The three triggers, each carrying its subject's id. One listener reads all of
// them: the sections share the .sec class, so a per-section root would have to
// disambiguate by what a container is *not*, and that breaks the first time a
// section gains a modifier.
const TRIGGERS = '[data-light-shot],[data-journal-card],[data-bearing-gauge]';

/**
 * Which overlay a clicked trigger asks for. Returns null when the id names
 * nothing we hold, so an unresolvable trigger falls through to its own href
 * rather than swallowing the click and opening nothing.
 */
function resolve(el: HTMLElement, projects: Project[], notes: Note[], hobbies: Hobby[]): View | null {
	const { lightShot, journalCard, bearingGauge } = el.dataset;

	if (lightShot) {
		const project = projects.find((candidate) => candidate.id === lightShot);
		return project ? { kind: 'light', project } : null;
	}
	if (journalCard) {
		const note = notes.find((candidate) => candidate.id === journalCard);
		return note ? { kind: 'note', note } : null;
	}
	const hobby = hobbies.find((candidate) => candidate.id === bearingGauge);
	return hobby ? { kind: 'bearing', hobby } : null;
}

export default function HomeOverlayDirector({ projects, notes, doodles, hobbies, towerSvg = null }: Props) {
	const [view, setView] = useState<View | null>(null);
	const close = () => setView(null);

	useEffect(() => {
		const onClick = (event: MouseEvent) => {
			if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey) {
				return;
			}
			const hit = (event.target as HTMLElement).closest<HTMLElement>(TRIGGERS);
			if (!hit) {
				return;
			}
			const picked = resolve(hit, projects, notes, hobbies);
			if (!picked) {
				return;
			}
			event.preventDefault();
			setView(picked);
		};
		document.addEventListener('click', onClick);
		return () => document.removeEventListener('click', onClick);
	}, [projects, notes, hobbies]);

	// The light entry runs its own capture-phase Escape for the note it can pull
	// out, so this only ever sees the events that overlay let through.
	useEffect(() => {
		if (!view) {
			return;
		}
		const onKey = (event: KeyboardEvent) => {
			if ('Escape' === event.key) {
				close();
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [view]);

	if (!view) {
		return null;
	}

	if ('light' === view.kind) {
		const tied = notes.filter((note) => (view.project.noteIds ?? []).includes(note.id));
		return <LightEntryOverlay project={view.project} notes={tied} doodles={doodles} towerSvg={towerSvg} coastLink onClose={close} />;
	}

	if ('note' === view.kind) {
		const doodle = view.note.doodleId ? doodles.find((d) => d.id === view.note.doodleId) ?? null : null;
		// The ✷ and ◈ cross-links: a swap, never a stack, so the entry that
		// raised them is gone by the time its destination mounts.
		const foundProjects = projects.filter((project) => (project.noteIds ?? []).includes(view.note.id));
		const foundHobbies = hobbies.filter((hobby) => (hobby.noteIds ?? []).includes(view.note.id));
		return (
			<JournalEntryOverlay
				note={view.note}
				doodle={doodle}
				foundIn={foundProjects}
				foundHobbies={foundHobbies}
				onStepInto={(project) => setView({ kind: 'light', project })}
				onOpenBearing={(hobby) => setView({ kind: 'bearing', hobby })}
				onClose={close}
			/>
		);
	}

	return <BearingCard hobby={view.hobby} notes={notes.filter((note) => (view.hobby.noteIds ?? []).includes(note.id))} onOpenNote={(note) => setView({ kind: 'note', note })} onClose={close} />;
}

/**
 * The home page's bearing card (Hello.dc.html): the wandering chart's card
 * without the chart's own apparatus. No flare (the flare belongs to the chart
 * that tracks the hobby), no perched cat, and a real link out to the chart
 * instead, which is the one thing this card has that the chart's does not.
 */
function BearingCard({ hobby, notes, onOpenNote, onClose }: { hobby: Hobby; notes: Note[]; onOpenNote: (note: Note) => void; onClose: () => void }) {
	return (
		<div className="bearing-card__backdrop" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(8,10,20,.72)', backdropFilter: 'blur(5px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(14px,4vw,40px)', animation: 'backdropIn .25s ease both' }}>
			<div className="bearing-card" onClick={(event) => event.stopPropagation()} style={{ position: 'relative', width: 'min(620px,100%)', animation: 'cardIn .35s ease both' }}>
				<div style={{ maxHeight: '86vh', overflow: 'auto', background: 'linear-gradient(180deg,#f1ecdd,#eae3d1)', borderRadius: '6px 12px 12px 6px', boxShadow: '0 30px 80px rgba(0,0,0,.6)' }}>
					<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '16px clamp(20px,4vw,30px)', borderBottom: '1.5px dashed rgba(110,100,75,.35)' }}>
						<span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11.5px', letterSpacing: '.14em', color: '#8a7f63', textTransform: 'uppercase' }}>Last known bearing</span>
						<button type="button" className="bearing-card__close" onClick={onClose} style={{ cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: '12.5px', color: '#7d7357', padding: '5px 11px', border: '1px solid rgba(110,100,75,.4)', borderRadius: '999px', background: 'none', transition: 'all .2s' }}>close ✕</button>
					</div>
					<div style={{ padding: 'clamp(22px,4vw,32px)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
						<div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
							<span className="bearing-card__name" style={{ fontFamily: "'Gloock', serif", fontSize: 'clamp(23px,3.8vw,28px)', color: '#20233c' }}>{hobby.name}</span>
							<span style={pillStyle(hobby.state, true)}>{STATE_META[hobby.state].label}</span>
						</div>
						<div style={{ fontSize: '16px', fontStyle: 'italic', lineHeight: 1.65, color: '#3b3f5e', borderLeft: '2px solid rgba(110,100,75,.3)', paddingLeft: '14px' }}>{hobby.lastLog}</div>
						<div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '10px 16px', fontSize: '15px', lineHeight: 1.55, color: '#3b3f5e', alignItems: 'baseline' }}>
							<span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '.12em', color: '#8a7f63', textTransform: 'uppercase' }}>how it went off course</span><span>{hobby.offCourse}</span>
							<span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '.12em', color: '#8a7f63', textTransform: 'uppercase' }}>what still floats</span><span>{hobby.floats}</span>
							<span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '.12em', color: '#8a7f63', textTransform: 'uppercase' }}>odds of return</span><span style={{ color: '#6a5a2a' }}>{hobby.odds}</span>
						</div>
						{notes.length > 0 && (
							<div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap', borderTop: '1.5px dashed rgba(110,100,75,.3)', paddingTop: '12px' }}>
								<span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '.12em', color: '#8a7f63', textTransform: 'uppercase', flex: 'none' }}>logged in the journal</span>
								<div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
									{notes.map((note) => (
										<button key={note.id} type="button" title="read the entry" className="bearing-card__note-link" onClick={() => onOpenNote(note)} style={{ fontFamily: "'Newsreader', serif", fontSize: '15px', fontStyle: 'italic', color: '#6b6390', lineHeight: 1.45, cursor: 'pointer', transition: 'color .2s', background: 'none', border: 'none', padding: 0, textAlign: 'left' }}>✷ {note.title} →</button>
									))}
								</div>
							</div>
						)}
						<div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', borderTop: '1.5px dashed rgba(110,100,75,.3)', paddingTop: '12px' }}>
							<span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#a39876' }}>position · {hobby.coord ? fmtCoord(hobby.coord) : 'uncharted'} · logged {hobby.service}</span>
							<a className="bearing-card__chart-link" href={`/hobbies?bearing=${encodeURIComponent(hobby.name)}`} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: '#8a6d3b' }}>see it on the wandering chart →</a>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

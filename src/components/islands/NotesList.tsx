// The stateful part of the Keeper's Journal: the journal-spread rows and the
// journal-entry overlay. A note's doodle (if any) is rendered as structured
// inline SVG, beside its handwritten caption in the open entry only; the row
// itself carries no doodle (design: The Keeper's Journal).
import { useState } from 'react';
import type { Doodle, FigureheadDesign, FigureheadShape, Note } from '../../lib/api';
import { pageCatPick } from '../../lib/catSpots';
import HarborCat from './HarborCat';
import { useEscapeKey } from './useEscapeKey';
import './NotesList.css';

interface Props {
	notes:       Note[];
	doodles:     Doodle[];
	signoff:     string;
	catEnabled:  boolean;
	catPages?:   Record<string, boolean>;
	catSpots?:   Record<string, boolean>;
	catDesigns?: FigureheadDesign[];
}

// The animation transform-origin a shape carries, as an inline style (mirrors
// HarborCat.tsx; doodles carry no roles/origins today, but the shape type is
// shared, so this keeps the helper drop-in compatible).
const originStyle = (origin?: [number, number]) =>
	origin ? { transformOrigin: `${origin[0]}px ${origin[1]}px` } : undefined;

// One stored shape → its SVG element. Only the fields present on the shape are
// written; there is no stored markup to render, ever; shapes only, per the
// figurehead/doodle contract. Copied from HarborCat.tsx (:47-64).
function shapeElement(shape: FigureheadShape) {
	const presentation = {
		style:           originStyle(shape.origin),
		fill:            shape.fill,
		stroke:          shape.stroke,
		strokeWidth:     shape.strokeWidth,
		opacity:         shape.opacity,
		strokeLinecap:   shape.linecap as React.SVGAttributes<SVGElement>['strokeLinecap'],
		strokeLinejoin:  shape.linejoin as React.SVGAttributes<SVGElement>['strokeLinejoin'],
	};
	switch (shape.type) {
		case 'path':    return <path key={shape.id} d={shape.d} {...presentation} />;
		case 'ellipse': return <ellipse key={shape.id} cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} {...presentation} />;
		case 'rect':    return <rect key={shape.id} x={shape.x} y={shape.y} width={shape.w} height={shape.h} {...presentation} />;
		case 'line':    return <line key={shape.id} x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} {...presentation} />;
	}
}

function DoodleSvg({ doodle, className }: { doodle: Doodle; className: string }) {
	return (
		<svg className={className} viewBox={doodle.viewBox} aria-hidden="true">
			{doodle.shapes.map((shape) => shapeElement(shape))}
		</svg>
	);
}

export default function NotesList({ notes, doodles, signoff, catEnabled, catPages, catSpots, catDesigns }: Props) {
	const [openId, setOpenId] = useState<string | null>(null);

	// The cat rides the letter only when the page's one-cat pick is this overlay
	// spot; the note-row perch is a separate spot the director owns.
	const pick = catEnabled ? pageCatPick('notes', catPages, catSpots) : null;
	const catHere = pick?.id === 'notes.overlay';

	const doodleFor = (doodleId: string | null) => doodleId ? doodles.find((doodle) => doodle.id === doodleId) ?? null : null;

	const openNote = (id: string) => {
		setOpenId(id);
	};

	const close = () => setOpenId(null);
	useEscapeKey(openId !== null, close);

	const open = openId === null ? null : notes.find((note) => note.id === openId) ?? null;
	const openDoodle = open ? doodleFor(open.doodleId) : null;

	return (
		<>
			<div className="journal">
				<div className="journal__binding" aria-hidden="true" />
				<div className="journal__ribbon" aria-hidden="true" />
				{catEnabled && <div className="journal__coffee-ring" aria-hidden="true" />}
				<div className="journal__header">
					<span className="journal__header-label">Keeper's journal · private-ish</span>
					<span className="journal__header-vol">vol. 1</span>
				</div>

				<div className="journal__rows">
					{notes.map((note) => (
						<div
							key={note.id}
							className="note-row"
							role="button"
							tabIndex={0}
							onClick={() => openNote(note.id)}
							onKeyDown={(event) => {
								if (event.key === 'Enter' || event.key === ' ') {
									event.preventDefault();
									openNote(note.id);
								}
							}}
						>
							<span className="note-row__dateline">
								<span className="note-row__date">{note.date}</span>
								<span className="note-row__conditions">{note.conditions}</span>
							</span>
							<span className="note-row__middle">
								<span className="note-row__titlerow">
									<span className="note-row__title">{note.title}</span>
									<span className="note-row__read">read →</span>
								</span>
								<span className="note-row__teaser">{note.teaser}</span>
							</span>
						</div>
					))}
				</div>

				<div className="journal__foot">
					<div className="journal__footer">{notes.length} inked so far. The bar for "blog" is five. We'll see.</div>
					{catEnabled && (
						<div className="journal__pawprints">
							<span className="journal__paw-dots">
								<span className="journal__paw-dot" />
								<span className="journal__paw-dot" />
								<span className="journal__paw-dot" />
							</span>
							<span className="journal__paw-caption">the cat has read these</span>
						</div>
					)}
				</div>
			</div>

			{open && (
				<div className="overlay-backdrop" onClick={close}>
					<div className="letter-wrap" onClick={(event) => event.stopPropagation()}>
						{catHere && <div className="cat-mount cat-mount--note"><HarborCat pose="perched" context="note" designs={catDesigns} /></div>}
						<div className="overlay-card letter">
							<div className="overlay-head">
								<span className="overlay-kicker">Journal entry · {open.date}</span>
								<button className="pill-close" onClick={close}>close ✕</button>
							</div>
							<div className="letter__content">
								<div className="letter__conditions">{open.conditions}</div>
								<div className="letter__title">{open.title}</div>
								{/* body is sanitized HTML from the API, rendered as-is by contract */}
								<div className="letter__body" dangerouslySetInnerHTML={{ __html: open.body }} />
								<div className="letter__signrow">
									<div className="letter__signature">{signoff}</div>
									{openDoodle && (
										<div className="letter__marginalia">
											<DoodleSvg doodle={openDoodle} className="letter__doodle" />
											<span className="letter__doodle-caption">{open.doodleCaption}</span>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</>
	);
}

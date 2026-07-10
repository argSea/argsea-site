// The journal entry: the overlay shared by the Notes page and the home
// journal strip. A self-contained modal: it owns Escape (at capture, so it
// beats any other overlay's own listener on the same page), the backdrop
// click, and its own open/close animation, so neither caller has to wire
// that up twice. The harbor cat perches on the card's top edge only when the
// caller's own one-cat pick landed on this overlay spot.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Doodle, FigureheadDesign, FigureheadShape, Note } from '../../lib/api';
import { useEscapeKey } from './useEscapeKey';
import HarborCat from './HarborCat';
import './JournalEntryOverlay.css';

interface Props {
	note:        Note;
	doodle:      Doodle | null;
	signoff:     string;
	catHere?:    boolean;
	catDesigns?: FigureheadDesign[];
	onClose:     () => void;
}

// How long the exit animation runs before the caller actually unmounts us;
// mirrors cardOut/backdropOut in JournalEntryOverlay.css.
const CLOSE_MS = 220;

function reducedMotion(): boolean {
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

export default function JournalEntryOverlay({ note, doodle, signoff, catHere = false, catDesigns, onClose }: Props) {
	const [closing, setClosing] = useState(false);
	const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	useEffect(() => () => clearTimeout(closeTimer.current), []);

	// The exit animation plays first and onClose (the caller's actual unmount)
	// follows after it finishes; reduced motion skips straight to onClose.
	const requestClose = () => {
		if (closing) {
			return;
		}
		if (reducedMotion()) {
			onClose();
			return;
		}
		setClosing(true);
		closeTimer.current = setTimeout(onClose, CLOSE_MS);
	};

	useEscapeKey(true, requestClose, true);

	// Portaled to document.body so the backdrop sits in the root stacking
	// context regardless of which page mounted us (the Notes list or the home
	// journal strip), same as LightEntryOverlay.
	return createPortal(
		<div className={`overlay-backdrop${closing ? ' overlay-backdrop--closing' : ''}`} onClick={requestClose}>
			<div className={`letter-wrap${closing ? ' letter-wrap--closing' : ''}`} onClick={(event) => event.stopPropagation()}>
				{catHere && <div className="cat-mount cat-mount--note"><HarborCat pose="perched" context="note" designs={catDesigns} /></div>}
				<div className="overlay-card letter">
					<div className="overlay-head">
						<span className="overlay-kicker">Journal entry · {note.date}</span>
						<button className="pill-close" onClick={requestClose}>close ✕</button>
					</div>
					<div className="letter__content">
						<div className="letter__conditions">{note.conditions}</div>
						<div className="letter__title">{note.title}</div>
						{/* body is sanitized HTML from the API, rendered as-is by contract */}
						<div className="letter__body" dangerouslySetInnerHTML={{ __html: note.body }} />
						<div className="letter__signrow">
							<div className="letter__signature">{signoff}</div>
							{doodle && (
								<div className="letter__marginalia">
									<DoodleSvg doodle={doodle} className="letter__doodle" />
									<span className="letter__doodle-caption">{note.doodleCaption}</span>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>,
		document.body,
	);
}

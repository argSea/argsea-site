// One stored doodle -> its SVG element. Shared by the journal-entry overlay and
// the light overlay's pulled-out note, which both draw the same doodle beside
// its handwritten caption. Only the fields present on a shape are written; there
// is no stored markup to render, ever; shapes only, per the figurehead/doodle
// contract (the shape helper mirrors HarborCat.tsx).
import type { Doodle, FigureheadShape } from '../../lib/api';

// The animation transform-origin a shape carries, as an inline style (mirrors
// HarborCat.tsx; doodles carry no roles/origins today, but the shape type is
// shared, so this keeps the helper drop-in compatible).
const originStyle = (origin?: [number, number]) =>
	origin ? { transformOrigin: `${origin[0]}px ${origin[1]}px` } : undefined;

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

export default function DoodleSvg({ doodle, className }: { doodle: Doodle; className: string }) {
	return (
		<svg className={className} viewBox={doodle.viewBox} aria-hidden="true">
			{doodle.shapes.map((shape) => shapeElement(shape))}
		</svg>
	);
}

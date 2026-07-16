// A carving-swappable svg, shared by every React mount (Astro mounts use
// set:html directly; see LighthouseMark.astro/JournalStrip.astro). The outer
// svg tag, and so the sizing contract, never changes: only the drawing
// commands inside swap to a bolted carving's markup. svg null renders the
// built-in fallback exactly as it stood before this component existed. The
// diorama mounts (ShipsLog.tsx) position and animate with inline style, so
// the mount's style rides both branches the same way className does.
import { innerMarkup } from '../../lib/carvings';

interface Props {
	svg:        string | null; // bolted carving markup, or null for the built-in
	spot:       string;        // carried as data-bolted so a carved mount is easy to find/test
	className?: string;
	width:      number;
	height:     number;
	viewBox:    string;
	style?:     React.CSSProperties;
	children:   React.ReactNode; // the built-in fallback drawing
}

export default function BoltedSvg({ svg, spot, className, width, height, viewBox, style, children }: Props) {
	if (svg) {
		return (
			<svg
				className={className}
				width={width}
				height={height}
				viewBox={viewBox}
				fill="none"
				style={style}
				data-bolted={spot}
				dangerouslySetInnerHTML={{ __html: innerMarkup(svg) }}
			/>
		);
	}
	return (
		<svg className={className} width={width} height={height} viewBox={viewBox} fill="none" style={style}>
			{children}
		</svg>
	);
}

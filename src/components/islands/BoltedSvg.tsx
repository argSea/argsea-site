// A carving-swappable svg, shared by every React mount (Astro mounts use
// set:html directly; see LighthouseMark.astro/JournalStrip.astro). The outer
// svg tag, and so the sizing contract, never changes: only the drawing
// commands inside swap to a bolted carving's markup. svg null renders the
// built-in fallback exactly as it stood before this component existed.
import { innerMarkup } from '../../lib/carvings';

interface Props {
	svg:       string | null; // bolted carving markup, or null for the built-in
	spot:      string;        // carried as data-bolted so a carved mount is easy to find/test
	className: string;
	width:     number;
	height:    number;
	viewBox:   string;
	children:  React.ReactNode; // the built-in fallback drawing
}

export default function BoltedSvg({ svg, spot, className, width, height, viewBox, children }: Props) {
	if (svg) {
		return (
			<svg
				className={className}
				width={width}
				height={height}
				viewBox={viewBox}
				fill="none"
				data-bolted={spot}
				dangerouslySetInnerHTML={{ __html: innerMarkup(svg) }}
			/>
		);
	}
	return (
		<svg className={className} width={width} height={height} viewBox={viewBox} fill="none">
			{children}
		</svg>
	);
}

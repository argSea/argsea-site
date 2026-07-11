// The case-study header's mini light glyph: the same halo/core characteristic
// engine every other lamp on the site runs (useLamp/ignite), just small. A
// dedicated island rather than reusing LightsBoard's/HomeLights' markup+CSS,
// since those are scoped to their own islands and this one lives on its own
// page with nothing else to share a bundle with.
import { DEFAULT_LIGHT, glowFor } from '../../lib/lightChar';
import type { Light } from '../../lib/api';
import { useLamp } from './useLamp';
import './LightBadge.css';

interface Props {
	light: Light | null;
}

export default function LightBadge({ light }: Props) {
	const lit = light ?? DEFAULT_LIGHT;
	const dark = Boolean(lit.extinguished);
	const glow = glowFor(lit);

	const haloRef = useLamp(lit, dark ? 0.08 : 0.5);
	const coreRef = useLamp(lit, dark ? 0.15 : 0.85);

	return (
		<span className="light-badge">
			<span ref={haloRef} className="light-badge__halo" style={{ background: `radial-gradient(circle, rgba(${glow},1) 0%, transparent 64%)` }} />
			<span ref={coreRef} className="light-badge__core" style={{ background: dark ? '#4d5670' : '#fff', boxShadow: `0 0 6px 1.5px rgba(${glow},1)` }} />
		</span>
	);
}

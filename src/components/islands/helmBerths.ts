// The helm's page-local berth tables, transcribed verbatim from
// design/TheChart.dc.html: a light/hobby/journal entry sails onto the chart
// when it gets a berth here; everything else about it is data. Split out of
// Helm.tsx (which also imports Helm.css) so e2e/helm.spec.ts can import these
// directly to derive the rail's expected item count from the fixtures,
// without a plain-CSS import breaking the spec's Node/Playwright transform.
import type { HobbyState } from '../../lib/api';

export const BERTHS: Record<string, { lat: number; lon: number; plate: number; cap: string; port?: boolean }> = {
	'The Great Un-monolithing': { lat: 58.50, lon: -7.06, plate: 2, cap: 'The last of the monolith, going dark.' },
	'Newsroom plumbing':        { lat: 58.02, lon: -7.02, plate: 4, cap: 'Press night, from the machine floor.' },
	'100k good mornings':       { lat: 58.61, lon: -7.42, plate: 0, cap: 'Sunrise, beaten by four minutes.' },
	'Janus':                    { lat: 58.05, lon: -7.16, plate: 1, cap: 'Two workspaces, one window.', port: true },
};

export const HOBBY_DRESSING: Record<string, { plate: number; cap: string }> = {
	'The home lab': { plate: 3, cap: 'The rack, mid-tweak. It is always mid-tweak.' },
	'Piano':        { plate: 4, cap: 'Under its cover, judging me.' },
	'Music theory': { plate: 1, cap: 'The circle of fifths, in a drawer.' },
	'Game dev':     { plate: 2, cap: 'The cat is the boat. No further business.' },
	'Running':      { plate: 0, cap: 'The shoes. The shoes remain.' },
};
export const HOBBY_ICON: Record<HobbyState, string> = { moored: 'moored', adrift: 'adrift', marooned: 'marooned', port: 'port', inkspill: 'ink' };
export const HOBBY_CODE: Record<HobbyState, string> = { moored: 'moored', adrift: 'adrift', marooned: 'marooned', port: 'made port', inkspill: 'smudged' };

export const JOURNAL_BERTHS: Record<string, { lat: number; lon: number; plate: number; cap: string }> = {
	'What re-architecting taught me about not architecting': { lat: 58.67, lon: -7.08, plate: 1, cap: 'The whiteboard that won the argument.' },
	'CachyOS, three months in': { lat: 57.99, lon: -6.90, plate: 2, cap: 'Three months of uptime, one distro.' },
	'The queue is the product': { lat: 58.35, lon: -7.94, plate: 0, cap: 'The queue, behaving, for now.' },
};

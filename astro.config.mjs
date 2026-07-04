import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// Static output is the whole point: the public site is plain files behind
// nginx, rebuilt by the lantern. React only hydrates the islands with state
// (project filters/overlay, note overlay, the next-hobby chip).
export default defineConfig({
	output:       'static',
	integrations: [react()],
});

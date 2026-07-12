// E2E config. `npm run test:e2e` first bakes three static builds under
// e2e-dist/ (fixtures, featured, fallback; see e2e/bake.mjs), and each gets
// its own static server so the specs can compare build-time data paths
// side by side.
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './e2e',
	forbidOnly: !!process.env.CI,
	use: {
		baseURL: 'http://127.0.0.1:4821',
	},
	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
	],
	webServer: [
		{ command: 'node e2e/serve-dist.mjs e2e-dist/fixtures 4821', url: 'http://127.0.0.1:4821/', reuseExistingServer: false },
		{ command: 'node e2e/serve-dist.mjs e2e-dist/featured 4822', url: 'http://127.0.0.1:4822/', reuseExistingServer: false },
		{ command: 'node e2e/serve-dist.mjs e2e-dist/fallback 4823', url: 'http://127.0.0.1:4823/', reuseExistingServer: false },
		{ command: 'node e2e/serve-dist.mjs e2e-dist/sighting 4824', url: 'http://127.0.0.1:4824/', reuseExistingServer: false },
	],
});

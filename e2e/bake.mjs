// Bakes the three static builds the specs run against (see the mode notes in
// e2e/mock-api.mjs). Runs as the test:e2e pre-step: Playwright launches its
// webServers before any global setup, so the dists must exist beforehand.
// Builds are sequential because astro always emits to dist/; each result is
// moved aside before the next build starts.
import { execSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MOCK_PORT = 4820;

function build(env) {
	execSync('npx astro build', { cwd: root, stdio: 'inherit', env: { ...process.env, ...env } });
}

function keep(name) {
	const target = join(root, 'e2e-dist', name);
	rmSync(target, { recursive: true, force: true });
	renameSync(join(root, 'dist'), target);
}

async function startMockApi(mode) {
	const server = spawn('node', ['e2e/mock-api.mjs', String(MOCK_PORT), mode], { cwd: root, stdio: 'inherit' });
	for (let attempt = 0; attempt < 50; attempt++) {
		try {
			await fetch(`http://127.0.0.1:${MOCK_PORT}/1/copy`);
			return server;
		} catch {
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
	}
	server.kill();
	throw new Error(`mock api did not come up on ${MOCK_PORT}`);
}

async function buildAgainstMock(mode) {
	const server = await startMockApi(mode);
	try {
		build({ ARGSEA_API_URL: `http://127.0.0.1:${MOCK_PORT}`, ARGSEA_KEEPER_ID: 'mock-keeper' });
	} finally {
		server.kill();
	}
	keep(mode);
}

if (!existsSync(join(root, 'e2e-dist'))) {
	mkdirSync(join(root, 'e2e-dist'));
}

build({ ARGSEA_API_URL: '', ARGSEA_KEEPER_ID: '' });
keep('fixtures');

await buildAgainstMock('featured');
await buildAgainstMock('fallback');

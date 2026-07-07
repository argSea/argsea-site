// Build-time mock of the argsea-site-api, used only by e2e/bake.mjs.
// Serves the checked-in fixtures over the real wire routes so ApiSource is
// exercised end-to-end, with one twist per mode:
//   featured  — the mantel moves to the LAST three projects by order, so a
//               homepage that merely sliced the first three would fail
//   fallback  — nothing is featured, proving the order-fallback keeps the
//               homepage populated
// Both modes swap in a mock keeper profile so the specs can prove the contact
// band, socials, and sign-off are wired to the profile, not hardcoded.
//
// Usage: node e2e/mock-api.mjs <port> <featured|fallback>
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [port, mode] = process.argv.slice(2);
const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'fixtures');

const fixture = (name) => JSON.parse(readFileSync(join(fixturesDir, `${name}.json`), 'utf8'));

const MOCK_KEEPER = {
	name:     'Mock Keeper',
	pronouns: 'they/them',
	location: 'The Test Harbor',
	title:    'Keeper of Mocks',
	bio:      'Exists so the specs can tell profile data from hardcoded copy.',
	email:    'keeper@example.test',
	github:   'github.com/mock-keeper',
	linkedin: 'linkedin.com/in/mock-keeper',
	signoff:  '— the mock keeper',
};

const projects = fixture('projects').map((project) => ({
	...project,
	featured: mode === 'featured' ? project.order >= 4 : false,
}));

const routes = {
	'/1/project':                    projects,
	'/1/hobby':                      fixture('hobbies'),
	'/1/note':                       fixture('notes'),
	'/1/copy':                       fixture('siteCopy'),
	'/1/user/mock-keeper/profile':   MOCK_KEEPER,
	// Nothing published — both mock builds prove the cat's built-in fallback,
	// while the fixtures build renders through the v1-seed shape path
	'/1/figurehead/published':       fixture('figurehead.empty'),
};

createServer((req, res) => {
	const path = new URL(req.url, `http://127.0.0.1:${port}`).pathname;
	const body = routes[path];
	if (!body) {
		res.writeHead(404).end();
		return;
	}
	res.writeHead(200, { 'content-type': 'application/json' });
	res.end(JSON.stringify(body));
}).listen(Number(port), '127.0.0.1');

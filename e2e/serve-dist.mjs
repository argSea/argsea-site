// Static server for a baked build: Playwright's webServer runs one per dist
// under e2e-dist/ so the specs never depend on `astro preview`'s single outDir.
//
// Production and preview builds ship zero media (mock prints stay in the
// mock): /media/images/ never exists under dist/, so it's served here
// instead, from the committed e2e test prints, the same way for every dist
// this script serves. A name with no matching test print 404s same as it
// would against a real darkroom, which is exactly the case the empty-frame
// spec wants.
//
// Usage: node e2e/serve-dist.mjs <dir> <port>
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const [dir, port] = process.argv.slice(2);
const TEST_PRINTS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'test-prints');

const TYPES = {
	'.html': 'text/html; charset=utf-8',
	'.css':  'text/css',
	'.js':   'text/javascript',
	'.mjs':  'text/javascript',
	'.json': 'application/json',
	'.svg':  'image/svg+xml',
	'.png':  'image/png',
	'.jpg':  'image/jpeg',
	'.ico':  'image/x-icon',
	'.woff2': 'font/woff2',
	'.txt':  'text/plain',
};

createServer(async (req, res) => {
	const path = normalize(new URL(req.url, `http://127.0.0.1:${port}`).pathname).replace(/^(\.\.[/\\])+/, '');

	if (path.startsWith('/media/images/')) {
		try {
			const body = await readFile(join(TEST_PRINTS_DIR, path.slice('/media/images/'.length)));
			res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
			res.end(body);
		} catch {
			res.writeHead(404).end('not found');
		}
		return;
	}

	// Astro's static output is directory-format: /projects → projects/index.html
	const candidates = path.endsWith('/')
		? [join(dir, path, 'index.html')]
		: [join(dir, path), join(dir, path, 'index.html')];

	for (const candidate of candidates) {
		try {
			const body = await readFile(candidate);
			res.writeHead(200, { 'content-type': TYPES[extname(candidate)] ?? 'application/octet-stream' });
			res.end(body);
			return;
		} catch {
			// try the next candidate
		}
	}
	res.writeHead(404).end('not found');
}).listen(Number(port), '127.0.0.1');

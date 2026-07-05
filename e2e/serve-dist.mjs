// Static server for a baked build — Playwright's webServer runs one per dist
// under e2e-dist/ so the specs never depend on `astro preview`'s single outDir.
//
// Usage: node e2e/serve-dist.mjs <dir> <port>
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const [dir, port] = process.argv.slice(2);

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

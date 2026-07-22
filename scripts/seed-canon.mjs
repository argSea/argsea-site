// One-shot: the keeper runs this by hand to bring the live database's
// content up to this repo's own canon (src/data/fixtures/). Never wired into
// the build or CI, and nothing in src/ imports it; it's a keeper's tool, not
// a site seam.
//
// Usage:
//   ARGSEA_API_URL=https://api.example ARGSEA_TOKEN=xxx node scripts/seed-canon.mjs           (dry run, the default)
//   ARGSEA_API_URL=https://api.example ARGSEA_TOKEN=xxx node scripts/seed-canon.mjs --apply   (writes for real)
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = (name) => JSON.parse(readFileSync(join(root, 'src', 'data', 'fixtures', `${name}.json`), 'utf8'));

// Same trailing-slash rule as src/lib/api.ts: item routes reject one, the
// collection routes accept either, so the base itself always drops it.
const API_URL = (process.env.ARGSEA_API_URL ?? '').replace(/\/+$/, '');
const TOKEN = (process.env.ARGSEA_TOKEN ?? '').trim();

if (!API_URL || !TOKEN) {
	console.error('usage: ARGSEA_API_URL=<api base> ARGSEA_TOKEN=<bearer token> node scripts/seed-canon.mjs [--apply]');
	console.error('both are required; refusing to run without them so a half-configured shell never touches the database.');
	process.exit(1);
}

const APPLY = process.argv.includes('--apply');

const headers = {
	'content-type': 'application/json',
	'authorization': `Bearer ${TOKEN}`,
};

async function apiGet(path) {
	const res = await fetch(`${API_URL}${path}`, { headers });
	if (!res.ok) {
		throw new Error(`GET ${path} responded ${res.status}`);
	}
	return res.json();
}

async function apiWrite(method, path, body) {
	const res = await fetch(`${API_URL}${path}`, { method, headers, body: JSON.stringify(body) });
	return res.status;
}

// Order-insensitive on objects (key order isn't meaningful), order-sensitive
// on arrays (tags/facts order is part of what the page renders).
function sameValue(a, b) {
	if (a === b) {
		return true;
	}
	if (Array.isArray(a) || Array.isArray(b)) {
		return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((item, i) => sameValue(item, b[i]));
	}
	if (a && b && 'object' === typeof a && 'object' === typeof b) {
		const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
		return [...keys].every((key) => sameValue(a[key], b[key]));
	}
	return false;
}

function short(value) {
	if (undefined === value) {
		return 'undefined';
	}
	if ('string' === typeof value && value.length > 57) {
		return `${JSON.stringify(value.slice(0, 57))}...`;
	}
	return JSON.stringify(value);
}

function fmtDiff(diff) {
	return Object.entries(diff).map(([key, change]) => `${key}: ${short(change.from)} -> ${short(change.to)}`).join(', ');
}

// One line per record, plan or write alike, so a dry run and a real --apply
// read the same way (the idempotence check just diffs the two runs by eye).
function report(entity, name, action, detail, status) {
	const verb = 'skip' === action ? 'skip' : (APPLY ? action : `would ${action}`);
	const body = 'string' === typeof detail ? detail : fmtDiff(detail);
	const tail = undefined === status ? '' : `, http ${status}`;
	console.log(`[${entity}] ${name}: ${verb} (${body}${tail})`);
}

// ---------- projects: match by title, sync content fields, create what's missing ----------

// The brief's shorthand next to the wire's own field name: desc=shortDesc,
// est=firstLit, details=body; kind/color/period live under light, gazette and
// assist under their own keys. assist synced like any other tracked field
// here (caravan-meta contracts/2026-07-22-canon-fields-wire.md): the fixture
// is canon, so a project the fixture doesn't assist wins over a DB-side one.
const PROJECT_FIELDS = ['shortDesc', 'status', 'tags', 'facts', 'moral', 'body', 'firstLit', 'assist'];

function projectDiff(fx, db) {
	const diff = {};
	for (const key of PROJECT_FIELDS) {
		if (!sameValue(fx[key], db[key])) {
			diff[key] = { from: db[key], to: fx[key] };
		}
	}
	const dbLight = db.light ?? {};
	if (fx.light && (fx.light.kind !== dbLight.kind || fx.light.color !== dbLight.color || fx.light.period !== dbLight.period)) {
		// extinguished/letter are the admin's own edits, not tracked as canon; carry them through untouched
		diff.light = { from: db.light, to: { ...dbLight, kind: fx.light.kind, color: fx.light.color, period: fx.light.period } };
	}
	// An absent gazette on the fixture just means this project never made the
	// paper in canon; it says nothing about a story the live site ran since,
	// so only a fixture that actually defines one ever overwrites the DB's.
	if (fx.gazette && !sameValue(fx.gazette, db.gazette)) {
		diff.gazette = { from: db.gazette, to: fx.gazette };
	}
	return diff;
}

async function seedProjects() {
	const fx = fixture('projects');
	const db = await apiGet('/1/project');
	const byTitle = new Map(db.map((project) => [project.title, project]));

	for (const project of fx) {
		const existing = byTitle.get(project.title);
		if (!existing) {
			// id/createdAt/updatedAt/publishedAt are server-assigned; everything
			// else ships as the fixture already encodes it, order included, so
			// the new light lands wherever the fixture's own order says "last".
			const { id, createdAt, updatedAt, publishedAt, ...createBody } = project;
			const detail = `new record, order ${project.order}`;
			if (!APPLY) {
				report('project', project.title, 'create', detail);
				continue;
			}
			const status = await apiWrite('POST', '/1/project', createBody);
			report('project', project.title, 'create', detail, status);
			continue;
		}

		const diff = projectDiff(project, existing);
		if (0 === Object.keys(diff).length) {
			report('project', project.title, 'skip', 'no diff');
			continue;
		}
		if (!APPLY) {
			report('project', project.title, 'update', diff);
			continue;
		}
		const patchBody = Object.fromEntries(Object.entries(diff).map(([key, change]) => [key, change.to]));
		const status = await apiWrite('PATCH', `/1/project/${existing.id}`, patchBody);
		report('project', project.title, 'update', diff, status);
	}
}

// ---------- hobbies: match by name, gauge always syncs, everything else only backfills ----------

function hobbyDiff(fx, db) {
	const diff = {};
	if (!sameValue(fx.gauge, db.gauge)) {
		diff.gauge = { from: db.gauge, to: fx.gauge };
	}
	// Backfill only: a field the DB already carries (even a stale value) is the
	// keeper's own edit and stays put; only a genuinely missing key catches up.
	for (const key of Object.keys(fx)) {
		if ('gauge' === key || (key in db && undefined !== db[key])) {
			continue;
		}
		diff[key] = { from: undefined, to: fx[key] };
	}
	return diff;
}

async function seedHobbies() {
	const fx = fixture('hobbies');
	const db = await apiGet('/1/hobby');
	const byName = new Map(db.map((hobby) => [hobby.name, hobby]));

	for (const hobby of fx) {
		const existing = byName.get(hobby.name);
		if (!existing) {
			report('hobby', hobby.name, 'skip', 'no DB match; this script never creates hobbies');
			continue;
		}
		const diff = hobbyDiff(hobby, existing);
		if (0 === Object.keys(diff).length) {
			report('hobby', hobby.name, 'skip', 'no diff');
			continue;
		}
		if (!APPLY) {
			report('hobby', hobby.name, 'update', diff);
			continue;
		}
		const patchBody = Object.fromEntries(Object.entries(diff).map(([key, change]) => [key, change.to]));
		const status = await apiWrite('PATCH', `/1/hobby/${existing.id}`, patchBody);
		report('hobby', hobby.name, 'update', diff, status);
	}
}

// ---------- siteCopy: four fields only, the gazette masthead plus the hero ----------

async function seedSiteCopy() {
	const fx = fixture('siteCopy');
	const db = await apiGet('/1/copy');
	const diff = {};
	if (!sameValue(fx.heroKicker, db.heroKicker)) {
		diff.heroKicker = { from: db.heroKicker, to: fx.heroKicker };
	}
	if (!sameValue(fx.heroBody, db.heroBody)) {
		diff.heroBody = { from: db.heroBody, to: fx.heroBody };
	}
	const dbGazette = db.gazette ?? {};
	if (fx.gazette?.vol !== dbGazette.vol) {
		diff['gazette.vol'] = { from: dbGazette.vol, to: fx.gazette?.vol };
	}
	if (fx.gazette?.presently !== dbGazette.presently) {
		diff['gazette.presently'] = { from: dbGazette.presently, to: fx.gazette?.presently };
	}

	if (0 === Object.keys(diff).length) {
		report('siteCopy', 'the copy singleton', 'skip', 'no diff');
		return;
	}
	if (!APPLY) {
		report('siteCopy', 'the copy singleton', 'update', diff);
		return;
	}
	const patchBody = {
		...(diff.heroKicker && { heroKicker: fx.heroKicker }),
		...(diff.heroBody && { heroBody: fx.heroBody }),
		...((diff['gazette.vol'] || diff['gazette.presently']) && { gazette: { ...dbGazette, vol: fx.gazette?.vol, presently: fx.gazette?.presently } }),
	};
	const status = await apiWrite('PATCH', '/1/copy', patchBody);
	report('siteCopy', 'the copy singleton', 'update', diff, status);
}

// ---------- the watch: touch nothing but a signoff line the component already renders itself ----------

async function seedWatch() {
	const keeper = fixture('keeperProfile');
	const db = await apiGet('/1/watch');
	if (!db.letter) {
		report('watch', 'the current watch', 'skip', 'no watch kept');
		return;
	}

	const lines = db.letter.split('\n');
	let lastIdx = lines.length - 1;
	while (lastIdx >= 0 && '' === lines[lastIdx].trim()) {
		lastIdx--;
	}
	if (lastIdx < 0 || lines[lastIdx].trim() !== keeper.signoff.trim()) {
		report('watch', 'the current watch', 'skip', "letter's last line doesn't duplicate the signoff");
		return;
	}

	const letter = lines.slice(0, lastIdx).join('\n').trimEnd();
	const diff = { letter: { from: db.letter, to: letter } };
	if (!APPLY) {
		report('watch', 'the current watch', 'update', diff);
		return;
	}
	const status = await apiWrite('PATCH', '/1/watch', { letter });
	report('watch', 'the current watch', 'update', diff, status);
}

async function main() {
	console.log(`seed-canon: ${APPLY ? 'applying against' : 'dry run against'} ${API_URL}`);
	await seedProjects();
	await seedHobbies();
	await seedSiteCopy();
	await seedWatch();
}

main().catch((err) => {
	console.error(`seed-canon: ${err.message}`);
	process.exit(1);
});

// The helm (fixtures build; the mock builds for a kept watch): the rail lists
// the watch pin plus every charted published project, every charted hobby, and
// every charted published journal entry, charted meaning the record carries a
// coord; the watch pin's sheet reads the current watch; a sheet hangs the
// entity's own lead print (or a note's doodle) with its caption, the rail
// searches and folds, a rail or
// chart click sails the boat and opens that mark's sheet, the Flannan
// memorial opens from its own sheet and closes on Escape, a flare's tally
// unifies with ShipsLog's own argsea-flares key, dragging the water pans the
// chart, and reduced motion stills the shared characteristic clock.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import type { Hobby, Note, Project } from '../src/lib/api';

// Read (not import) the fixtures: a JSON module import would need an import
// attribute under Node's ESM loader, which the spec transform rejects
// (the same precedent as e2e/projects.spec.ts).
const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'fixtures');
const projects: Project[] = JSON.parse(readFileSync(join(fixturesDir, 'projects.json'), 'utf8'));
const hobbies: Hobby[] = JSON.parse(readFileSync(join(fixturesDir, 'hobbies.json'), 'utf8'));
const notes: Note[] = JSON.parse(readFileSync(join(fixturesDir, 'notes.json'), 'utf8'));

const chartedProjects = projects.filter((p) => p.status === 'published' && p.coord);
const chartedHobbies = hobbies.filter((h) => h.coord);
const chartedNotes = notes.filter((n) => n.status === 'published' && n.coord);
const railCount = 1 /* the watch pin */ + chartedProjects.length + chartedHobbies.length + chartedNotes.length;

// The mock builds serve a kept watch (e2e/mock-api.mjs): featured carries a
// title and charted bearings, fallback is a pre-title API steering at nothing
const FEATURED_BUILD = 'http://127.0.0.1:4822';
const FALLBACK_BUILD = 'http://127.0.0.1:4823';

test('the rail lists the watch pin, every charted project, every charted hobby, and every charted note', async ({ page }) => {
	expect(railCount).toBeGreaterThan(0);
	await page.goto('/helm');
	await expect(page.locator('.rail__item')).toHaveCount(railCount);
	await expect(page.locator('.rail__item', { hasText: 'The current watch' })).toHaveCount(1);
	for (const project of chartedProjects) {
		await expect(page.locator('.rail__item', { hasText: project.title })).toHaveCount(1);
	}
});

test('a sheet hangs the entity\'s lead print, clamped to the last one pinned, with its caption', async ({ page }) => {
	await page.goto('/helm');
	// The home lab carries three prints and a plate of 3: the plate is clamped to
	// the last print the keeper pinned rather than wrapping back round to the first
	const homeLab = hobbies.find((h) => h.name === 'The home lab')!;
	expect(homeLab.images).toHaveLength(3);
	expect(homeLab.plate).toBe(3);

	await page.locator('.rail__item', { hasText: 'The home lab' }).click();
	await expect(page.locator('.sheet__plate img')).toHaveAttribute('src', '/media/images/rack-open.svg');
	await expect(page.locator('.sheet__cap')).toHaveText(homeLab.cap);
});

test('a light with no gallery keeps the frame and the caption, and hangs no print', async ({ page }) => {
	await page.goto('/helm');
	const bare = projects.find((p) => p.title === '100k good mornings')!;
	expect(bare.images).toBeNull();

	await page.locator('.rail__item', { hasText: '100k good mornings' }).click();
	await expect(page.locator('.sheet__plate')).toHaveCount(1);
	await expect(page.locator('.sheet__plate img')).toHaveCount(0);
	await expect(page.locator('.sheet__cap')).toHaveText(bare.cap);
});

test('a note flies its doodle where a light hangs a print', async ({ page }) => {
	await page.goto('/helm');
	await page.locator('.rail__item', { hasText: 'CachyOS, three months in' }).click();
	await expect(page.locator('.sheet__doodle svg')).toHaveCount(1);
	await expect(page.locator('.sheet__plate')).toHaveCount(0);
});

test('the fixtures build keeps no watch: the chart still boots on the watch sheet, headed by the fallback, with a bare frame', async ({ page }) => {
	await page.goto('/helm');
	await expect(page.locator('#sheet')).toHaveAttribute('data-open', '');
	await expect(page.locator('#sheetBody .sheet__k')).toHaveText('Now');
	await expect(page.locator('#sheetBody h2')).toHaveText('A note from the keeper');
	await expect(page.locator('.sheet__plate')).toHaveCount(1);
	await expect(page.locator('.sheet__plate img')).toHaveCount(0);
	await expect(page.locator('.sheet__cap')).toHaveText('');
	await expect(page.locator('.rail__item[data-id="fix"] .rail__code')).toHaveText('');
});

test('a kept watch reads onto its sheet: title, kept line, postcard, season caption, letter, bearings, and what the keeper is avoiding', async ({ page }) => {
	await page.goto(`${FEATURED_BUILD}/helm`);
	const body = page.locator('#sheetBody');
	await expect(body.locator('h2')).toHaveText('Three weeks in, the paper still came out every morning.');
	await expect(page.locator('.rail__item[data-id="fix"] .rail__code')).toHaveText('kept 15 jul');
	await expect(body.locator('.sheet__plate img')).toHaveAttribute('src', '/media/images/station-photo.svg');
	await expect(body.locator('.sheet__cap')).toHaveText('from the season · jul 2026');
	await expect(body.locator('p')).toHaveText([
		'Most of my time right now goes to the ArcXP migration.',
		'Dad the rest of the time, which is most of the time.',
	]);

	// wire order, then the rotation last
	await expect(body.locator('dt')).toHaveText(['Building', 'Logging', 'Sanding', 'Avoiding']);
	await expect(body.locator('dd')).toHaveText(['Janus', 'CachyOS, three months in', 'Woodworking', 'Out of the rotation on purpose: conference talks and the piano.']);

	// a charted target links to its own mark; an uncharted hobby stays plain text
	const rows = body.locator('dl div');
	await expect(rows.nth(0).locator('.sheet__link')).toHaveAttribute('data-goto', 'p-janus');
	await expect(rows.nth(1).locator('.sheet__link')).toHaveAttribute('data-goto', 'j-cachyos-three-months-in');
	await expect(rows.nth(2).locator('.sheet__link')).toHaveCount(0);

	await rows.nth(0).locator('.sheet__link').click();
	await expect(body.locator('h2')).toHaveText('Janus');
});

test('a watch from an API before titles heads its sheet with the fallback, and bearings aimed at nothing stay plain text', async ({ page }) => {
	await page.goto(`${FALLBACK_BUILD}/helm`);
	const body = page.locator('#sheetBody');
	await expect(body.locator('h2')).toHaveText('A note from the keeper');
	await expect(body.locator('dt')).toHaveText(['Wrangling', 'Logging', 'Avoiding']);
	await expect(body.locator('dd')).toHaveText(['The ArcXP migration', 'the journal', 'Out of the rotation on purpose: conference talks and the piano.']);
	await expect(body.locator('.sheet__link')).toHaveCount(0);
});

test('the rail searches across every group and folds one group at a time', async ({ page }) => {
	await page.goto('/helm');
	const items = page.locator('.rail__item:visible');
	await expect(items).toHaveCount(railCount);

	await page.locator('#railFind').fill('piano');
	await expect(items).toHaveCount(1);
	await expect(items.first()).toContainText('Piano');

	await page.locator('#railFind').fill('no such light');
	await expect(items).toHaveCount(0);
	await expect(page.locator('.rail__empty')).toBeVisible();

	await page.locator('#railFind').fill('');
	await expect(items).toHaveCount(railCount);
	await page.locator('.rail__group[data-group-head="Hobbies"]').click();
	await expect(items).toHaveCount(railCount - chartedHobbies.length);
});

test('the chart is drawn on the ruled extent, south edge at 57.80', async ({ page }) => {
	await page.goto('/helm');
	// The plane's pixel height is the window's Mercator height: (mercY(58.70) -
	// mercY(57.80)) * 710 px/degree. Pinning it numerically pins SOUTH, since
	// nothing else feeds that number; the built island's old 57.95 gives 1014.
	const plane = page.locator('#plane');
	expect(await plane.evaluate((el) => (el as HTMLElement).offsetHeight)).toBe(1214);
	expect(await plane.evaluate((el) => parseFloat((el as HTMLElement).style.marginTop))).toBeCloseTo(-607, 0);
});

test('a light\'s sheet sets its provenance in brass and links to its case log', async ({ page }) => {
	await page.goto('/helm');

	// Janus (fixture-project-10) carries an assist and no case log
	const assisted = projects.find((p) => p.title === 'Janus')!;
	await page.locator('.rail__item', { hasText: 'Janus' }).click();
	await expect(page.locator('.sheet__built i')).toHaveText(`by hand, with ${assisted.assist!.harness} alongside`);
	await expect(page.locator('.sheet__built')).toHaveAttribute('title', `${assisted.assist!.harness} ${assisted.assist!.model}`);
	await expect(page.locator('.sheet__links a')).toHaveCount(0);

	// the flagship (fixture-project-1) is by hand, and is the one fixture light
	// with a published case log behind it
	const byHand = projects.find((p) => p.id === 'fixture-project-1')!;
	expect(byHand.assist).toBeUndefined();
	await page.locator('.rail__item', { hasText: byHand.title }).click();
	await expect(page.locator('.sheet__built i')).toHaveText('by hand');
	await expect(page.locator('.sheet__links a')).toHaveAttribute('href', `/projects/${byHand.slug}`);
});

test('a hobby\'s sheet carries no provenance row: the built line is a light\'s own', async ({ page }) => {
	await page.goto('/helm');
	await page.locator('.rail__item', { hasText: 'The home lab' }).click();
	await expect(page.locator('.sheet__built')).toHaveCount(0);
});

test('clicking a rail light sails the chart to it and opens its sheet', async ({ page }) => {
	await page.goto('/helm');
	const plane = page.locator('#plane');
	const before = await plane.evaluate((el) => getComputedStyle(el).transform);

	await page.locator('.rail__item', { hasText: 'Janus' }).click();

	await expect(page.locator('#sheetBody h2')).toHaveText('Janus');
	await expect(page.locator('#sheet')).toHaveAttribute('data-open', '');
	await expect(async () => {
		expect(await plane.evaluate((el) => getComputedStyle(el).transform)).not.toBe(before);
	}).toPass();
});

test('clicking a mark on the chart opens the same sheet the rail does', async ({ page }) => {
	await page.goto('/helm');
	await page.locator('.mk[data-id="flannan"] .mk__hit').click();
	await expect(page.locator('#sheetBody h2')).toHaveText('Flannan Isles Lighthouse');
	await expect(page.locator('#sheetBody')).toContainText('Fl(2) W 30s');
});

test('the memorial opens from the Flannan sheet and closes on Escape', async ({ page }) => {
	await page.goto('/helm');
	await page.locator('.mk[data-id="flannan"] .mk__hit').click();
	await page.locator('#openMem').click();

	const mem = page.locator('#mem');
	await expect(mem).toHaveAttribute('data-open', '');
	await expect(mem).toContainText('James Ducat · Thomas Marshall · Donald MacArthur');

	await page.keyboard.press('Escape');
	await expect(mem).not.toHaveAttribute('data-open', '');
});

test('sending a flare flips the sheet\'s line and the tally survives a reload, unified with the hobbies page\'s own key', async ({ page }) => {
	await page.goto('/helm');
	await page.locator('.rail__item', { hasText: 'The home lab' }).click();

	const line = page.locator('.sheet__flareline');
	await expect(line).toHaveText('send one up to root for this one');
	await page.locator('#fireFlare').click();
	await expect(line).toHaveText('flare away · the keeper will see it');

	// argsea-flares is the same localStorage key ShipsLog reads/writes, id-keyed
	// (src/lib/flares.ts), so a flare fired here tallies for both pages
	const homeLab = hobbies.find((h) => h.name === 'The home lab')!;
	const stored = await page.evaluate(() => localStorage.getItem('argsea-flares'));
	expect(JSON.parse(stored ?? '{}')).toEqual({ [homeLab.id]: 1 });

	await page.reload();
	await page.locator('.rail__item', { hasText: 'The home lab' }).click();
	await expect(page.locator('.sheet__flareline')).toHaveText('flare away · the keeper will see it');
});

test('dragging the water pans the chart without sailing to a different mark', async ({ page }) => {
	await page.goto('/helm');
	// boot() opens the watch pin's sheet on load (goTo('fix')), same as canon
	await expect(page.locator('#sheetBody h2')).toHaveText('A note from the keeper');
	const plane = page.locator('#plane');
	const before = await plane.evaluate((el) => getComputedStyle(el).transform);

	const sea = page.locator('#sea');
	const box = (await sea.boundingBox())!;
	const startX = box.x + box.width * 0.85, startY = box.y + box.height * 0.85;
	await page.mouse.move(startX, startY);
	await page.mouse.down();
	await page.mouse.move(startX - 140, startY - 90, { steps: 8 });
	await page.mouse.up();

	expect(await plane.evaluate((el) => getComputedStyle(el).transform)).not.toBe(before);
	// the drag panned the water, it didn't land on a mark and sail there
	await expect(page.locator('#sheetBody h2')).toHaveText('A note from the keeper');
});

test('reduced motion stills the shared characteristic clock', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/helm');

	const flare = page.locator('.mk[data-id="flannan"] .mk__flare');
	await expect(flare).toHaveCount(1);
	// no WAAPI/CSS animation is left running, and the flare sits at the
	// reduced-motion constant instead of blinking on the shared clock
	expect(await flare.evaluate((el) => el.getAnimations().length)).toBe(0);
	expect(await flare.evaluate((el) => getComputedStyle(el).opacity)).toBe('0.8');
});

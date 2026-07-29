// The helm (fixtures build): the rail lists the watch pin plus every charted
// published project, every charted hobby, and every charted published journal
// entry, charted meaning the record carries a coord; a sheet hangs the
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
	// The home lab carries two prints and a plate of 3: the plate is clamped to
	// the last print the keeper pinned rather than wrapping back round to the first
	const homeLab = hobbies.find((h) => h.name === 'The home lab')!;
	expect(homeLab.images).toHaveLength(2);
	expect(homeLab.plate).toBe(3);

	await page.locator('.rail__item', { hasText: 'The home lab' }).click();
	await expect(page.locator('.sheet__plate img')).toHaveAttribute('src', '/media/images/rack-lit.svg');
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
	await expect(page.locator('#sheetBody h2')).toHaveText('Three weeks in, the paper still came out every morning.');
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
	await expect(page.locator('#sheetBody h2')).toHaveText('Three weeks in, the paper still came out every morning.');
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

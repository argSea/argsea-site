// The helm (fixtures build): the rail lists the watch pin plus every
// published project with a berth, every charted hobby, and every journal
// entry with a berth (transcribed from design/TheChart.dc.html); a rail or
// chart click sails the boat and opens that mark's sheet, the Flannan
// memorial opens from its own sheet and closes on Escape, a flare's tally
// unifies with ShipsLog's own argsea-flares key, dragging the water pans the
// chart, and reduced motion stills the shared characteristic clock.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import type { Hobby, Note, Project } from '../src/lib/api';
import { BERTHS, JOURNAL_BERTHS } from '../src/components/islands/helmBerths';

// Read (not import) the fixtures: a JSON module import would need an import
// attribute under Node's ESM loader, which the spec transform rejects
// (the same precedent as e2e/projects.spec.ts).
const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'fixtures');
const projects: Project[] = JSON.parse(readFileSync(join(fixturesDir, 'projects.json'), 'utf8'));
const hobbies: Hobby[] = JSON.parse(readFileSync(join(fixturesDir, 'hobbies.json'), 'utf8'));
const notes: Note[] = JSON.parse(readFileSync(join(fixturesDir, 'notes.json'), 'utf8'));

const berthedProjects = projects.filter((p) => p.status === 'published' && BERTHS[p.title]);
const chartedHobbies = hobbies.filter((h) => h.coord);
const berthedNotes = notes.filter((n) => n.status === 'published' && JOURNAL_BERTHS[n.title]);
const railCount = 1 /* the watch pin */ + berthedProjects.length + chartedHobbies.length + berthedNotes.length;

test('the rail lists the watch pin, every berthed project, every charted hobby, and every berthed note', async ({ page }) => {
	expect(railCount).toBeGreaterThan(0);
	await page.goto('/helm');
	await expect(page.locator('.rail__item')).toHaveCount(railCount);
	await expect(page.locator('.rail__item', { hasText: 'The current watch' })).toHaveCount(1);
	for (const project of berthedProjects) {
		await expect(page.locator('.rail__item', { hasText: project.title })).toHaveCount(1);
	}
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

	// argsea-flares is the same localStorage key ShipsLog reads/writes, so a
	// flare fired here tallies for both pages
	const stored = await page.evaluate(() => localStorage.getItem('argsea-flares'));
	expect(JSON.parse(stored ?? '{}')).toEqual({ 'The home lab': 1 });

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

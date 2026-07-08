// Delights layer (fixtures build): the light-list coordinate flip and the
// resident cat on the 404, plus the message in a bottle on the homepage wave.
// The cat is one-per-page-view now (a client pick across the spot catalog),
// so the cat specs seed Math.random to pin a known spot (the catalog lists each
// page's header first and its overlay last).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import type { SiteCopy } from '../src/lib/api';

// Read (not import) the fixture: a JSON module import would need an import
// attribute under Node's ESM loader, which the spec transform rejects
const siteCopy: SiteCopy = JSON.parse(
	readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'fixtures', 'siteCopy.json'), 'utf8'),
);

test('the 404 placard lists a lighthouse position and flips to its story', async ({ page }) => {
	await page.goto('/404.html');
	const line = page.locator('.light-list');
	await expect(line).toContainText('last position:');

	// The line hydrates lazily and repicks its light on mount, so read the truth
	// off the reveal rather than the server-rendered position; retry the click
	// until the handler is attached
	await expect(async () => {
		await line.click();
		await expect(line).not.toContainText('last position:', { timeout: 500 });
	}).toPass();

	const story = (await line.textContent())!;
	const light = siteCopy.lighthouses.find((entry) => `${entry.name}: ${entry.line}` === story)!;
	expect(light).toBeTruthy();

	await line.click();
	await expect(line).toHaveText(`last position: ${light.pos}`);
});

test('the harbor cat heckles the wreck when poked', async ({ page }) => {
	await page.goto('/404.html');
	const cat = page.locator('.harbor-cat--wreck');
	await expect(cat).toBeVisible();
	await cat.locator('.harbor-cat__svg').click();
	await expect(page.locator('.harbor-cat__bubble')).toBeVisible();
});

test('a pointer poke draws no focus box, keyboard reach gets the ring', async ({ page }) => {
	await page.goto('/404.html');
	const svg = page.locator('.harbor-cat--wreck .harbor-cat__svg');

	// Pointer poke: the UA focus rectangle stays suppressed
	await svg.click();
	expect(await svg.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('none');

	// Keyboard reach: Tab through the chrome until the cat holds focus, then the
	// :focus-visible ring must be there
	await page.reload();
	let reached = false;
	for (let i = 0; i < 40 && !reached; i++) {
		await page.keyboard.press('Tab');
		reached = await page.evaluate(() => document.activeElement?.classList.contains('harbor-cat__svg') ?? false);
	}
	expect(reached).toBe(true);
	expect(await svg.evaluate((el) => el.matches(':focus-visible') && getComputedStyle(el).outlineStyle !== 'none')).toBe(true);
});

test('the wreck cat bubble stays on screen at 390px', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/404.html');
	await page.locator('.harbor-cat--wreck .harbor-cat__svg').click();

	const box = (await page.locator('.harbor-cat__bubble').boundingBox())!;
	expect(box.x).toBeGreaterThanOrEqual(0);
	expect(box.x + box.width).toBeLessThanOrEqual(390);
});

test('poking the boat drops a bottled proverb, tap releases it', async ({ page }) => {
	await page.goto('/');
	// The boat never stops sailing, so a real click would wait forever for it
	// to hold still; dispatch the click at wherever it is right now
	await page.locator('.boat-track').dispatchEvent('click');

	const note = page.locator('.bottle-note');
	await expect(note).toBeVisible();
	const proverb = await note.locator('.bottle-note__proverb').textContent();
	expect(siteCopy.bottleProverbs).toContain(proverb);

	await note.click();
	await expect(note).toHaveCount(0);
});

test('never more than one cat on a page, across reloads', async ({ page }) => {
	for (const path of ['/', '/projects', '/hobbies', '/notes', '/404.html']) {
		await page.goto(path);
		// let the director settle its pick (or decide the pick is an overlay spot)
		await page.waitForTimeout(400);
		expect(await page.locator('.harbor-cat').count()).toBeLessThanOrEqual(1);
	}
	// hammer one page: a fresh pick per load must still never double up
	for (let i = 0; i < 8; i++) {
		await page.goto('/');
		await page.waitForTimeout(300);
		expect(await page.locator('.harbor-cat').count()).toBeLessThanOrEqual(1);
	}
});

test('the desktop header wears the lying cat on the nav link', async ({ page }) => {
	// Math.random 0 pins the first enabled spot: each page's header
	await page.addInitScript(() => { Math.random = () => 0; });
	await page.setViewportSize({ width: 1200, height: 800 });
	await page.goto('/projects');

	await expect(page.locator('.harbor-cat--lying')).toBeVisible();
	// it rides the nav link, up in the header band
	const box = (await page.locator('.cat-mount').boundingBox())!;
	expect(box.y).toBeLessThan(90);
});

test('the narrow nav is a hamburger that opens and closes', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');

	// the desktop links are gone; the burger stands in
	await expect(page.locator('.site-nav .links')).toBeHidden();
	const burger = page.locator('.nav-burger');
	await expect(burger).toBeVisible();
	await expect(burger).toHaveAttribute('aria-expanded', 'false');

	await burger.click();
	await expect(page.locator('#nav-menu')).toBeVisible();
	await expect(burger).toHaveAttribute('aria-expanded', 'true');

	// a link tap closes it
	await page.locator('#nav-menu a', { hasText: 'hobbies' }).click({ noWaitAfter: true });
	await expect(page.locator('#nav-menu')).toHaveCount(0);
});

test('on mobile the header cat is menu-gated: it lies on the open panel edge', async ({ page }) => {
	// Math.random 0 pins the header spot
	await page.addInitScript(() => { Math.random = () => 0; });
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/projects');
	await page.waitForTimeout(400);

	// nothing clamped over the brand row; the header cat waits for the menu
	await expect(page.locator('.harbor-cat')).toHaveCount(0);

	await page.locator('.nav-burger').click();
	await expect(page.locator('#nav-menu .harbor-cat--lying')).toBeVisible();
	// still exactly one cat
	await expect(page.locator('.harbor-cat')).toHaveCount(1);

	// it rides the panel itself, draped over the top border, not any nav link
	await expect(page.locator('.nav-menu__item .cat-mount')).toHaveCount(0);
	const panel = (await page.locator('#nav-menu').boundingBox())!;
	const mount = (await page.locator('.cat-mount--menu').boundingBox())!;
	expect(mount.y).toBeLessThan(panel.y);
	expect(mount.y + mount.height).toBeGreaterThan(panel.y);
});

test('the hamburger menu closes on Escape', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');
	await page.locator('.nav-burger').click();
	await expect(page.locator('#nav-menu')).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(page.locator('#nav-menu')).toHaveCount(0);
});

test('an overlay spot shows the cat only when the overlay opens', async ({ page }) => {
	// Math.random just under 1 pins the last enabled spot: projects.overlay
	await page.addInitScript(() => { Math.random = () => 0.999999; });
	await page.goto('/projects');
	await page.waitForTimeout(400);

	// the pick is an overlay spot, so nothing rides the page on load
	await expect(page.locator('.harbor-cat')).toHaveCount(0);

	await page.locator('.projects-grid .card-wrap').first().click();
	await expect(page.locator('.harbor-cat')).toBeVisible();
});

test('a static pick plus an opened overlay is still one cat, never two', async ({ page }) => {
	await page.addInitScript(() => { Math.random = () => 0; });
	await page.goto('/projects');
	await expect(page.locator('.harbor-cat--lying')).toBeVisible();

	await page.locator('.projects-grid .card-wrap').first().click();
	// the overlay must not add a second cat when the pick already sits in the header
	await expect(page.locator('.harbor-cat')).toHaveCount(1);
});

test('the filterTag cat follows the active chip under reduced motion', async ({ page }) => {
	// Math.random 0.3 pins the second enabled spot on projects: the filterTag.
	// Reduced motion kills animationend, so this proves the class-swap remeasure.
	await page.addInitScript(() => { Math.random = () => 0.3; });
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/projects');
	await expect(page.locator('.harbor-cat--perched')).toBeVisible();

	const chipCenter = async (name: string) => {
		const box = (await page.locator('.filter-row .chip', { hasText: name }).boundingBox())!;
		return box.x + box.width / 2;
	};
	const catCenter = async () => {
		const box = (await page.locator('.cat-mount').boundingBox())!;
		return box.x + box.width / 2;
	};

	expect(Math.abs((await catCenter()) - (await chipCenter('all')))).toBeLessThan(20);

	await page.locator('.filter-row .chip', { hasText: 'backend' }).click();
	await expect(async () => {
		expect(Math.abs((await catCenter()) - (await chipCenter('backend')))).toBeLessThan(20);
	}).toPass();
});

test('reduced motion keeps the wreck grounded at its listing tilt', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/404.html');
	const wreck = page.locator('.wreck');
	await expect(wreck).toBeVisible();
	// The tilt is a base transform, so the kill-switch must not right the boat
	expect(await wreck.evaluate((element) => getComputedStyle(element).transform)).not.toBe('none');
});

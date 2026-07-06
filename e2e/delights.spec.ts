// Delights layer (fixtures build): the light-list coordinate flip and the
// resident cat on the 404, plus the message in a bottle on the homepage wave.
// The cat on postcard/note overlays is a 1-in-3 roll, so only the always-on
// wreck perch is asserted.
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
	// off the reveal rather than the server-rendered position — retry the click
	// until the handler is attached
	await expect(async () => {
		await line.click();
		await expect(line).not.toContainText('last position:', { timeout: 500 });
	}).toPass();

	const story = (await line.textContent())!;
	const light = siteCopy.lighthouses.find((entry) => `${entry.name} — ${entry.line}` === story)!;
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
	// to hold still — dispatch the click at wherever it is right now
	await page.locator('.boat-track').dispatchEvent('click');

	const note = page.locator('.bottle-note');
	await expect(note).toBeVisible();
	const proverb = await note.locator('.bottle-note__proverb').textContent();
	expect(siteCopy.bottleProverbs).toContain(proverb);

	await note.click();
	await expect(note).toHaveCount(0);
});

test('reduced motion keeps the wreck grounded at its listing tilt', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/404.html');
	const wreck = page.locator('.wreck');
	await expect(wreck).toBeVisible();
	// The tilt is a base transform, so the kill-switch must not right the boat
	expect(await wreck.evaluate((element) => getComputedStyle(element).transform)).not.toBe('none');
});

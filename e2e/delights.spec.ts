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

	const pos = (await line.textContent())!.replace('last position: ', '');
	const light = siteCopy.lighthouses.find((entry) => entry.pos === pos)!;
	expect(light).toBeTruthy();

	await line.click();
	await expect(line).toHaveText(`${light.name} — ${light.line}`);
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

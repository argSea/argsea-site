// The Keeper's Journal (fixtures build): doodles appear for notes that carry
// one — small in the row, larger beside the handwritten caption in the open
// entry — and the sign-off is the keeper's.
import { test, expect } from '@playwright/test';

// Rows run newest-first: the re-architecting note (row 0) and CachyOS (row 1)
// carry a doodle; the queue note (row 2) carries none.
const DOODLED_ROW = 1;
const UNDOODLED_ROW = 2;

test('only the doodled note rows show a doodle', async ({ page }) => {
	await page.goto('/notes');
	const rows = page.locator('.note-row');
	await expect(rows).toHaveCount(3);
	await expect(page.locator('.note-row__doodle')).toHaveCount(2);
	await expect(rows.nth(UNDOODLED_ROW).locator('.note-row__doodle')).toHaveCount(0);
});

test('a row shows its date and conditions line', async ({ page }) => {
	await page.goto('/notes');
	const row = page.locator('.note-row').nth(DOODLED_ROW);
	await expect(row.locator('.note-row__date')).toHaveText('apr 2026');
	await expect(row.locator('.note-row__conditions')).toHaveText('steady winds · kernel freshly compiled');
});

test('the entry shows the doodle and its caption for a doodled note', async ({ page }) => {
	await page.goto('/notes');
	await page.locator('.note-row').nth(DOODLED_ROW).click();

	const letter = page.locator('.overlay-card.letter');
	await expect(letter).toBeVisible();
	await expect(letter.locator('.letter__conditions')).toHaveText('steady winds · kernel freshly compiled');
	await expect(letter.locator('.letter__doodle')).toBeVisible();
	await expect(letter.locator('.letter__doodle-caption')).toHaveText('a boat that mostly steers itself');
});

test('an undoodled note gets no marginalia in the entry', async ({ page }) => {
	await page.goto('/notes');
	await page.locator('.note-row').nth(UNDOODLED_ROW).click();

	const letter = page.locator('.overlay-card.letter');
	await expect(letter).toBeVisible();
	await expect(letter.locator('.letter__marginalia')).toHaveCount(0);
});

test('the entry signs off with the keeper fixture', async ({ page }) => {
	await page.goto('/notes');
	await page.locator('.note-row').first().click();
	await expect(page.locator('.letter__signature')).toHaveText('— j');
});

test('reduced motion keeps the doodle resting tilt', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/notes');
	const doodle = page.locator('.note-row__doodle').first();
	await expect(doodle).toBeVisible();
	// The tilt is a base transform, so the kill-switch must not flatten it
	expect(await doodle.evaluate((element) => getComputedStyle(element).transform)).not.toBe('none');
});

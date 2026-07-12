// The Keeper's Journal (fixtures build): a note's doodle (if any) only ever
// appears in the open entry, beside its handwritten caption; the sign-off is
// the keeper's.
import { test, expect } from '@playwright/test';

// Rows run newest-first: the re-architecting note (row 0) and CachyOS (row 1)
// carry a doodle; the queue note (row 2) carries none.
const DOODLED_ROW = 1;
const UNDOODLED_ROW = 2;

test('rows carry no doodle of their own', async ({ page }) => {
	await page.goto('/notes');
	const rows = page.locator('.note-row');
	await expect(rows).toHaveCount(3);
	await expect(page.locator('.note-row svg')).toHaveCount(0);
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
	await expect(page.locator('.letter__signature')).toHaveText('- j');
});

test('an entry tied to a light shows "found in", linking back to it', async ({ page }) => {
	await page.goto('/notes');
	// row 0, "What re-architecting taught me...", is tied to the flagship via noteIds
	await page.locator('.note-row').first().click();

	const letter = page.locator('.overlay-card.letter');
	await expect(letter.locator('.letter__found-in-label')).toHaveText('found in');
	const link = letter.locator('.letter__found-in-link');
	await expect(link).toHaveText('✷ The Great Un-monolithing →');
});

test('an untied entry gets no "found in" block', async ({ page }) => {
	await page.goto('/notes');
	// row 1, "CachyOS, three months in", ties to no project
	await page.locator('.note-row').nth(DOODLED_ROW).click();

	const letter = page.locator('.overlay-card.letter');
	await expect(letter).toBeVisible();
	await expect(letter.locator('.letter__found-in')).toHaveCount(0);
});

test('reduced motion keeps the journal tilt', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/notes');
	const journal = page.locator('.journal');
	await expect(journal).toBeVisible();
	// The tilt is a base transform, so the kill-switch must not flatten it
	expect(await journal.evaluate((element) => getComputedStyle(element).transform)).not.toBe('none');
});

// Notes page (fixtures build): photo prints appear for the imaged note only —
// small in its row, larger in the letter — and the sign-off is the keeper's.
import { test, expect } from '@playwright/test';

// Rows run newest-first; the CachyOS note (row 2) is the only imaged fixture
const IMAGED_ROW = 1;
const IMAGE_SRC = '/media/images/cachyos-three-months.jpg';

test('only the imaged note row shows a print thumbnail', async ({ page }) => {
	await page.goto('/notes');
	const rows = page.locator('.note-row');
	await expect(rows).toHaveCount(3);
	await expect(page.locator('.note-row__print')).toHaveCount(1);
	await expect(rows.nth(IMAGED_ROW).locator('.note-row__print img')).toHaveAttribute('src', IMAGE_SRC);
});

test('the letter shows the snapshot for the imaged note', async ({ page }) => {
	await page.goto('/notes');
	await page.locator('.note-row').nth(IMAGED_ROW).click();

	const letter = page.locator('.overlay-card.letter');
	await expect(letter).toBeVisible();
	await expect(letter.locator('.letter__print img')).toHaveAttribute('src', IMAGE_SRC);
});

test('a note without an image gets no print', async ({ page }) => {
	await page.goto('/notes');
	await page.locator('.note-row').first().click();

	const letter = page.locator('.overlay-card.letter');
	await expect(letter).toBeVisible();
	await expect(letter.locator('.letter__print')).toHaveCount(0);
});

test('the letter signs off with the keeper fixture', async ({ page }) => {
	await page.goto('/notes');
	await page.locator('.note-row').first().click();
	await expect(page.locator('.letter__signature')).toHaveText('— j');
});

test('reduced motion keeps the print resting tilt', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/notes');
	const print = page.locator('.note-row__print').first();
	await expect(print).toBeVisible();
	// The tilt is a base transform, so the kill-switch must not flatten it
	expect(await print.evaluate((element) => getComputedStyle(element).transform)).not.toBe('none');
});

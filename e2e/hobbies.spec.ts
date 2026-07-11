// The hobby graveyard (fixtures build): a still-burning hobby gets the lamp
// marker and the gold pill, a resting one gets its own marker/pill, and the
// manila record modal opens with the found/cause/return fields and
// leave-a-flower, persisted to localStorage keyed by the hobby's id.
import { test, expect } from '@playwright/test';

test('the register renders one row per hobby, still-burning first', async ({ page }) => {
	await page.goto('/hobbies');
	const rows = page.locator('.graveyard__row');
	await expect(rows).toHaveCount(5);
	await expect(rows.first().locator('.graveyard__name')).toHaveText('The home lab');
});

test('a still-burning hobby wears the lamp marker and the gold pill', async ({ page }) => {
	await page.goto('/hobbies');
	const row = page.locator('.graveyard__row').first();
	await expect(row.locator('.graveyard__lamp')).toBeVisible();
	await expect(row.locator('.graveyard__pill')).toHaveText('still on watch');
	// alive rows never carry the resting anchor spot
	await expect(row).not.toHaveClass(/graveyard__row--resting/);
});

test('a resting hobby with a sticks marker reads its disposition', async ({ page }) => {
	await page.goto('/hobbies');
	// Piano (row 1) has no explicit marker (falls to stone); Music theory
	// (row 2) is the first with marker: 'sticks'
	const row = page.locator('.graveyard__row').nth(2);
	await expect(row.locator('.graveyard__name')).toHaveText('Music theory');
	await expect(row.locator('.graveyard__sticks-plate')).toBeVisible();
	await expect(row.locator('.graveyard__pill')).toHaveText('laid to rest');
	await expect(row).toHaveClass(/graveyard__row--resting/);
});

test('a row opens the keeper\'s record modal with the found/cause/return fields', async ({ page }) => {
	await page.goto('/hobbies');
	await page.locator('.graveyard__row').nth(1).click(); // Piano

	const modal = page.locator('.record-modal');
	await expect(modal).toBeVisible();
	await expect(modal.locator('.record-modal__kicker')).toContainText('plot 02');
	await expect(modal.locator('.record-modal__name')).toHaveText('Piano');
	const grid = modal.locator('.record-modal__grid');
	await expect(grid).toContainText('one shaky recording the family still requests');
	await expect(grid).toContainText('got good enough, which was the goal');
});

test('leaving a flower increments the count and survives a reload', async ({ page }) => {
	await page.goto('/hobbies');
	await page.locator('.graveyard__row').nth(1).click();

	const modal = page.locator('.record-modal');
	await expect(modal.locator('.record-modal__flower-count')).toHaveText('no flowers yet');
	await modal.locator('.record-modal__flower-btn').click();
	await expect(modal.locator('.record-modal__flower-count')).toHaveText('1 left so far');

	await page.reload();
	await page.locator('.graveyard__row').nth(1).click();
	await expect(page.locator('.record-modal .record-modal__flower-count')).toHaveText('1 left so far');
});

test('the record modal closes on Escape', async ({ page }) => {
	await page.goto('/hobbies');
	await page.locator('.graveyard__row').first().click();
	await expect(page.locator('.record-modal')).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(page.locator('.record-modal')).toHaveCount(0);
});

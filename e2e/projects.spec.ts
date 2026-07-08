// Projects page (fixtures build): grid-card stamps per design v4, a stampless
// postcard-back overlay, and reduced-motion stillness on the stamps.
import { test, expect, type Locator } from '@playwright/test';

// The Stamp renderer's boxes at the grid's 0.9 scale: rect 34×42, circle 52×52
const RECT_W = 34 * 0.9;
const RECT_H = 42 * 0.9;
const CIRCLE_D = 52 * 0.9;

// Computed size, not boundingBox: the wiggle animation rotates the box
async function computedSize(stamp: Locator): Promise<{ width: number; height: number }> {
	return stamp.evaluate((element) => {
		const style = getComputedStyle(element);
		return { width: parseFloat(style.width), height: parseFloat(style.height) };
	});
}

test('every grid card wears its stamp at 0.9 scale', async ({ page }) => {
	await page.goto('/projects');
	const cards = page.locator('.projects-grid .card-wrap');
	await expect(cards).toHaveCount(6);
	await expect(cards.locator('[data-stamp]')).toHaveCount(6);

	// fixture card 1 wears a rect stamp, card 2 a circle postmark
	const rect = await computedSize(cards.nth(0).locator('[data-stamp="rect"]'));
	expect(rect.width).toBeCloseTo(RECT_W, 1);
	expect(rect.height).toBeCloseTo(RECT_H, 1);

	const circle = await computedSize(cards.nth(1).locator('[data-stamp="circle"]'));
	expect(circle.width).toBeCloseTo(CIRCLE_D, 1);
	expect(circle.height).toBeCloseTo(CIRCLE_D, 1);
});

test('the postcard-back overlay carries no stamp', async ({ page }) => {
	await page.goto('/projects');
	await page.locator('.projects-grid .card-wrap').first().click();

	const overlay = page.locator('.overlay-card');
	await expect(overlay).toBeVisible();
	await expect(overlay.locator('.photo-print')).toBeVisible();
	await expect(overlay.locator('[data-stamp]')).toHaveCount(0);
});

// emulateMedia, not test.use({ reducedMotion }): the context option does not
// reach matchMedia under this runner/browser pairing, the page-level API does
test('reduced motion stills the grid stamps', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/projects');
	const stamp = page.locator('.projects-grid [data-stamp]').first();
	await expect(stamp).toBeVisible();
	expect(await stamp.evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
});

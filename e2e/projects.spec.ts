// Projects page (fixtures build): the keeper's wall pins all six postcards,
// filtering fades the rest without reflowing the wall, and reduced motion
// keeps every card's resting tilt (a base transform, not an animation).
//
// Design v5 moved the corner stamp off the card front onto the postcard-back
// overlay's convention of "no stamp on the front" (design/Projects.dc.html);
// the old grid-card-stamp assertions here are gone because the stamp no
// longer renders on the wall at all, not because a preserved hook broke.
import { test, expect } from '@playwright/test';

test('the wall pins all six postcards', async ({ page }) => {
	await page.goto('/projects');
	const cards = page.locator('.projects-grid .card-wrap');
	await expect(cards).toHaveCount(6);
	await expect(cards.locator('.postcard__caption-title')).toHaveCount(6);
});

test('filtering fades non-matching postcards and leaves their spots empty', async ({ page }) => {
	await page.goto('/projects');
	const cards = page.locator('.projects-grid .card-wrap');

	await page.locator('.filter-row .chip', { hasText: 'games' }).click();

	// the wall never reflows: all six wrappers stay put, matching or not
	await expect(cards).toHaveCount(6);
	const visible = cards.locator('.postcard__caption-title', { hasText: 'Meo Wave Race' });
	await expect(visible).toBeVisible();

	const hiddenCount = await page.locator('.projects-grid .card-wrap--hidden').count();
	expect(hiddenCount).toBe(5);
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
test('reduced motion keeps a pinned postcard at its resting tilt', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/projects');
	const card = page.locator('.projects-grid .card-wrap').first();
	await expect(card).toBeVisible();

	// the tilt is a base transform, so the kill-switch must not flatten it
	expect(await card.evaluate((element) => getComputedStyle(element).transform)).not.toBe('none');
	expect(await card.evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
});

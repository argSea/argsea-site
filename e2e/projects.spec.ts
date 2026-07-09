// Projects page (fixtures build), now the lights: the coast pins one beacon
// per published project, filtering dims the rest of the coast without
// moving them while the register narrows to just the matches, a beacon
// click scrolls to its row without opening the entry, and reduced motion
// holds every lamp static (no Web Animations API animation running), per
// the hard "every light burns steady" rule.
import { test, expect } from '@playwright/test';

test('the coast lights one beacon per published project', async ({ page }) => {
	await page.goto('/projects');
	await expect(page.locator('.coast__pano .beacon')).toHaveCount(6);
	await expect(page.locator('.register .register__row')).toHaveCount(6);
});

test('filtering narrows the register and dims the rest of the coast', async ({ page }) => {
	await page.goto('/projects');

	await page.locator('.filter-row .chip', { hasText: 'games' }).click();

	// the register only lists what matches
	const rows = page.locator('.register .register__row');
	await expect(rows).toHaveCount(1);
	await expect(rows.locator('.register__name')).toHaveText('Meo Wave Race');

	// the coast never reflows: all six beacons stay put, matching or not.
	// The opacity fade is a CSS transition, so poll rather than read it once
	await expect(async () => {
		const dimmed = await page.locator('.coast__pano .beacon').evaluateAll(
			(elements) => elements.filter((element) => Number(getComputedStyle(element).opacity) < 0.5).length,
		);
		expect(dimmed).toBe(5);
	}).toPass();
});

test('a beacon click scrolls to its register row and flashes it, not the entry', async ({ page }) => {
	await page.goto('/projects');
	await page.locator('.coast__pano .beacon').first().click();

	await expect(page.locator('.overlay-card')).toHaveCount(0);
	await expect(page.locator('#light-row-fixture-project-1')).toHaveClass(/register__row--flash/);
});

test('a register row opens the Light List entry', async ({ page }) => {
	await page.goto('/projects');
	await page.locator('.register .register__row').first().click();

	const overlay = page.locator('.overlay-card');
	await expect(overlay).toBeVisible();
	await expect(overlay.locator('.light-entry__title')).toHaveText('The Great Un-monolithing');
	await expect(overlay.locator('.light-entry__code')).toHaveText('Fl W 8s');
	await expect(overlay.locator('.overlay-kicker')).toContainText('No. 002');
});

test('an extinguished light reads dark on the register and in its entry', async ({ page }) => {
	await page.goto('/projects');
	await page.locator('.filter-row .chip', { hasText: 'games' }).click();

	const row = page.locator('.register .register__row').first();
	await expect(row.locator('.register__status .status-pill')).toHaveText('dark · 2020');

	await row.click();
	await expect(page.locator('.light-entry__decoded')).toContainText('formerly flashing green');
	await expect(page.locator('.light-entry__decoded')).toContainText('extinguished 2020');
});

// emulateMedia, not test.use({ reducedMotion }): the context option does not
// reach matchMedia under this runner/browser pairing, the page-level API does
test('reduced motion holds every lamp static, no Web Animations running', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/projects');

	const core = page.locator('.register .register__row .register__core').first();
	await expect(core).toBeVisible();
	expect(await core.evaluate((element) => element.getAnimations().length)).toBe(0);
	expect(Number(await core.evaluate((element) => getComputedStyle(element).opacity))).toBeGreaterThan(0);
});

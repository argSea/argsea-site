// Projects page (fixtures build), now the lights: the coast pins one beacon
// per published project, filtering dims the rest of the coast without
// moving them while the register keeps every row mounted and collapses the
// non-matches in place, a beacon click opens that light's entry, and
// reduced motion holds every lamp static (no Web Animations API animation
// running), per the hard "every light burns steady" rule.
import { test, expect } from '@playwright/test';

test('the coast lights one beacon per published project', async ({ page }) => {
	await page.goto('/projects');
	await expect(page.locator('.coast__pano .beacon')).toHaveCount(9);
	await expect(page.locator('.register .register__row')).toHaveCount(9);
});

test('filtering narrows the register and dims the rest of the coast', async ({ page }) => {
	await page.goto('/projects');

	await page.locator('.filter-row .chip', { hasText: 'games' }).click();

	// every row stays mounted; only what matches stays expanded
	await expect(page.locator('.register .register__row')).toHaveCount(9);
	const rows = page.locator('.register .register__row:not(.register__row--collapsed)');
	await expect(rows).toHaveCount(1);
	await expect(rows.locator('.register__name')).toHaveText('Meo Wave Race');

	// the coast never reflows: all nine beacons stay put, matching or not.
	// The opacity fade is a CSS transition, so poll rather than read it once
	await expect(async () => {
		const dimmed = await page.locator('.coast__pano .beacon').evaluateAll(
			(elements) => elements.filter((element) => Number(getComputedStyle(element).opacity) < 0.5).length,
		);
		expect(dimmed).toBe(8);
	}).toPass();
});

test('a beacon click opens its light entry', async ({ page }) => {
	await page.goto('/projects');
	await page.locator('.coast__pano .beacon').first().click();

	const overlay = page.locator('.overlay-card');
	await expect(overlay).toBeVisible();
	await expect(overlay.locator('.light-entry__title')).toHaveText('The Great Un-monolithing');
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

test('exactly one status pill is visible per row at desktop width', async ({ page }) => {
	await page.goto('/projects');
	const row = page.locator('.register .register__row').first();
	// Both the desktop and mobile-variant pill are always in the DOM (CSS
	// picks one per breakpoint); only visibility proves the fix, not count.
	await expect(row.locator('.status-pill:visible')).toHaveCount(1);
});

test('the register gives its locked height back on a single-result filter', async ({ page }) => {
	await page.goto('/projects');
	const register = page.locator('.register');
	const fullHeight = await register.evaluate((element) => element.getBoundingClientRect().height);

	await page.locator('.filter-row .chip', { hasText: 'games' }).click();

	// The shrink glides in (~.4s) once the leavers are gone, so poll for it
	await expect(async () => {
		const height = await register.evaluate((element) => element.getBoundingClientRect().height);
		expect(height).toBeLessThan(fullHeight * 0.6);
	}).toPass();
});

test('an extinguished light reads dark on the register and in its entry', async ({ page }) => {
	await page.goto('/projects');
	await page.locator('.filter-row .chip', { hasText: 'games' }).click();

	const row = page.locator('.register .register__row:not(.register__row--collapsed)');
	await expect(row.locator('.register__status .status-pill')).toHaveText('dark · 2020');

	await row.click();
	await expect(page.locator('.light-entry__decoded')).toContainText('formerly flashing green');
	await expect(page.locator('.light-entry__decoded')).toContainText('extinguished 2020');
});

test('a quick light codes as Q with no period and reads plainly', async ({ page }) => {
	await page.goto('/projects');
	const row = page.locator('#light-row-fixture-project-7');
	await expect(row.locator('.register__code')).toHaveText('Q W');

	await row.click();
	const overlay = page.locator('.overlay-card');
	await expect(overlay.locator('.light-entry__code')).toHaveText('Q W');
	await expect(overlay.locator('.light-entry__decoded')).toContainText('flashing about once a second');
});

test('a morse light codes its letter and draws a dot-dash timing diagram', async ({ page }) => {
	await page.goto('/projects');
	const row = page.locator('#light-row-fixture-project-8');
	await expect(row.locator('.register__code')).toHaveText('Mo(A) W 8s');

	await row.click();
	const overlay = page.locator('.overlay-card');
	await expect(overlay.locator('.light-entry__code')).toHaveText('Mo(A) W 8s');
	await expect(overlay.locator('.light-entry__decoded')).toContainText('tapping the letter A in Morse code');
	// A is dot-dash: exactly two lit bars in the diagram
	await expect(overlay.locator('.light-entry__timing-lit')).toHaveCount(2);
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

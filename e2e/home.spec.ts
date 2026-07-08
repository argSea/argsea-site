// Homepage (fixtures build): the mantel shows exactly the featured trio, its
// overlay carries the stamp+postmark corner, and the contact surfaces render
// the keeper fixture.
import { test, expect } from '@playwright/test';

// The fixture mantel: the three projects flagged featured, in order
const FEATURED_TRIO = ['The Great Un-monolithing', 'Newsroom plumbing', '100k good mornings'];

test('the mantel shows exactly the featured trio', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('.home-postcards .postcard__title')).toHaveText(FEATURED_TRIO);
});

test('the homepage postcard overlay carries the stamp', async ({ page }) => {
	await page.goto('/');
	await page.locator('.home-postcards .card-wrap').first().click();

	const overlay = page.locator('.overlay-card');
	await expect(overlay).toBeVisible();
	await expect(overlay.locator('.postcard-back__see-all')).toBeVisible();
	await expect(overlay.locator('[data-stamp]')).toHaveCount(1);
});

test('contact band and footer read the keeper fixture', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('.contact__actions a').first()).toHaveAttribute('href', 'mailto:hello@argsea.com');

	const socials = page.locator('.site-footer .socials a');
	await expect(socials).toHaveCount(3);
	await expect(socials.nth(0)).toHaveAttribute('href', 'https://github.com/argsea');
	await expect(socials.nth(1)).toHaveAttribute('href', 'https://linkedin.com/in/argsea');
	await expect(socials.nth(2)).toHaveAttribute('href', 'mailto:hello@argsea.com');
});

// The mock-API builds (see e2e/mock-api.mjs): featured proves the mantel
// follows the featured flag rather than list position; fallback proves the
// mantel never empties; both prove the keeper profile is fetched, not baked in.
import { test, expect } from '@playwright/test';

const FEATURED_BUILD = 'http://127.0.0.1:4822';
const FALLBACK_BUILD = 'http://127.0.0.1:4823';

test('the mantel follows the featured flag, not list position', async ({ page }) => {
	await page.goto(`${FEATURED_BUILD}/`);
	await expect(page.locator('.home-lights .home-lights__title'))
		.toHaveText(['Meo Wave Race', 'This website', 'The home lab']);
});

test('with nothing featured the mantel falls back to the first three by order', async ({ page }) => {
	await page.goto(`${FALLBACK_BUILD}/`);
	await expect(page.locator('.home-lights .home-lights__title'))
		.toHaveText(['The Great Un-monolithing', 'Newsroom plumbing', '100k good mornings']);
});

test('contact band, socials, and sign-off come from the fetched profile', async ({ page }) => {
	await page.goto(`${FEATURED_BUILD}/`);
	await expect(page.locator('.contact__actions a').first()).toHaveAttribute('href', 'mailto:keeper@example.test');
	await expect(page.locator('.site-footer .socials a').first()).toHaveAttribute('href', 'https://github.com/mock-keeper');

	await page.goto(`${FEATURED_BUILD}/notes`);
	await page.locator('.note-row').first().click();
	await expect(page.locator('.letter__signature')).toHaveText('- the mock keeper');
});

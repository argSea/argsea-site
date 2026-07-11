// Homepage (fixtures build): the mantel is the flagship card plus the
// featured trio's other two, a card opens the shared Light List entry, and
// the contact surfaces render the keeper fixture.
import { test, expect } from '@playwright/test';

// The fixture mantel: the flagship first, then the two other projects
// flagged featured, in order
const MANTEL_TITLES = ['The Great Un-monolithing', 'Newsroom plumbing', '100k good mornings'];

test('the mantel shows the flagship card plus the featured trio’s other two', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('.home-lights .home-lights__title')).toHaveText(MANTEL_TITLES);
	await expect(page.locator('.home-lights__flagship-pill')).toHaveText('flagship');
});

test('the homepage lamp card opens the Light List entry', async ({ page }) => {
	await page.goto('/');
	await page.locator('.home-lights .card-wrap').first().click();

	const overlay = page.locator('.overlay-card');
	await expect(overlay).toBeVisible();
	await expect(overlay.locator('.light-entry__title')).toHaveText('The Great Un-monolithing');
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

test('the journal strip shows the newest notes and links out to /notes', async ({ page }) => {
	await page.goto('/');
	const rows = page.locator('.journal-strip__row');
	await expect(rows).toHaveCount(3);
	await expect(rows.first().locator('.journal-strip__title')).toHaveText('What re-architecting taught me about not architecting');
	await expect(rows.first()).toHaveAttribute('href', '/notes');
});

test('the flagship card carries its facts, capped at four in a 2x2 grid', async ({ page }) => {
	await page.goto('/');
	const facts = page.locator('.home-lights__facts .home-lights__facts-row');
	await expect(facts).toHaveCount(4);
	await expect(facts.first().locator('.home-lights__facts-label')).toHaveText('ownership');
});

test('the flagship card carries the characteristic code and status', async ({ page }) => {
	await page.goto('/');
	const char = page.locator('.home-lights__flagship .home-lights__char');
	await expect(char).toHaveText('Fl W 8s · lit');
});

// The mock-API builds (see e2e/mock-api.mjs): featured proves the mantel
// follows the featured flag rather than list position; fallback proves the
// mantel never empties; both prove the keeper profile is fetched, not baked in.
import { test, expect } from '@playwright/test';

const FEATURED_BUILD = 'http://127.0.0.1:4822';
const FALLBACK_BUILD = 'http://127.0.0.1:4823';

test('the two small cards follow the featured flag, not list position', async ({ page }) => {
	await page.goto(`${FEATURED_BUILD}/`);
	// the flagship (order 1) always leads; the mock's featured flag (order
	// 4-6) picks the other two, capped at two, never by title matching
	await expect(page.locator('.home-lights .home-lights__title'))
		.toHaveText(['The Great Un-monolithing', 'Meo Wave Race', 'This website']);
});

test('with nothing else featured the two small cards fall back to the next two by order', async ({ page }) => {
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

// The mock API serves the checked-in hobbies fixture verbatim over the real
// wire route, so this exercises the api.ts mapping layer's kind derivation
// (active → alive; !active + haunt-flavored disposition → haunt; otherwise
// dark) against a genuinely kind-less document, not just the fixture path.
test('a wire hobby with only `active` (no `kind`) derives correctly through the mock API', async ({ page }) => {
	await page.goto(`${FEATURED_BUILD}/hobbies`);
	const rows = page.locator('.graveyard__row');
	await expect(rows).toHaveCount(7);

	// The home lab: active: true → derived alive → the lamp marker, not a stone
	await expect(rows.first().locator('.graveyard__lamp')).toBeVisible();

	// Piano: active: false, disposition "occasionally haunting" → derived haunt
	const piano = rows.nth(1);
	await expect(piano.locator('.graveyard__lamp-dot--haunt')).toBeVisible();

	// Changing my OS: active: true but a haunting disposition → haunt wins over
	// standing, so it derives haunt (a headstone) rather than alive (the lamp)
	const standingHaunt = page.locator('.graveyard__row', { has: page.getByText('Changing my OS', { exact: true }) });
	await expect(standingHaunt.locator('.graveyard__pill--haunt')).toBeVisible();
	await expect(standingHaunt.locator('.graveyard__lamp')).toHaveCount(0);
});

// Order 7 (The old publishing stack) is nulled to facts:null/noteIds:null in
// the mock (see mock-api.mjs), simulating a pre-contract document from the
// live API: the overlay must render without crashing and skip both blocks.
test('a project with null facts/noteIds from the live API renders without crashing', async ({ page }) => {
	await page.goto(`${FEATURED_BUILD}/projects`);
	const row = page.locator('#light-row-fixture-project-9');
	await row.click();

	const overlay = page.locator('.overlay-card');
	await expect(overlay).toBeVisible();
	await expect(overlay.locator('.light-entry__title')).toHaveText('The old publishing stack');
	await expect(overlay.locator('.light-entry__facts')).toHaveCount(0);
	await expect(overlay.locator('.light-entry__notes')).toHaveCount(0);
	await expect(overlay.locator('.light-entry__nudge')).toBeVisible();
});

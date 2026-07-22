// The mock-API builds (see e2e/mock-api.mjs): the keeper's landing's flagship
// rows are a flagship sort, never gated by the featured flag (design/
// Hello.dc.html's renderVals), so the featured and fallback builds agree on
// the same three rows; this now proves that agreement rather than a
// featured/fallback split. Both still prove the keeper profile is fetched,
// not baked in.
import { test, expect } from '@playwright/test';

const FEATURED_BUILD = 'http://127.0.0.1:4822';
const FALLBACK_BUILD = 'http://127.0.0.1:4823';

test('the flagship rows are a flagship sort, unaffected by the featured flag', async ({ page }) => {
	await page.goto(`${FEATURED_BUILD}/`);
	// the flagship (order 1) always leads; the next two are the next two by
	// order, regardless of which projects the mock flags featured
	await expect(page.locator('.flagship .info b'))
		.toHaveText(['the great un-monolithing', 'newsroom plumbing', '100k good mornings']);
});

test('with nothing featured the flagship rows read exactly the same', async ({ page }) => {
	await page.goto(`${FALLBACK_BUILD}/`);
	await expect(page.locator('.flagship .info b'))
		.toHaveText(['the great un-monolithing', 'newsroom plumbing', '100k good mornings']);
});

test('the sea footer CTA, socials, and sign-off come from the fetched profile', async ({ page }) => {
	await page.goto(`${FEATURED_BUILD}/`);
	await expect(page.locator('.cta-doors .primary')).toHaveAttribute('href', 'mailto:keeper@example.test');
	await expect(page.locator('.site-footer .socials a').first()).toHaveAttribute('href', 'https://github.com/mock-keeper');

	await page.goto(`${FEATURED_BUILD}/notes`);
	await page.locator('.note-row').first().click();
	await expect(page.locator('.letter__signature')).toHaveText('- the mock keeper');
});

// The mock API serves the checked-in hobbies fixture verbatim over the real
// wire route, so this exercises ApiSource end to end: the ship's log renders
// the wire hobbies, projects the charted ones onto the chart, and keeps the
// uncharted one in the log only, same as the fixtures build does.
test('wire hobbies render onto the ship\'s log through the API path', async ({ page }) => {
	await page.goto(`${FEATURED_BUILD}/hobbies`);
	await expect(page.locator('.shipslog__row')).toHaveCount(6);

	// The home lab (order 1) leads the log and gets a moored mark on the chart
	await expect(page.locator('.shipslog__mark[data-hobby-id="fixture-hobby-1"][data-state="moored"]')).toHaveCount(1);

	// The uncharted hobby rides the log with an "uncharted" position, never a mark
	await expect(page.locator('.shipslog__mark[data-hobby-id="fixture-hobby-6"]')).toHaveCount(0);
	await expect(page.locator('.shipslog__row[data-hobby-id="fixture-hobby-6"] .shipslog__coord')).toHaveText('◈ uncharted');
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

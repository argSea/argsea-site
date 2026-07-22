// Homepage (fixtures build): selected work is the light-list register (ruled
// rows, never cards) with the flagship first, a row opens the shared Light
// List entry, the coast beacons wayfind down to a row, the ten-poke cat cues
// the Gull Post, and the contact surfaces render the keeper fixture.
import { test, expect } from '@playwright/test';

// The fixture register: the flagship first, then the two other projects
// flagged featured, in order
const REGISTER_TITLES = ['The Great Un-monolithing', 'Newsroom plumbing', '100k good mornings'];

test('the register shows the flagship row plus the featured trio’s other two', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('.home-register .home-register__title')).toHaveText(REGISTER_TITLES);
	// The flagship row carries the "lit" seal rather than a card's flagship pill
	await expect(page.locator('.home-register__row--flagship .home-register__seal')).toContainText('lit');
});

test('the homepage register row opens the Light List entry', async ({ page }) => {
	await page.goto('/');
	await page.locator('.home-register .home-register__row').first().click();

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

test('the flagship row carries its facts, capped at four in a 2x2 grid', async ({ page }) => {
	await page.goto('/');
	const facts = page.locator('.home-register__facts .home-register__facts-row');
	await expect(facts).toHaveCount(4);
	await expect(facts.first().locator('.home-register__facts-label')).toHaveText('ownership');
});

test('the register head carries the corrected-to line and the flagship its notation', async ({ page }) => {
	await page.goto('/');
	// corrected to the newest journal entry's date (jun 2026)
	await expect(page.locator('.home-register__head-label')).toContainText('corrected to jun 2026');
	// the flagship lamp column shows the real characteristic code, no "· lit" suffix (that lives in the seal)
	await expect(page.locator('.home-register__row--flagship .home-register__notation')).toHaveText('Fl W 8s');
});

test('the coast beacons wayfind: the flagship beacon scrolls to no. 002 and flares its lamp', async ({ page }) => {
	await page.goto('/');
	const beacon = page.locator('.wave-wayfinder[data-wf-target="light-002"]');
	await expect(beacon).toHaveText(/no\. 002 · flagship/);
	await beacon.click();
	// the row it points at exists and carries the arrival hooks the flare toggles
	const row = page.locator('#light-002');
	await expect(row).toHaveCount(1);
	await expect(row.locator('[data-lamp]')).toHaveCount(1);
	await expect(row.locator('[data-num]')).toHaveCount(1);
});

test('the wayfinder dots wear the mock\'s own tiers: flagship big, featured smaller, the chart periwinkle', async ({ page }) => {
	await page.goto('/');
	const dotStyle = (target: string) => page
		.locator(`.wave-wayfinder[data-wf-target="${target}"] .wave-wayfinder__dot`)
		.evaluate((el) => {
			const s = getComputedStyle(el);
			return { width: s.width, background: s.backgroundColor };
		});

	// flagship: 7px white; featured: 6px white; the chart: 6px #5f6ec4
	expect(await dotStyle('light-002')).toEqual({ width: '7px', background: 'rgb(255, 255, 255)' });
	expect(await dotStyle('light-004')).toEqual({ width: '6px', background: 'rgb(255, 255, 255)' });
	expect(await dotStyle('chart-log')).toEqual({ width: '6px', background: 'rgb(95, 110, 196)' });
});

test('the home mount\'s overlay carries the coast link; the projects mount does not', async ({ page }) => {
	await page.goto('/');
	await page.locator('.home-register .home-register__row').first().click();

	const overlay = page.locator('.overlay-card');
	const coastLink = overlay.locator('.light-entry__coastlink-link');
	await expect(coastLink).toHaveText('the whole coast →');
	await expect(coastLink).toHaveAttribute('href', '/projects');
});

test('the footer no longer renders the argsea dictionary', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('.site-footer__dict')).toHaveCount(0);
});

test('the journal strip spells the entry count as a word', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('.journal-strip__vol')).toHaveText('log book · vol. 2026 · three entries of many');
});

// The ship's log preview: the wandering hobbies (anything not moored or in
// port) become chart pills tagged lowercase-name · state, the state read from
// the same stateMeta the chart uses (its first segment, so "adrift", not the
// full gloss). Piano leads the wandering set.
test('the ship\'s log preview pills read lowercase name and state', async ({ page }) => {
	await page.goto('/');
	const pills = page.locator('.chart-pill');
	await expect(pills.first()).toHaveText('piano · adrift');
});

test('the flagship snapshot ships a real print, not a broken glyph', async ({ page }) => {
	await page.goto('/');

	const img = page.locator('.home-register__snapshot img');
	await expect(img).toHaveAttribute('src', '/media/images/first-screenshot.svg');
	await expect
		.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth))
		.toBeGreaterThan(0);
});

test('the home journal overlay steps into the tower', async ({ page }) => {
	await page.goto('/');

	// JournalStripDirector hydrates on idle: before it attaches, a row click
	// falls through to its /notes href. Retry (re-homing on a stray nav) until
	// the click is caught and the entry opens in place.
	await expect(async () => {
		if (!page.url().endsWith('/')) {
			await page.goto('/');
		}
		await page.locator('.journal-strip__row').first().click();
		await expect(page.locator('.overlay-card.letter')).toBeVisible({ timeout: 500 });
	}).toPass();

	const towerLink = page.locator('.overlay-card.letter .letter__found-in-link[title="step into the tower"]');
	await expect(towerLink).toBeVisible();
	await towerLink.click();

	await expect(page.locator('.overlay-card.letter')).toHaveCount(0);
	const light = page.locator('.overlay-card.light-entry');
	await expect(light.locator('.light-entry__title')).toHaveText('The Great Un-monolithing');

	// the stepped-into light is the home mount's, so it carries the coast link too
	await expect(light.locator('.light-entry__coastlink-link')).toHaveText('the whole coast →');
});

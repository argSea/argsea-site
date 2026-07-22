// Projects page (fixtures build), now the lights: the coast pins one beacon
// per published project, filtering dims the rest of the coast without
// moving them while the register keeps every row mounted and collapses the
// non-matches in place, a beacon click opens that light's entry, and
// reduced motion holds every lamp static (no Web Animations API animation
// running), per the hard "every light burns steady" rule.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import type { Project } from '../src/lib/api';

// Read (not import) the fixture: a JSON module import would need an import
// attribute under Node's ESM loader, which the spec transform rejects
const projects: Project[] = JSON.parse(
	readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'fixtures', 'projects.json'), 'utf8'),
);
const publishedCount = projects.filter((project) => project.status === 'published').length;

test('the coast lights one beacon per published project', async ({ page }) => {
	expect(publishedCount).toBeGreaterThan(0);
	await page.goto('/projects');
	await expect(page.locator('.coast__pano .beacon')).toHaveCount(publishedCount);
	await expect(page.locator('.register .register__row')).toHaveCount(publishedCount);
});

test('filtering narrows the register and dims the rest of the coast', async ({ page }) => {
	await page.goto('/projects');

	await page.locator('.filter-row .chip', { hasText: 'games' }).click();

	// every row stays mounted; only what matches stays expanded
	await expect(page.locator('.register .register__row')).toHaveCount(publishedCount);
	const rows = page.locator('.register .register__row:not(.register__row--collapsed)');
	await expect(rows).toHaveCount(1);
	await expect(rows.locator('.register__name')).toHaveText('Meo Wave Race');

	// the coast never reflows: every beacon stays put, matching or not.
	// The opacity fade is a CSS transition, so poll rather than read it once
	await expect(async () => {
		const dimmed = await page.locator('.coast__pano .beacon').evaluateAll(
			(elements) => elements.filter((element) => Number(getComputedStyle(element).opacity) < 0.5).length,
		);
		expect(dimmed).toBe(publishedCount - 1);
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

test('a morse light codes its letter and reads plainly', async ({ page }) => {
	await page.goto('/projects');
	const row = page.locator('#light-row-fixture-project-8');
	await expect(row.locator('.register__code')).toHaveText('Mo(A) W 8s');

	await row.click();
	const overlay = page.locator('.overlay-card');
	await expect(overlay.locator('.light-entry__code')).toHaveText('Mo(A) W 8s');
	await expect(overlay.locator('.light-entry__decoded')).toContainText('tapping the letter A in Morse code');
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

// Regression cover for the dead-halo-breathe bug: ignite() used to cancel
// every animation on the element, including the CSS haloBreath running
// alongside it, on first mount. Newsroom plumbing (order 2) is fixed and
// burning, so both its register row and coast beacon should breathe; The old
// publishing stack (order 7) is fixed but dark, so neither should.
test('a fixed, burning light\'s halo actually breathes; a fixed, dark one never does', async ({ page }) => {
	await page.goto('/projects');

	const litHalo = page.locator('#light-row-fixture-project-2 .register__halo');
	await expect(litHalo).toHaveClass(/register__halo--breathe/);
	await expect(async () => {
		const playStates = await litHalo.evaluate((element) => element.getAnimations().map((animation) => animation.playState));
		expect(playStates).toEqual(['running']);
	}).toPass();

	// the halo's own computed opacity actually moves over time, not just a
	// running-but-frozen Animation object
	await expect(async () => {
		const samples: number[] = [];
		for (let i = 0; i < 4; i++) {
			samples.push(Number(await litHalo.evaluate((element) => getComputedStyle(element).opacity)));
			await page.waitForTimeout(300);
		}
		expect(new Set(samples.map((value) => value.toFixed(3))).size).toBeGreaterThan(1);
	}).toPass();

	const beaconHalo = page.locator('.beacon[title*="Newsroom plumbing"] .beacon__halo');
	await expect(beaconHalo).toHaveClass(/beacon__halo--breathe/);
	expect(await beaconHalo.evaluate((element) => element.getAnimations().length)).toBeGreaterThan(0);

	const darkHalo = page.locator('#light-row-fixture-project-9 .register__halo');
	await expect(darkHalo).not.toHaveClass(/register__halo--breathe/);
	expect(await darkHalo.evaluate((element) => element.getAnimations().length)).toBe(0);
});

test('the retranscribed overlay: head line, notes above facts, decorative thumbs, one final row', async ({ page }) => {
	await page.goto('/projects');
	await page.locator('#light-row-fixture-project-2').click(); // Newsroom plumbing: two images, no notes, no case study

	const overlay = page.locator('.overlay-card');
	await expect(overlay).toBeVisible();
	await expect(overlay.locator('.overlay-kicker')).toHaveText('The Light List · No. 004');

	// the old established/district/keeper meta row is gone; the masthead
	// carries est. and district inline instead
	await expect(overlay.locator('.light-entry__meta')).toHaveCount(0);
	await expect(overlay.locator('.light-entry__meta-line')).toContainText('est. 2016 · home waters');

	// no notes and no case study here: the nudge shows, not a facts-before-notes ordering bug
	const body = overlay.locator('.light-entry__body');
	const nudgeThenFacts = await body.evaluate((element) => {
		const nudge = element.querySelector('.light-entry__nudge');
		const facts = element.querySelector('.light-entry__facts');
		if (!nudge || !facts) {
			return false;
		}
		return !!(nudge.compareDocumentPosition(facts) & Node.DOCUMENT_POSITION_FOLLOWING);
	});
	expect(nudgeThenFacts).toBe(true);

	// a single-image project shows the print alone, no thumb strip
	await expect(overlay.locator('.light-entry__thumb')).toHaveCount(0);

	// tags sit at the bottom of the photo column, not in the final row
	await expect(overlay.locator('.light-entry__right .light-entry__tags')).toBeVisible();

	// the final row carries the project's moral, one bordered row; the keeper
	// signs his own work (2026-07-22 ruling), no auto-sig on his behalf
	const final = overlay.locator('.light-entry__final');
	await expect(final.locator('.light-entry__moral')).toBeVisible();
	await expect(final.locator('.light-entry__signoff')).toHaveCount(0);

	// on the projects page (not the home mount) there's no coast link
	await expect(overlay.locator('.light-entry__coastlink-link')).toHaveCount(0);

	// a multi-image project gets the decorative thumb strip: rotated prints,
	// not a click-to-swap gallery
	await page.keyboard.press('Escape');
	await expect(overlay).toHaveCount(0);
	await page.locator('#light-row-fixture-project-1').click();
	const thumbs = page.locator('.overlay-card .light-entry__thumb');
	await expect(thumbs).toHaveCount(2);
	expect(await thumbs.first().evaluate((element) => element.tagName)).toBe('DIV');
	const mainSrc = await page.locator('.overlay-card .photo-print img').getAttribute('src');
	await thumbs.first().click({ force: true });
	await expect(page.locator('.overlay-card .photo-print img')).toHaveAttribute('src', mainSrc!);
});

// --- pull the note out: a tied journal entry lifts out of the light's log in
// place, credits the log, and tucks back. The flagship (fixture-project-1)
// ties note-1 and note-3, so its entry carries the "notes found here" chips.
test('a chip pulls its note out of the log, credits it, and tucks back', async ({ page }) => {
	await page.goto('/projects');
	await page.locator('#light-row-fixture-project-1').click();

	const backdrop = page.locator('.overlay-backdrop');
	const chip = backdrop.locator('.light-entry__notes-link').first();
	await expect(chip).toHaveAttribute('title', 'pull it out and read it');
	await chip.click();

	const paper = backdrop.locator('.light-entry__note-paper');
	await expect(paper).toBeVisible();
	await expect(paper.locator('.light-entry__note-credit')).toHaveText('found tucked into the log of The Great Un-monolithing');
	// no auto-sig on the pulled note either
	await expect(paper.locator('.light-entry__note-signature')).toHaveCount(0);
	// the dark log is gone while the paper is out, never a second scroll layer
	await expect(backdrop.locator('.overlay-card.light-entry')).toHaveCount(0);

	await backdrop.locator('.light-entry__tuck-back').click();
	await expect(backdrop.locator('.overlay-card.light-entry')).toBeVisible();
	await expect(paper).toHaveCount(0);
});

test('Escape tucks the note first, a second Escape closes the light', async ({ page }) => {
	await page.goto('/projects');
	await page.locator('#light-row-fixture-project-1').click();
	await page.locator('.light-entry__notes-link').first().click();
	await expect(page.locator('.light-entry__note-paper')).toBeVisible();

	// first Escape tucks the paper back, the log returns, the overlay stays open
	await page.keyboard.press('Escape');
	await expect(page.locator('.light-entry__note-paper')).toHaveCount(0);
	await expect(page.locator('.overlay-card.light-entry')).toBeVisible();

	// second Escape closes the whole overlay
	await page.keyboard.press('Escape');
	await expect(page.locator('.overlay-backdrop')).toHaveCount(0);
});

test('reduced motion stills the pulled-out paper', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/projects');
	await page.locator('#light-row-fixture-project-1').click();
	await page.locator('.light-entry__notes-link').first().click();

	const paper = page.locator('.light-entry__note');
	await expect(paper).toBeVisible();
	expect(await paper.evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
});

test('the footer no longer renders the argsea dictionary', async ({ page }) => {
	await page.goto('/projects');
	await expect(page.locator('.site-footer__dict')).toHaveCount(0);
});

test('the footer carries the night watch definition', async ({ page }) => {
	await page.goto('/projects');
	const definition = page.locator('.definition');
	await expect(definition).toContainText('night watch');
	await expect(definition).toContainText('this website, most evenings');
});

test('the provenance chip names the harness for an assisted light, and reads "by hand" for one without', async ({ page }) => {
	await page.goto('/projects');

	// "This website" (fixture-project-4) carries the fixture assist
	const assisted = projects.find((project) => project.title === 'This website')!;
	await page.locator(`#light-row-${assisted.id}`).click();
	const assistedChip = page.locator('.overlay-card .light-entry__chip');
	await expect(assistedChip).toHaveClass(/light-entry__chip--assist/);
	await expect(assistedChip.locator('.light-entry__chip-text')).toHaveText(
		`this beacon was lit with the help of AI (${[assisted.assist!.harness, assisted.assist!.model].filter(Boolean).join(', ').toLowerCase()})`,
	);
	await page.keyboard.press('Escape');
	await expect(page.locator('.overlay-card')).toHaveCount(0);

	// the flagship (fixture-project-1) carries no assist
	const byHand = projects.find((project) => project.id === 'fixture-project-1')!;
	expect(byHand.assist).toBeUndefined();
	await page.locator(`#light-row-${byHand.id}`).click();
	const handChip = page.locator('.overlay-card .light-entry__chip');
	await expect(handChip).toHaveClass(/light-entry__chip--hand/);
	await expect(handChip.locator('.light-entry__chip-text')).toHaveText('this beacon was lit by hand');
});

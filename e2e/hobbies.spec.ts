// The hobby graveyard (fixtures build): a still-burning hobby gets the lamp
// marker and the gold pill, a resting one gets its own marker/pill, and the
// manila record modal opens with the found/cause/return fields and
// leave-a-flower, persisted to localStorage keyed by the hobby's id.
import { test, expect } from '@playwright/test';

test('the register renders one row per hobby, still-burning first', async ({ page }) => {
	await page.goto('/hobbies');
	const rows = page.locator('.graveyard__row');
	await expect(rows).toHaveCount(7);
	await expect(rows.first().locator('.graveyard__name')).toHaveText('The home lab');
});

test('a still-burning hobby wears the lamp marker and the gold pill', async ({ page }) => {
	await page.goto('/hobbies');
	const row = page.locator('.graveyard__row').first();
	await expect(row.locator('.graveyard__lamp')).toBeVisible();
	await expect(row.locator('.graveyard__pill')).toHaveText('still on watch');
	// alive rows never carry the resting anchor spot
	await expect(row).not.toHaveClass(/graveyard__row--resting/);
});

test('a resting hobby with a sticks marker reads its disposition', async ({ page }) => {
	await page.goto('/hobbies');
	// Piano (row 1) has no explicit marker (falls to stone); Music theory
	// (row 2) is the first with marker: 'sticks'
	const row = page.locator('.graveyard__row').nth(2);
	await expect(row.locator('.graveyard__name')).toHaveText('Music theory');
	await expect(row.locator('.graveyard__sticks-plate')).toBeVisible();
	await expect(row.locator('.graveyard__pill')).toHaveText('laid to rest');
	await expect(row).toHaveClass(/graveyard__row--resting/);
});

test('a row opens the keeper\'s record modal with the found/cause/return fields', async ({ page }) => {
	await page.goto('/hobbies');
	await page.locator('.graveyard__row').nth(1).click(); // Piano

	const modal = page.locator('.record-modal');
	await expect(modal).toBeVisible();
	await expect(modal.locator('.record-modal__kicker')).toContainText('plot 02');
	await expect(modal.locator('.record-modal__name')).toHaveText('Piano');
	const grid = modal.locator('.record-modal__grid');
	await expect(grid).toContainText('one shaky recording the family still requests');
	await expect(grid).toContainText('got good enough, which was the goal');
});

test('leaving a flower increments the count and survives a reload', async ({ page }) => {
	await page.goto('/hobbies');
	await page.locator('.graveyard__row').nth(1).click();

	const modal = page.locator('.record-modal');
	await expect(modal.locator('.record-modal__flower-count')).toHaveText('no flowers yet');
	await modal.locator('.record-modal__flower-btn').click();
	await expect(modal.locator('.record-modal__flower-count')).toHaveText('1 left so far');

	await page.reload();
	await page.locator('.graveyard__row').nth(1).click();
	await expect(page.locator('.record-modal .record-modal__flower-count')).toHaveText('1 left so far');
});

test('the record modal closes on Escape', async ({ page }) => {
	await page.goto('/hobbies');
	await page.locator('.graveyard__row').first().click();
	await expect(page.locator('.record-modal')).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(page.locator('.record-modal')).toHaveCount(0);
});

test('the haunting moment golds the haunt hobby\'s dot and swaps its log line, then reverts', async ({ page }) => {
	await page.clock.install();
	await page.goto('/hobbies');

	const piano = page.locator('.graveyard__row').nth(1); // Piano: the one haunt-kind hobby
	await expect(piano.locator('.graveyard__log')).toHaveText('Light found cold. Bench tucked in. Metronome still ticking.');
	await expect(piano.locator('.graveyard__lamp-dot--haunt')).toBeVisible();

	await page.clock.fastForward('00:53');
	await expect(piano.locator('.graveyard__log')).toHaveText('…is that the metronome?');
	await expect(piano.locator('.graveyard__lamp-dot--haunting')).toBeVisible();
	// the haunting class carries the flared glow: ~1.5x the mock's dot (7px blur
	// → 11px), ratified 2026-07-11. Read from the rule, not a mid-transition
	// computed value the frozen clock would catch interpolating.
	const flare = await page.evaluate(() => {
		for (const sheet of Array.from(document.styleSheets)) {
			let rules: CSSRule[];
			try { rules = Array.from(sheet.cssRules); } catch { continue; }
			for (const rule of rules) {
				if (rule instanceof CSSStyleRule && rule.selectorText === '.graveyard__lamp-dot--haunting') {
					return rule.style.boxShadow;
				}
			}
		}
		return '';
	});
	expect(flare).toContain('11px');

	await page.clock.fastForward('00:03');
	await expect(piano.locator('.graveyard__log')).toHaveText('Light found cold. Bench tucked in. Metronome still ticking.');
	await expect(piano.locator('.graveyard__lamp-dot--haunt')).toBeVisible();
});

test('the fireflies actually roam: the keyframes live where the island can reach them', async ({ page }) => {
	await page.goto('/hobbies');

	const firefly = page.locator('.graveyard__firefly').first();
	await expect(firefly).toBeVisible();
	await expect
		.poll(() => firefly.evaluate((el) => el.getAnimations().some((a) => 'animationName' in a && (a as CSSAnimation).animationName === 'fireflyRoam' && a.playState === 'running')))
		.toBe(true);
});

// The old-fields-only record (Ham radio): every new field sits empty and the
// register reads the postcard-era dates/epitaph/eulogy instead.
test('an old-fields-only hobby falls back to its dormant record', async ({ page }) => {
	await page.goto('/hobbies');
	const row = page.locator('.graveyard__row', { has: page.getByText('Ham radio', { exact: true }) });

	// service falls back to the old dates
	await expect(row.locator('.graveyard__service')).toHaveText('2016 - 2018');
	// the pill falls back to the epitaph with its leading dagger stripped
	await expect(row.locator('.graveyard__pill')).toHaveText('went quiet on all bands');
	// the row line falls back to the eulogy
	await expect(row.locator('.graveyard__log')).toContainText('Last heard on 40 meters');
	// an empty char renders no code at all
	await expect(row.locator('.graveyard__char-row')).toHaveCount(0);
});

test('the old-fields record modal composes from present parts and hides empty lines', async ({ page }) => {
	await page.goto('/hobbies');
	await page.locator('.graveyard__row', { has: page.getByText('Ham radio', { exact: true }) }).click();

	const modal = page.locator('.record-modal');
	await expect(modal).toBeVisible();
	// the empty char drops out: "kept 2016 - 2018", not a dangling "kept  · "
	await expect(modal.locator('.record-modal__subtitle')).toHaveText('kept 2016 - 2018');
	// no found/cause/return survive, so the grid never renders
	await expect(modal.locator('.record-modal__grid')).toHaveCount(0);
	// the pull-quote is hidden with no lastLog
	await expect(modal.locator('.record-modal__lastlog')).toHaveCount(0);
	// the foot disposition falls back to the epitaph, dagger stripped
	await expect(modal.locator('.record-modal__disposition')).toHaveText('disposition · went quiet on all bands');
});

// Changing my OS is standing (active) yet its disposition haunts; haunt wins.
test('a haunting disposition wins over standing', async ({ page }) => {
	await page.goto('/hobbies');
	const row = page.locator('.graveyard__row', { has: page.getByText('Changing my OS', { exact: true }) });

	await expect(row.locator('.graveyard__pill--haunt')).toBeVisible();
	// derived haunt, not alive: a headstone, never the still-burning lamp
	await expect(row.locator('.graveyard__lamp')).toHaveCount(0);
	await expect(row).toHaveClass(/graveyard__row--resting/);
});

test('every grave carries a dirt mound; the still-burning lamp does not', async ({ page }) => {
	await page.goto('/hobbies');
	const graves = await page.locator('.graveyard__row--resting').count();
	await expect(page.locator('.graveyard__mound')).toHaveCount(graves);
	// row 0 is the living lamp: no grave, no mound
	await expect(page.locator('.graveyard__row').first().locator('.graveyard__mound')).toHaveCount(0);
});

test('no grave stacks more than one dressing object (grass aside)', async ({ page }) => {
	await page.goto('/hobbies');
	const markers = page.locator('.graveyard__marker');
	const count = await markers.count();
	for (let i = 0; i < count; i += 1) {
		const objects = await markers.nth(i).locator('.graveyard__dress-object').count();
		expect(objects).toBeLessThanOrEqual(1);
	}
});

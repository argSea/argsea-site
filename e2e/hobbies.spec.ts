// The ship's log (fixtures build): hobbies plot onto the wandering chart at
// their projected bearings, a wake trails the ones that slipped a mooring, an
// uncharted hobby rides the log but never the chart, the Flannan memorial keeps
// its real Fl(2) light, the bearing card reads a hobby's last log and sends up a
// flare, and reduced motion stills the whole thing.
import { test, expect } from '@playwright/test';

test('the log lists one row per hobby, ordered by the keeper\'s key', async ({ page }) => {
	await page.goto('/hobbies');
	const rows = page.locator('.shipslog__row');
	await expect(rows).toHaveCount(6);
	await expect(rows.first()).toContainText('The home lab');
	// only the five charted hobbies count toward the header tally; the uncharted one does not
	await expect(page.locator('.shipslog__plotted')).toHaveText('5 hobbies plotted · none sunk');
});

test('marks project onto the chart at the mock\'s percentages for the fixture coords', async ({ page }) => {
	await page.goto('/hobbies');
	// The home lab sits at 58.22 N, 7.50 W; the chart window projects that to
	// 33.57% across and 46.15% down (proj() in ShipsLog.tsx, from Hobbies.dc.html).
	const mark = page.locator('.shipslog__mark[data-hobby-id="fixture-hobby-1"]');
	await expect(mark).toHaveCount(1);
	const left = await mark.evaluate((el) => parseFloat((el as HTMLElement).style.left));
	const top = await mark.evaluate((el) => parseFloat((el as HTMLElement).style.top));
	expect(left).toBeCloseTo(33.57, 1);
	expect(top).toBeCloseTo(46.15, 1);
});

test('every charted hobby gets a mark carrying its state; five states, five marks', async ({ page }) => {
	await page.goto('/hobbies');
	await expect(page.locator('.shipslog__mark')).toHaveCount(5);
	for (const state of ['moored', 'adrift', 'marooned', 'port', 'inkspill']) {
		await expect(page.locator(`.shipslog__mark[data-state="${state}"]`)).toHaveCount(1);
	}
});

test('an uncharted hobby rides the log but never the chart', async ({ page }) => {
	await page.goto('/hobbies');
	const row = page.locator('.shipslog__row[data-hobby-id="fixture-hobby-6"]');
	await expect(row).toHaveCount(1);
	// the coord cell reads "uncharted" in the mock's mono register, not a bearing
	await expect(row.locator('.shipslog__coord')).toHaveText('◈ uncharted');
	// and it draws no mark on the chart
	await expect(page.locator('.shipslog__mark[data-hobby-id="fixture-hobby-6"]')).toHaveCount(0);
});

test('a wake trails only the hobbies that carry a from-position', async ({ page }) => {
	await page.goto('/hobbies');
	// piano/music theory/game dev/running each carry `from`; the moored home lab
	// (no from) and the uncharted one draw none
	await expect(page.locator('.shipslog__wake')).toHaveCount(4);
});

test('a mark opens the bearing card with its last log and its off-course fields', async ({ page }) => {
	await page.goto('/hobbies');
	await page.locator('.shipslog__row[data-hobby-id="fixture-hobby-2"]').click(); // Piano

	const card = page.locator('.shipslog__bearing');
	await expect(card).toBeVisible();
	await expect(card.locator('.shipslog__bearing-name')).toHaveText('Piano');
	await expect(card).toContainText('Got through the piece with both hands tonight');
	await expect(card).toContainText('Slipped its mooring the night it was "good enough"');
	await expect(card).toContainText('one shaky recording the family still requests');
	await expect(card).toContainText('- the keeper, still hoping');
});

test('the bearing card closes on Escape', async ({ page }) => {
	await page.goto('/hobbies');
	await page.locator('.shipslog__row').first().click();
	await expect(page.locator('.shipslog__bearing')).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(page.locator('.shipslog__bearing')).toHaveCount(0);
});

test('sending up a flare flips the card\'s line and the tally survives a reload', async ({ page }) => {
	await page.goto('/hobbies');
	await page.locator('.shipslog__row[data-hobby-id="fixture-hobby-2"]').click();

	const card = page.locator('.shipslog__bearing');
	await expect(card.locator('.shipslog__flare-line')).toHaveText('send one up to root for this one');
	await card.locator('.shipslog__flare-btn').click();
	await expect(card.locator('.shipslog__flare-line')).toHaveText('flare away · the keeper will see it');

	// the local tally (argsea-flares) keeps the line flipped when the card reopens
	await page.reload();
	await page.locator('.shipslog__row[data-hobby-id="fixture-hobby-2"]').click();
	await expect(page.locator('.shipslog__bearing .shipslog__flare-line')).toHaveText('flare away · the keeper will see it');
});

test('the uncharted slot cycles the next-hobby suggestions', async ({ page }) => {
	await page.goto('/hobbies');
	const chip = page.locator('.shipslog__uncharted');
	await expect(chip).toContainText('next: ???');
	await chip.click();
	await expect(chip).toContainText('next: blacksmithing?');
	await chip.click();
	await expect(chip).toContainText('next: sourdough?');
});

test('the memorial opens from both the cartouche and the mark, and closes three ways', async ({ page }) => {
	await page.goto('/hobbies');

	// from the cartouche, closed with the "with respect" chip
	await page.locator('.shipslog__cartouche').click();
	const modal = page.locator('.shipslog__memorial-modal');
	await expect(modal).toBeVisible();
	await expect(modal).toContainText('James Ducat · Thomas Marshall · Donald MacArthur');
	await page.locator('.shipslog__mem-close').click();
	await expect(modal).toHaveCount(0);

	// from the mark, closed on Escape
	await page.locator('.shipslog__memorial').click();
	await expect(page.locator('.shipslog__memorial-modal')).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(page.locator('.shipslog__memorial-modal')).toHaveCount(0);

	// from the mark again, closed by clicking the backdrop
	await page.locator('.shipslog__memorial').click();
	await expect(page.locator('.shipslog__memorial-modal')).toBeVisible();
	await page.mouse.click(6, 6);
	await expect(page.locator('.shipslog__memorial-modal')).toHaveCount(0);
});

test('the memorial mark keeps the real Flannan light running: Fl(2) W 30s', async ({ page }) => {
	await page.goto('/hobbies');
	const lamp = page.locator('.shipslog__flannan').first();
	await expect(lamp).toBeVisible();
	// assert the characteristic by its keyframe, not by timing the flash
	await expect
		.poll(() => lamp.evaluate((el) => el.getAnimations().some((a) => 'animationName' in a && (a as CSSAnimation).animationName === 'flannanFl2' && a.playState === 'running')))
		.toBe(true);
});

test('a ?bearing= query opens that hobby\'s bearing card on load', async ({ page }) => {
	await page.goto('/hobbies?bearing=The%20home%20lab');
	const card = page.locator('.shipslog__bearing');
	await expect(card).toBeVisible();
	await expect(card.locator('.shipslog__bearing-name')).toHaveText('The home lab');
});

test('a bearing card pulls up its tied journal entry, and back again', async ({ page }) => {
	// The home lab bearing ties the CachyOS entry (hobby.noteIds); the card
	// lists it under "logged in the journal" and pulls it up in place.
	await page.goto('/hobbies?bearing=The%20home%20lab');
	const card = page.locator('.shipslog__bearing');
	await expect(card).toBeVisible();

	const noteLink = card.locator('.shipslog__note-link');
	await expect(noteLink).toHaveText('✷ CachyOS, three months in →');
	await noteLink.click();

	const letter = page.locator('.overlay-card.letter');
	await expect(letter).toBeVisible();
	await expect(letter.locator('.letter__title')).toHaveText('CachyOS, three months in');
	// closing the entry returns to the still-open bearing card
	await expect(letter.locator('.pill-close')).toHaveText('back to the bearing ✕');
	await letter.locator('.pill-close').click();
	await expect(page.locator('.overlay-card.letter')).toHaveCount(0);
	await expect(card).toBeVisible();
});

test('reduced motion stills the chart', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/hobbies');
	const lamp = page.locator('.shipslog__flannan').first();
	await expect(lamp).toBeVisible();
	// the global kill-switch strips every animation under reduced motion
	expect(await lamp.evaluate((el) => el.getAnimations().length)).toBe(0);
});

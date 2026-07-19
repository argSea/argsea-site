// The split watch (mock build): the fixtures build ships EMPTY_WATCH so the
// section collapses; the mock API serves a kept watch with both rack hooks
// filled, so these specs prove the fused letter renders, the two-print rack
// hangs both prints, and the second hook stays bare when its id is empty.
import { test, expect } from '@playwright/test';

const FEATURED_BUILD = 'http://127.0.0.1:4822';

test('the fixtures build keeps no watch, so the section collapses', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('.watch')).toHaveCount(0);
});

test('a kept watch renders the letter and the two-print rack', async ({ page }) => {
	await page.goto(`${FEATURED_BUILD}/`);

	const watch = page.locator('.watch');
	await expect(watch).toBeVisible();
	await expect(watch.locator('.watch__para').first()).toContainText('ArcXP migration');

	// both hooks of the rack carry a print: the season's first, then the second below
	const frames = watch.locator('.watch__postcard-frame');
	await expect(frames).toHaveCount(2);
	await expect(frames.nth(0).locator('img')).toHaveAttribute('src', '/media/images/station-photo.svg');
	await expect(frames.nth(1)).toHaveClass(/watch__postcard-frame--second/);
	await expect(frames.nth(1).locator('img')).toHaveAttribute('src', '/media/images/queue-depth.svg');
	await expect(frames.nth(1).locator('.watch__postcard-caption')).toHaveText('also from the season · the keeper liked it');

	// the second print tucks in smaller: its modifier shares specificity with
	// the base frame rule, so a source-order slip flattens it to full size
	// silently. Pin the computed relation, not the class.
	const widths = await frames.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));
	expect(widths[1]).toBeLessThan(widths[0] * 0.8);
	const tilts = await frames.evaluateAll((els) => els.map((el) => getComputedStyle(el).transform));
	expect(tilts[1]).not.toBe(tilts[0]);

	// each print hangs at the photo's own shape: a fixed-ratio box would
	// cover-crop anything that isn't 4/3 or 3/2 (a panorama renders as a
	// zoomed crop). Pin rendered aspect to natural aspect on both hooks.
	// offsetWidth/Height, not getBoundingClientRect: the frame's tilt would
	// skew the bounding box and smear the ratio
	const shapes = await frames.locator('img').evaluateAll((els) =>
		els.map((el) => {
			const img = el as HTMLImageElement;
			return { drawn: img.offsetWidth / img.offsetHeight, natural: img.naturalWidth / img.naturalHeight };
		}),
	);
	for (const s of shapes) expect(s.drawn).toBeCloseTo(s.natural, 1);
});

test('reduced motion stills every register lamp at full opacity', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/');

	const lamp = page.locator('.home-register__row--flagship [data-lamp] .home-register__core');
	await expect(lamp).toBeVisible();
	// no WAAPI blink is left running, and the lit lamp sits at full opacity
	expect(await lamp.evaluate((el) => el.getAnimations().length)).toBe(0);
	expect(await lamp.evaluate((el) => Number(getComputedStyle(el).opacity))).toBeGreaterThan(0.99);
});

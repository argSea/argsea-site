// The carving shop's site-side half: every spot renders its bolted svg with
// a built-in fallback (see src/lib/carvings.ts). The shipped fixtures carry
// only builtins and bolt nothing, so every bolted scenario lives in the
// fallback mock-api build (e2e/mock-api.mjs): a jar over `bottle` proves a
// shop swap reaches its mount, a no-anchor carving over `tower-stub` proves
// the characteristic engine degrades to steady art instead of crashing, and
// the promote wave's bolts prove a swap reaches one spot per new page region
// (hello / hobbies / 404 / tab bar), with the buoy's no-anchor carving
// holding the CSS-side lamp steady the same way.
import { test, expect } from '@playwright/test';

const FALLBACK_BUILD = 'http://127.0.0.1:4823';

test('the bolted bottle renders the carved shape, the tug\'s hull stays built-in', async ({ page }) => {
	await page.clock.install();
	await page.goto(`${FALLBACK_BUILD}/`);

	// The sea sends bottles on its own schedule (design/Hello.dc.html's
	// initBottles, adapted onto BottleBoat's auto mode); fast-forward past the
	// first drop rather than waiting on it for real.
	await page.clock.fastForward(45000);
	const bottle = page.locator('.bottle-drift .bottle').first();
	await expect(bottle).toBeVisible();
	await expect(bottle).toHaveAttribute('data-bolted', 'bottle');
	// The mock's jar carving is a rect + circle; the built-in is two rects and
	// a path, never a circle.
	await expect(bottle.locator('circle')).toHaveCount(1);
	await expect(bottle.locator('path')).toHaveCount(0);

	// The tug's hull carries no bolt in this build: its built-in three-path
	// hull renders exactly as it always has.
	const hull = page.locator('.tow .hull');
	expect(await hull.getAttribute('data-bolted')).toBeNull();
	await expect(hull.locator('path')).toHaveCount(3);
});

test('a tower-stub carving without the lamp anchor swaps the shape and holds the light steady', async ({ page }) => {
	await page.goto(`${FALLBACK_BUILD}/projects`);

	// Every beacon shares the one site-wide tower-stub carving; the first
	// beacon in DOM order is the flash-white flagship light (order 1), lit
	// and not fixed, so its halo/core would ordinarily be mid-blink on the
	// characteristic engine's own WAAPI animation.
	const beacon = page.locator('.coast__pano .beacon').first();
	const stub = beacon.locator('.beacon__stub');
	await expect(stub).toHaveAttribute('data-bolted', 'tower-stub');
	await expect(stub.locator('path')).toHaveCount(0);
	await expect(stub.locator('rect')).toHaveCount(1);

	// Held steady: no crash, and no WAAPI animation left running on the glow layer
	await expect(async () => {
		const running = await beacon.locator('.beacon__halo').evaluate((el) => el.getAnimations().length);
		expect(running).toBe(0);
	}).toPass();

	// The entry overlay's own lamp mount carries the same carving and the
	// same degradation, opened fresh rather than reusing the coast beacon
	await page.locator('.register .register__row').first().click();
	const ghost = page.locator('.lamp__ghost');
	await expect(ghost).toHaveAttribute('data-bolted', 'tower-stub');
	await expect(ghost.locator('rect')).toHaveCount(1);
	await expect(async () => {
		const running = await page.locator('.lamp__halo').evaluate((el) => el.getAnimations().length);
		expect(running).toBe(0);
	}).toPass();
});

test('a bolted carving reaches the hello page: the hero doodle swaps to the carved plank', async ({ page }) => {
	await page.goto(`${FALLBACK_BUILD}/`);
	// The mock plank is a lone rect; the built-in doodle is paths and a circle,
	// never a rect. The mock watch is kept, so the now panel (and its doodle)
	// renders on this build.
	const doodle = page.locator('.now .doodle');
	await expect(doodle).toHaveAttribute('data-bolted', 'hero-doodle');
	await expect(doodle.locator('rect')).toHaveCount(1);
	await expect(doodle.locator('circle')).toHaveCount(0);
});

test('a bolted carving reaches the wandering chart: the sea serpent swaps to the carved plank', async ({ page }) => {
	await page.goto(`${FALLBACK_BUILD}/hobbies`);
	const serpent = page.locator('[data-bolted="sea-serpent"]');
	await expect(serpent).toHaveCount(1);
	await expect(serpent.locator('rect')).toHaveCount(1);
	await expect(serpent.locator('circle')).toHaveCount(0);
});

test('a bolted buoy without the lamp anchor swaps the shape and holds the blink steady', async ({ page }) => {
	await page.goto(`${FALLBACK_BUILD}/404.html`);
	const buoy = page.locator('.buoy svg');
	await expect(buoy).toHaveAttribute('data-bolted', 'buoy');
	await expect(buoy.locator('rect')).toHaveCount(1);
	await expect(buoy.locator('ellipse')).toHaveCount(0);

	// No anchor tag, so the page's carvingBuoyLamp rule never attaches; the
	// wrapper keeps bobbing (that motion is the mount's, not the carving's).
	const running = await buoy.locator('rect').evaluate((el) => el.getAnimations().length);
	expect(running).toBe(0);
});

test('a bolted carving reaches the tab bar below the phone line: the notes letter swaps to the carved dot', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto(`${FALLBACK_BUILD}/`);
	const letter = page.locator('.tab-bar [data-bolted="notes-letter"]');
	await expect(letter).toBeVisible();
	await expect(letter.locator('circle')).toHaveCount(1);
	await expect(letter.locator('rect')).toHaveCount(0);
});

test('a bolted carving reaches the Gull Post: the delivery gull swaps to the carved plank', async ({ page }) => {
	await page.goto(`${FALLBACK_BUILD}/gazette`);
	const gull = page.locator('.gazette__gull');
	await expect(gull).toHaveAttribute('data-bolted', 'delivery-gull');
	// the mock plank is a lone rect; the built-in gull is paths + a circle, never a rect
	await expect(gull.locator('rect')).toHaveCount(1);
	await expect(gull.locator('circle')).toHaveCount(0);
});

test('the fixtures build bolts nothing: every promoted spot renders its built-in art', async ({ page }) => {
	// baseURL serves the fixtures build; its carvings all carry boltedTo null.
	// The fixtures build never keeps a watch, so the hero doodle never mounts
	// here; the wandering chart's gauge marks are this page's other bolted
	// spots, and the home lab (the highest gauge) leads with a moored mark.
	await page.goto('/');
	const mooredMark = page.locator('.gauge .mk svg').first();
	expect(await mooredMark.getAttribute('data-bolted')).toBeNull();
	await expect(mooredMark.locator('rect')).toHaveCount(1);

	await page.goto('/hobbies');
	await expect(page.locator('.shipslog__chart')).toBeVisible();
	await expect(page.locator('[data-bolted]')).toHaveCount(0);

	await page.goto('/404.html');
	const buoy = page.locator('.buoy svg');
	expect(await buoy.getAttribute('data-bolted')).toBeNull();
	await expect(buoy.locator('ellipse')).toHaveCount(1);

	// The Gull Post's delivery gull falls back to its built-in, byte-identical
	// to the fixture: paths plus the eye circle, no bolt, never a plank rect.
	await page.goto('/gazette');
	const gull = page.locator('.gazette__gull');
	expect(await gull.getAttribute('data-bolted')).toBeNull();
	await expect(gull.locator('circle')).toHaveCount(1);
	await expect(gull.locator('rect')).toHaveCount(0);
	await expect(gull.locator('path')).toHaveCount(6);
});

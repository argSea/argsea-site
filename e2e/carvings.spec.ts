// The carving shop's site-side half: every spot renders its bolted svg with
// a built-in fallback (see src/lib/carvings.ts). The fixtures build bolts a
// test carving to `bottle` (src/data/fixtures/carvings.json); the fallback
// mock-api build additionally bolts a no-anchor carving to `tower-stub`
// (e2e/mock-api.mjs), the one scenario the checked-in fixtures can't
// exercise on their own, to prove the characteristic engine degrades to
// steady art instead of crashing.
import { test, expect } from '@playwright/test';

const FALLBACK_BUILD = 'http://127.0.0.1:4823';

test('the bolted bottle renders the carved shape, the unbolted boat stays built-in', async ({ page }) => {
	await page.goto('/');
	// The boat never stops sailing, so a real click would wait forever for it
	// to hold still; dispatch the click at wherever it is right now (same
	// idiom as e2e/delights.spec.ts's own bottle-drop spec).
	await page.locator('.boat-track').dispatchEvent('click');

	const bottle = page.locator('.bottle');
	await expect(bottle).toBeVisible();
	await expect(bottle).toHaveAttribute('data-bolted', 'bottle');
	// The fixture's test carving is a jar (rect + circle); the built-in is two
	// rects and a path, never a circle.
	await expect(bottle.locator('circle')).toHaveCount(1);
	await expect(bottle.locator('path')).toHaveCount(0);

	// The boat sits right beside it and carries no bolt in the fixtures build:
	// its built-in three-path hull renders exactly as it always has.
	const boat = page.locator('.boat');
	expect(await boat.getAttribute('data-bolted')).toBeNull();
	await expect(boat.locator('path')).toHaveCount(3);
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

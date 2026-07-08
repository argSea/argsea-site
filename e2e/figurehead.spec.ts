// The figurehead render path: the fixtures build carries the v1-seed published
// designs, so its cats render from shape JSON (the svg wears data-figurehead);
// the mock-api builds publish nothing, so the built-in SVGs still show. The 404
// is the deterministic stage: p404.wreck is its only spot, a guaranteed cat.
import { test, expect } from '@playwright/test';

const FEATURED_BUILD = 'http://127.0.0.1:4822';

test('the fixture designs render the cat through the shape path', async ({ page }) => {
	await page.goto('/404.html');
	const svg = page.locator('.harbor-cat--wreck .harbor-cat__svg');
	await expect(svg).toBeVisible();
	await expect(svg).toHaveAttribute('data-figurehead', 'fixture-figurehead-perched');

	// The roles drive the canonical treatments: the tail shape wears the sway
	// class with the design's pivot, the eyes sit in one blink group
	const tail = svg.locator('path.harbor-cat__tail');
	await expect(tail).toHaveCount(1);
	expect(await tail.evaluate((el) => getComputedStyle(el).transformOrigin)).toBe('45px 56px');
	await expect(svg.locator('g.harbor-cat__eyes > ellipse')).toHaveCount(2);

	// Still the same cat to poke
	await svg.click();
	await expect(page.locator('.harbor-cat__bubble')).toBeVisible();
});

test('the lying design renders on the header spot', async ({ page }) => {
	// Math.random 0 pins the header spot: the lying pose
	await page.addInitScript(() => { Math.random = () => 0; });
	await page.setViewportSize({ width: 1200, height: 800 });
	await page.goto('/projects');

	const svg = page.locator('.harbor-cat--lying .harbor-cat__svg');
	await expect(svg).toBeVisible();
	await expect(svg).toHaveAttribute('data-figurehead', 'fixture-figurehead-lying');
	expect(await svg.getAttribute('viewBox')).toBe('0 0 100 48');
});

test('exactly one cat per page holds with the shape path live', async ({ page }) => {
	for (const path of ['/', '/projects', '/hobbies', '/notes', '/404.html']) {
		await page.goto(path);
		// let the director settle its pick (or decide the pick is an overlay spot)
		await page.waitForTimeout(400);
		expect(await page.locator('.harbor-cat').count()).toBeLessThanOrEqual(1);
	}
});

test('with nothing published the built-in cat still shows', async ({ page }) => {
	await page.goto(`${FEATURED_BUILD}/404.html`);
	const svg = page.locator('.harbor-cat--wreck .harbor-cat__svg');
	await expect(svg).toBeVisible();
	await expect(svg).not.toHaveAttribute('data-figurehead');
	// and it is the built-in drawing, not an empty frame
	await expect(svg.locator('path.harbor-cat__tail')).toHaveCount(1);
});

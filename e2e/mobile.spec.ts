// The pocket layout (fixtures build): below the 600px phone line the desktop
// links collapse, the hamburger is gone, and a fixed four-tab bottom bar
// (hello / projects / hobbies / notes) rides every page with the current
// section lit. These specs pin a 390px viewport and assert the bar, its active
// tab, that it navigates, that the compact resume stands in, and that no page
// scrolls sideways.
import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

// route → which tab lights (null on the 404, which lights none)
const PAGES: { path: string; active: string | null }[] = [
	{ path: '/',                                  active: 'hello' },
	{ path: '/projects',                          active: 'projects' },
	{ path: '/hobbies',                           active: 'hobbies' },
	{ path: '/notes',                             active: 'notes' },
	{ path: '/projects/the-great-un-monolithing', active: 'projects' },
	{ path: '/404.html',                          active: null },
];

for (const { path, active } of PAGES) {
	test(`the tab bar rides ${path} with the right active tab`, async ({ page }) => {
		await page.goto(path);

		const bar = page.locator('.tab-bar');
		await expect(bar).toBeVisible();
		await expect(bar.locator('.tab')).toHaveCount(4);

		const lit = bar.locator('.tab.active');
		if (null === active) {
			await expect(lit).toHaveCount(0);
		} else {
			await expect(lit).toHaveCount(1);
			await expect(lit).toContainText(active);
		}
	});

	test(`no sideways scroll on ${path} at 390px`, async ({ page }) => {
		await page.goto(path);
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth,
		);
		expect(overflow).toBeLessThanOrEqual(0);
	});
}

test('the tab bar navigates between sections', async ({ page }) => {
	await page.goto('/');

	await page.locator('.tab-bar .tab', { hasText: 'projects' }).click();
	await expect(page).toHaveURL(/\/projects\/?$/);
	await expect(page.locator('.tab-bar .tab.active')).toContainText('projects');

	await page.locator('.tab-bar .tab', { hasText: 'notes' }).click();
	await expect(page).toHaveURL(/\/notes\/?$/);
	await expect(page.locator('.tab-bar .tab.active')).toContainText('notes');
});

test('below the phone line the hamburger and desktop links are gone, the compact resume stands in', async ({ page }) => {
	await page.goto('/');

	await expect(page.locator('.nav-burger')).toHaveCount(0);
	await expect(page.locator('.site-nav .links')).toBeHidden();

	const resume = page.locator('.site-nav .nav-resume');
	await expect(resume).toBeVisible();
	await expect(resume).toHaveAttribute('href', '/resume.pdf');
});

test('the hobbies chart takes the mock\'s aspect ratio and the log rows stack', async ({ page }) => {
	await page.goto('/hobbies');

	const chart = page.locator('.shipslog__chart');
	await expect(chart).toBeVisible();
	const chartBox = await chart.evaluate((el) => {
		const s = getComputedStyle(el);
		return { aspectRatio: s.aspectRatio.replace(/\s/g, ''), maxHeight: s.maxHeight };
	});
	expect(chartBox.aspectRatio).toBe('5/6');
	expect(chartBox.maxHeight).toBe('520px');

	const row = page.locator('.shipslog__row').first();
	await expect(row).toBeVisible();
	const direction = await row.evaluate((el) => getComputedStyle(el).flexDirection);
	expect(direction).toBe('column');
});

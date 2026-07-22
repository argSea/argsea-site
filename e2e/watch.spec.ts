// The current watch (mock build): the hero always renders its headline; the
// "now" panel beside it only when a watch is kept, same plumbing this page
// has always read off GET /1/watch. design/Hello.dc.html dropped the season
// postcard rack that used to ride alongside the letter (no more watch.
// postcardMediaId/postcard2MediaId on this page), so this file no longer
// proves a rack; it proves the letter, its signature and abandoned line, and
// the bearings chips.
import { test, expect } from '@playwright/test';

const FEATURED_BUILD = 'http://127.0.0.1:4822';

test('the fixtures build keeps no watch: the headline stays, the now panel never renders', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('.hero h1')).toBeVisible();
	await expect(page.locator('.now')).toHaveCount(0);
	await expect(page.locator('.hero')).not.toHaveClass(/hero--watch/);
});

test('a kept watch renders the now panel: the letter, its signature, the abandoned line, and the bearings chips', async ({ page }) => {
	await page.goto(`${FEATURED_BUILD}/`);

	await expect(page.locator('.hero')).toHaveClass(/hero--watch/);
	const now = page.locator('.now');
	await expect(now).toBeVisible();
	await expect(now.locator('.letter .aband')).toHaveText('Out of the rotation on purpose: conference talks and the piano.');
	await expect(now.locator('.letter .sig')).toHaveText('- the mock keeper');
	await expect(now.locator('.letter p').first()).toContainText('ArcXP migration');
	await expect(now.locator('.kept')).toHaveText('kept 15 jul');

	// the mock watch carries two bearings; kind "none" stays plain text, a
	// "note" bearing steers to /notes
	const chips = now.locator('.chips');
	await expect(chips).toContainText('wrangling');
	await expect(chips).toContainText('The ArcXP migration');
	await expect(chips.locator('a[href="/notes"] b')).toHaveText('the journal');
});

test('the hero headline stays fused above the now panel, never a standalone section of its own', async ({ page }) => {
	await page.goto(`${FEATURED_BUILD}/`);
	await expect(page.locator('.hero h1')).toBeVisible();
	// one hero section total: the headline and the now panel share it, side by side
	await expect(page.locator('.hero')).toHaveCount(1);
});

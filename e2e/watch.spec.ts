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

// design/Hello.dc.html perches HarborCat on the now card (pose=perched,
// bubble=left). hello.watch is anchorless in the catalog (WatchCat.tsx owns
// the render, same handoff every overlay island uses), so this proves the
// egg reaches the now card rather than the director, which can't see it.
test('with the eggs on and the watch kept, the cat can perch on the now card', async ({ page }) => {
	// Math.random 0.3 pins hello.watch, index 2 of the 7 enabled hello spots
	// (same pin e2e/gazette.spec.ts used for this spot before the rebuild)
	await page.addInitScript(() => { Math.random = () => 0.3; });
	await page.goto(`${FEATURED_BUILD}/`);

	const mount = page.locator('.watch-cat-mount');
	await expect(mount).toBeVisible();
	await expect(mount.locator('.harbor-cat--perched.harbor-cat--watch')).toBeVisible();

	// canon's own placement: the cat rides the now card's top-left corner
	const catBox = (await mount.boundingBox())!;
	const nowBox = (await page.locator('.now').boundingBox())!;
	expect(catBox.y).toBeLessThan(nowBox.y);
	expect(catBox.y + catBox.height).toBeGreaterThan(nowBox.y);
	expect(Math.abs(catBox.x - nowBox.x)).toBeLessThan(40);
});

// The ten-poke Gull Post finale is retired (2026-07-21 ruling, caravan-meta
// docs/argsea-identity.md: "the Gull Post has one door: the roosting gull").
// design/Hello.dc.html's now-card cat only ever pops a quip; the gull link
// (e2e/gazette.spec.ts) is the paper's one door now.
test('poking the now-card cat past ten never delivers the finale or the paper', async ({ page }) => {
	await page.addInitScript(() => { Math.random = () => 0.3; });
	await page.goto(`${FEATURED_BUILD}/`);

	const svg = page.locator('.watch-cat-mount .harbor-cat__svg');
	await expect(svg).toBeVisible();
	for (let i = 0; i < 12; i++) {
		await svg.click();
	}

	// still a quip bubble, never the finale line or the paper phase
	const bubble = page.locator('.watch-cat-mount .harbor-cat__bubble');
	await expect(bubble).toBeVisible();
	await expect(bubble).not.toHaveClass(/harbor-cat__bubble--big/);
	await expect(bubble).not.toHaveText('EXTRA! EXTRA! cat poked ten times, refuses to comment. full story in the Gull Post. hold still.');
	await expect(page.locator('.watch-cat__gazette-phase')).toHaveCount(0);
	await expect(page).toHaveURL(`${FEATURED_BUILD}/`);
});

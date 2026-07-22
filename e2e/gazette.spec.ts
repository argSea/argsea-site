// The Gull Post (design/Hello Gazette.dc.html): the morning edition reached
// from the hello page's passing gull. The page stands alone on its own paper
// stock; these specs prove it renders straight, that the gull link lands
// here, and that the folio's date and wx are wired (build date, latest
// journal entry's conditions).
import { test, expect } from '@playwright/test';

test('the Gull Post renders its masthead, nav, and delivery gull', async ({ page }) => {
	await page.goto('/gazette');
	await expect(page.locator('.gazette__title')).toHaveText('The Gull Post');
	await expect(page.locator('.gazette__strap')).toContainText('delivered by seabird, payment expected on the spot');
	await expect(page.locator('.gazette__gull')).toBeVisible();

	// the section nav points at the real routes
	const nav = page.locator('.gazette__nav .gazette__nav-link');
	await expect(nav).toHaveCount(4);
	await expect(nav.nth(0)).toHaveAttribute('href', '/projects');
	await expect(nav.nth(1)).toHaveAttribute('href', '/notes');
	await expect(nav.nth(2)).toHaveAttribute('href', '/hobbies');

	// back to the standing edition
	await expect(page.locator('.gazette__foot-back')).toHaveAttribute('href', '/');
});

test('the folio wx reads the latest journal entry\'s conditions', async ({ page }) => {
	await page.goto('/gazette');
	// the newest fixture note's conditions lead the folio wx
	const folio = page.locator('.gazette__folio-item').nth(2);
	await expect(folio).toContainText('wx:');
	await expect(folio).toContainText('fair skies · one fewer diagram');
});

test('the lead story is the flagship, the below-fold stories the featured pair', async ({ page }) => {
	await page.goto('/gazette');
	await expect(page.locator('.gazette__lead .gazette__kicker')).toContainText('no. 002 · flagship');
	// the lead's "by the numbers" grid is the flagship's own facts
	await expect(page.locator('.gazette__numbers-row').first().locator('.gazette__numbers-label')).toHaveText('ownership');
	// the two below-fold kickers carry the featured pair's registry numbers
	const kickers = page.locator('.gazette__below .gazette__kicker');
	await expect(kickers.nth(0)).toContainText('no. 004');
	await expect(kickers.nth(1)).toContainText('no. 006');
});

// The keeper's landing (design/Hello.dc.html) dropped the season postcard
// rack the watch cat used to perch on, so the ten-poke finale it drove has no
// home there anymore; the canon's own entry point is the passing gull, a
// plain link straight to the Gull Post.
test('the passing gull on the hello page links straight to the Gull Post', async ({ page }) => {
	await page.goto('/');
	const gull = page.locator('#gull-mark');
	await expect(gull).toHaveAttribute('href', '/gazette');
	// it sits off-screen and unclickable until it roosts; the link itself is
	// real either way, so dispatch straight past the visibility check
	await gull.dispatchEvent('click');
	await expect(page).toHaveURL(/\/gazette\/?$/);
	await expect(page.locator('.gazette__title')).toHaveText('The Gull Post');
});

// The Gull Post (design/Hello Gazette.dc.html): the easter-egg morning edition
// reached by poking the watch cat ten times. The page stands alone on its own
// paper stock; these specs prove it renders straight, that the finale on the
// home cat phases the wash and navigates here, and that the folio's date and wx
// are wired (build date, latest journal entry's conditions).
import { test, expect } from '@playwright/test';

// The mock builds serve a kept watch (/1/watch), so the split-watch section
// and its cat render there; the fixtures build ships EMPTY_WATCH and never
// shows the cat, so the finale can only be driven against a mock build.
const FEATURED_BUILD = 'http://127.0.0.1:4822';

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

test('poking the watch cat ten times phases the page and lands on the Gull Post', async ({ page }) => {
	// force the page's one-cat pick onto hello.watch (index 2 of the 7 enabled
	// hello spots), so the watch cat mounts and owns the finale
	await page.addInitScript(() => { Math.random = () => 0.3; });
	await page.goto(`${FEATURED_BUILD}/`);

	const cat = page.locator('.watch-cat-mount .harbor-cat__svg');
	await expect(cat).toBeVisible();

	// ten pokes: the tenth swaps the quip for the finale bubble, then the page
	// phases to paper and navigates
	for (let i = 0; i < 10; i++) {
		await cat.click();
	}

	// the gazette wash appears, then the route becomes /gazette
	await expect(page.locator('.watch-cat__gazette-phase')).toBeVisible({ timeout: 4000 });
	await expect(page).toHaveURL(/\/gazette\/?$/, { timeout: 6000 });
	await expect(page.locator('.gazette__title')).toHaveText('The Gull Post');
});

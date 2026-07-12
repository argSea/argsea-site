// Every print surface (the flagship polaroid, the overlay's main print and
// decorative thumbs, a case-study figure) renders the empty paper frame
// instead of a broken glyph, on either of its two triggers: no image name at
// all, or a name whose fetch fails (a print struck from the darkroom after a
// project cited it). Frame class/state is the assertion here, never
// naturalWidth: that's the other specs' job, proving the loaded path against
// the e2e test prints.
import { test, expect } from '@playwright/test';

test('the flagship polaroid renders the empty paper frame when its print 404s', async ({ page }) => {
	await page.route('**/media/images/first-screenshot.svg', (route) => route.fulfill({ status: 404, body: 'not found' }));
	await page.goto('/');

	const frame = page.locator('.home-lights__flagship .polaroid-frame');
	await expect(frame).toHaveClass(/polaroid-frame--empty/);
	await expect(frame.locator('img')).toHaveCount(0);
	await expect(page.locator('.home-lights__polaroid-caption')).toContainText('from the station archive');
});

test('the case-study figure renders the empty paper frame when its print 404s', async ({ page }) => {
	await page.route('**/media/images/first-screenshot.svg', (route) => route.fulfill({ status: 404, body: 'not found' }));
	await page.goto('/projects/the-great-un-monolithing');

	const frame = page.locator('.cs-figure__frame');
	await expect(frame).toHaveClass(/cs-figure__frame--empty/);
	await expect(frame.locator('img')).toHaveCount(0);
	await expect(page.locator('.cs-figure__caption')).toBeVisible();
});

test('a project with no images renders the overlay\'s empty paper frame', async ({ page }) => {
	await page.goto('/projects');
	await page.locator('#light-row-fixture-project-3').click(); // 100k good mornings: images and image both null

	const overlay = page.locator('.overlay-card');
	await expect(overlay).toBeVisible();
	const frame = overlay.locator('.photo-print');
	await expect(frame).toHaveClass(/photo-print--empty/);
	await expect(frame.locator('img')).toHaveCount(0);
	await expect(overlay.locator('.light-entry__photo-caption')).toHaveText('from the station archive');
});

test('a thumb print renders the empty paper frame independently of the main print', async ({ page }) => {
	await page.route('**/media/images/wiring.svg', (route) => route.fulfill({ status: 404, body: 'not found' }));
	await page.goto('/projects');
	await page.locator('#light-row-fixture-project-1').click(); // The Great Un-monolithing: three images

	const overlay = page.locator('.overlay-card');
	await expect(overlay.locator('.photo-print')).not.toHaveClass(/photo-print--empty/);

	const thumbs = overlay.locator('.light-entry__thumb');
	await expect(thumbs).toHaveCount(2);
	await expect(thumbs.first()).toHaveClass(/light-entry__thumb--empty/);
	await expect(thumbs.first().locator('img')).toHaveCount(0);
	await expect(thumbs.nth(1)).not.toHaveClass(/light-entry__thumb--empty/);
});

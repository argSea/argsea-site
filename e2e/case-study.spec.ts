// The case-study route (fixtures build): SSG'd only for the one project with
// a non-empty caseStudy (the flagship), the keeper's-dialect markdown renders
// its numbered sections, facts/outcomes blocks, an amber placeholder chip,
// and mermaid draws as a pre-rendered static SVG, never a runtime script.
import { test, expect } from '@playwright/test';

const SLUG = '/projects/the-great-un-monolithing';

test('the case-study page renders the header, numbered sections, and footer', async ({ page }) => {
	await page.goto(SLUG);

	await expect(page.locator('.cs-title')).toHaveText('The Great Un-monolithing');
	await expect(page.locator('.cs-kicker')).toContainText('NO. 002');
	await expect(page.locator('.status-pill')).toHaveText('lit');

	const headings = page.locator('.cs-heading__text');
	await expect(headings.first()).toHaveText('The starting point');
	await expect(page.locator('.cs-heading__no').first()).toHaveText('01');

	await expect(page.locator('.cs-footer__signoff')).toContainText('the keeper');
});

test('the keeper\'s dialect renders facts, outcomes, and an amber placeholder chip', async ({ page }) => {
	await page.goto(SLUG);

	await expect(page.locator('.cs-facts-block__label').first()).toHaveText('timeline');
	await expect(page.locator('.cs-outcomes__card')).toHaveCount(4);
	await expect(page.locator('.cs-outcomes__big').first()).toHaveText('29 services');

	const chip = page.locator('.cs-chip').first();
	await expect(chip).toBeVisible();
	await expect(chip).toHaveAttribute('title', 'a fact only the keeper can fill in');
});

test('mermaid renders as a pre-rendered static SVG, no runtime script', async ({ page }) => {
	await page.goto(SLUG);

	const diagram = page.locator('.cs-mermaid svg');
	await expect(diagram).toBeVisible();

	// zero runtime mermaid, no CDN: nothing in the document ever loads it client-side
	const mermaidScripts = await page.locator('script[src*="mermaid"]').count();
	expect(mermaidScripts).toBe(0);
});

test('the register\'s full log link and the overlay both point at the case study', async ({ page }) => {
	await page.goto('/projects');

	const row = page.locator('#light-row-fixture-project-1');
	await expect(row.locator('.register__read')).toHaveText('full log →');

	await row.click();
	const link = page.locator('.light-entry__caselink-link');
	await expect(link).toHaveText('read the full log →');
	await expect(link).toHaveAttribute('href', SLUG);
});

test('the archive figure ships a real print, not a broken glyph', async ({ page }) => {
	await page.goto(SLUG);

	const img = page.locator('.cs-figure__frame img');
	await expect(img).toHaveAttribute('src', '/media/images/first-screenshot.webp');
	await expect
		.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth))
		.toBeGreaterThan(0);
});

// The case-study route (fixtures build): SSG'd for each project joined to a
// published case log (only the flagship carries one). The log renders from
// typed blocks: header, numbered sections, facts/outcomes, an amber placeholder
// chip, and mermaid draws as a pre-rendered static SVG, never a runtime script.
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

test('the case study flattens the sky gradient to one deep field', async ({ page }) => {
	await page.goto(SLUG);

	// The is:global flatten (#131628) only beats global.css's body gradient on
	// source order; pin the computed result so a bundler CSS reorder can't
	// silently let the gradient back in.
	const bg = await page.locator('body').evaluate((el) => {
		const style = getComputedStyle(el);
		return { color: style.backgroundColor, image: style.backgroundImage };
	});
	expect(bg.color).toBe('rgb(19, 22, 40)');
	expect(bg.image).toBe('none');
});

test('the archive figure ships a real print, not a broken glyph', async ({ page }) => {
	await page.goto(SLUG);

	const img = page.locator('.cs-figure__frame img');
	await expect(img).toHaveAttribute('src', '/media/images/first-screenshot.svg');
	await expect
		.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth))
		.toBeGreaterThan(0);
});

test('the footer carries the night watch definition', async ({ page }) => {
	await page.goto(SLUG);
	const definition = page.locator('.definition');
	await expect(definition).toContainText('night watch');
	await expect(definition).toContainText('this website, most evenings');
});

test('night falls over the log: a masked star layer sits behind the header', async ({ page }) => {
	await page.goto(SLUG);

	const specks = page.locator('.cs-stars__specks');
	await expect(specks).toBeAttached();
	expect(await specks.evaluate((element) => getComputedStyle(element).maskImage || getComputedStyle(element).webkitMaskImage)).toContain('linear-gradient');
});

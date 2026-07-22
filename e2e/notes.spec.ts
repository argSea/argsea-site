// The Keeper's Journal (fixtures build): a note's doodle (if any) appears
// small in the row's own left margin, and beside its handwritten caption once
// the entry is open.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import type { Doodle, Note, SiteCopy } from '../src/lib/api';

const fixture = <T,>(name: string): T => JSON.parse(
	readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'fixtures', `${name}.json`), 'utf8'),
);

const notes = fixture<Note[]>('notes');
const doodles = fixture<Doodle[]>('doodles');
const siteCopy = fixture<SiteCopy>('siteCopy');
const doodledNoteCount = notes.filter((note) => note.doodleId && doodles.some((doodle) => doodle.id === note.doodleId)).length;

// Rows run newest-first: the re-architecting note (row 0) and CachyOS (row 1)
// carry a doodle; the queue note (row 2) carries none.
const DOODLED_ROW = 1;
const UNDOODLED_ROW = 2;

test('a margin doodle rides only the rows whose note resolves one', async ({ page }) => {
	expect(doodledNoteCount).toBeGreaterThan(0);
	await page.goto('/notes');
	const rows = page.locator('.note-row');
	await expect(rows).toHaveCount(3);
	await expect(page.locator('.note-row__doodle')).toHaveCount(doodledNoteCount);
});

test('clicking a margin doodle opens its note, same as clicking the row', async ({ page }) => {
	await page.goto('/notes');
	await page.locator('.note-row').nth(DOODLED_ROW).locator('.note-row__doodle').click();

	const letter = page.locator('.overlay-card.letter');
	await expect(letter).toBeVisible();
	await expect(letter.locator('.letter__title')).toHaveText('CachyOS, three months in');
});

test('a row shows its date and conditions line', async ({ page }) => {
	await page.goto('/notes');
	const row = page.locator('.note-row').nth(DOODLED_ROW);
	await expect(row.locator('.note-row__date')).toHaveText('apr 2026');
	await expect(row.locator('.note-row__conditions')).toHaveText('steady winds · kernel freshly compiled');
});

test('the entry shows the doodle and its caption for a doodled note', async ({ page }) => {
	await page.goto('/notes');
	await page.locator('.note-row').nth(DOODLED_ROW).click();

	const letter = page.locator('.overlay-card.letter');
	await expect(letter).toBeVisible();
	await expect(letter.locator('.letter__conditions')).toHaveText('steady winds · kernel freshly compiled');
	await expect(letter.locator('.letter__doodle')).toBeVisible();
	await expect(letter.locator('.letter__doodle-caption')).toHaveText('a boat that mostly steers itself');
});

test('an undoodled note gets no marginalia in the entry', async ({ page }) => {
	await page.goto('/notes');
	await page.locator('.note-row').nth(UNDOODLED_ROW).click();

	const letter = page.locator('.overlay-card.letter');
	await expect(letter).toBeVisible();
	await expect(letter.locator('.letter__marginalia')).toHaveCount(0);
});

test('the entry carries no auto-sig; the keeper signs his own content', async ({ page }) => {
	await page.goto('/notes');
	await page.locator('.note-row').first().click();
	// the keeper signs his own work (2026-07-22 ruling): no component sig,
	// the signature is whatever the note's own content ends with
	await expect(page.locator('.letter__signature')).toHaveCount(0);
});

test('an entry tied to a light shows "found in", linking back to it', async ({ page }) => {
	await page.goto('/notes');
	// row 0, "What re-architecting taught me...", is tied to the flagship via noteIds
	await page.locator('.note-row').first().click();

	const letter = page.locator('.overlay-card.letter');
	await expect(letter.locator('.letter__found-in-label')).toHaveText('found in');
	const link = letter.locator('.letter__found-in-link');
	await expect(link).toHaveText('✷ The Great Un-monolithing →');
});

test('an entry tied to a hobby shows the ◈ chart link out to its bearing', async ({ page }) => {
	await page.goto('/notes');
	// row 1, "CachyOS, three months in", ties to no light but to the home lab
	// bearing (hobby.noteIds), so its "found in" carries only the ◈ chart link
	await page.locator('.note-row').nth(DOODLED_ROW).click();

	const letter = page.locator('.overlay-card.letter');
	await expect(letter).toBeVisible();
	const links = letter.locator('.letter__found-in-link');
	await expect(links).toHaveCount(1);
	await expect(links.first()).toHaveText('◈ The home lab →');
	await expect(links.first()).toHaveAttribute('href', '/hobbies?bearing=The%20home%20lab');
});

test('reduced motion keeps the journal tilt', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/notes');
	const journal = page.locator('.journal');
	await expect(journal).toBeVisible();
	// The tilt is a base transform, so the kill-switch must not flatten it
	expect(await journal.evaluate((element) => getComputedStyle(element).transform)).not.toBe('none');
});

test('the journal foot line spells the entry count', async ({ page }) => {
	await page.goto('/notes');
	// three fixtures: below the bar of five, and plural
	await expect(page.locator('.journal__footer')).toHaveText('Three entries so far. The bar for "journal" is five. We\'ll see.');
});

test('the footer carries the argsea definition', async ({ page }) => {
	await page.goto('/notes');
	const definition = page.locator('.definition');
	await expect(definition).toContainText('argsea');
	await expect(definition).toContainText(siteCopy.dict);
});

test('stepping into the tower from an entry opens the light in place', async ({ page }) => {
	await page.goto('/notes');
	// row 0 ties to the flagship via noteIds
	await page.locator('.note-row').first().click();

	const letter = page.locator('.overlay-card.letter');
	await expect(letter).toBeVisible();
	const towerLink = letter.locator('.letter__found-in-link');
	await expect(towerLink).toHaveAttribute('title', 'step into the tower');
	await towerLink.click();

	// the entry closes and the light's own overlay opens in its place
	await expect(page.locator('.overlay-card.letter')).toHaveCount(0);
	const light = page.locator('.overlay-card.light-entry');
	await expect(light).toBeVisible();
	await expect(light.locator('.light-entry__title')).toHaveText('The Great Un-monolithing');
});

test('the #gull hash forces the wandering gull to roost, linking straight to the gazette', async ({ page }) => {
	await page.goto('/notes#gull');
	const gull = page.locator('.wandering-gull');
	await expect(gull).toBeVisible();
	await expect(gull).toHaveAttribute('href', '/gazette');
});

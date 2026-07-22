// The Gull Post (design/Hello Gazette.dc.html): the easter-egg morning edition
// reached by poking the watch cat ten times. The page stands alone on its own
// paper stock; these specs prove it renders straight, that the finale on the
// home cat phases the wash and navigates here, and that the paper itself
// prints off the data layer: the lead is the flagship, the below-fold pair is
// the next two lit non-flagship lights, the rail is the newest three notes,
// the classifieds and notices come off the hobbies register, and the filler
// ad ports the copy singleton's dictionary.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import type { Project, Note, Hobby, SiteCopy } from '../src/lib/api';

// Read (not import) the fixtures: a JSON module import would need an import
// attribute under Node's ESM loader, which the spec transform rejects
const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'fixtures');
const readFixture = <T>(name: string): T => JSON.parse(readFileSync(join(fixturesDir, `${name}.json`), 'utf8'));

const projects = readFixture<Project[]>('projects');
const notes = readFixture<Note[]>('notes');
const hobbies = readFixture<Hobby[]>('hobbies');
const siteCopy = readFixture<SiteCopy>('siteCopy');

// Same "lit" rule the page derives with: null light burns as the default
// fixed white, otherwise it's lit as long as it carries no extinguished year.
const isLit = (project: Project) => !project.light || !project.light.extinguished;

const flagship = projects.find((project) => project.flagship)!;
const litNonFlagship = projects
	.filter((project) => project.id !== flagship.id && isLit(project))
	.sort((a, b) => a.order - b.order);
const [second, third] = litNonFlagship;

// getNotes() sorts newest-first by publishedAt
const newestNotes = [...notes].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

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

test('the folio prints the copy singleton\'s volume and the newest note\'s conditions as wx', async ({ page }) => {
	await page.goto('/gazette');
	const folio = page.locator('.gazette__folio-item');
	await expect(folio.nth(0)).toHaveText(siteCopy.gazette!.vol);
	// the newest fixture note's conditions lead the folio wx, never the mock's own "wx" field
	await expect(folio.nth(2)).toHaveText(`wx: ${newestNotes[0].conditions}`);
});

test('the lead story is the flagship\'s own gazette block', async ({ page }) => {
	await page.goto('/gazette');
	await expect(page.locator('.gazette__lead .gazette__kicker')).toContainText(`no. ${String(flagship.order * 2).padStart(3, '0')} · flagship`);
	await expect(page.locator('.gazette__headline')).toHaveText(flagship.gazette!.headline);
	await expect(page.locator('.gazette__dek')).toHaveText(flagship.gazette!.deck!);
	// the lead's "by the numbers" grid is the flagship's own facts
	await expect(page.locator('.gazette__numbers-row').first().locator('.gazette__numbers-label')).toHaveText(flagship.facts![0].heading);
});

test('the below-fold pair is the next two lit non-flagship lights, in order', async ({ page }) => {
	await page.goto('/gazette');
	const kickers = page.locator('.gazette__below .gazette__kicker');
	await expect(kickers.nth(0)).toContainText(`no. ${String(second.order * 2).padStart(3, '0')}`);
	await expect(kickers.nth(1)).toContainText(`no. ${String(third.order * 2).padStart(3, '0')}`);

	const subheads = page.locator('.gazette__subhead');
	await expect(subheads.nth(0)).toHaveText(second.gazette!.headline);
	await expect(subheads.nth(1)).toHaveText(third.gazette!.headline);
});

test('the below-fold image slots run each light\'s first picture, the canon placeholder when it has none', async ({ page }) => {
	await page.goto('/gazette');
	const frames = page.locator('.gazette__story-figure-frame');
	await expect(frames.nth(0).locator('img')).toHaveAttribute('src', `/media/images/${second.images![0]}`);
	// third's fixture project carries no images: the frame stands with the paper placeholder, not an <img>
	await expect(frames.nth(1).locator('img')).toHaveCount(0);
	await expect(frames.nth(1).locator('.gazette__figure-paper')).toHaveCount(1);
});

test('the journal rail lists the newest three notes, teasers lowercased into the sub-line', async ({ page }) => {
	await page.goto('/gazette');
	const items = page.locator('.gazette__rail-item');
	await expect(items).toHaveCount(3);
	for (let i = 0; i < 3; i++) {
		const note = newestNotes[i];
		const lowered = note.teaser.charAt(0).toLowerCase() + note.teaser.slice(1);
		await expect(items.nth(i).locator('.gazette__rail-title')).toHaveText(note.title);
		await expect(items.nth(i).locator('.gazette__rail-dek')).toHaveText(`${note.date} · ${lowered}`);
	}
});

test('the notices line names the copy singleton\'s "presently" and the highest-gauge hobby', async ({ page }) => {
	await page.goto('/gazette');
	const ranked = [...hobbies].filter((hobby) => hobby.gauge != null).sort((a, b) => b.gauge! - a.gauge!);
	await expect(page.locator('.gazette__notice-em')).toHaveText(siteCopy.gazette!.presently);
	await expect(page.locator('.gazette__notice')).toContainText(`tinkering with ${ranked[0].name.toLowerCase()}`);
});

test('the classifieds sell the non-moored hobbies, one entry each, the moored one excluded', async ({ page }) => {
	await page.goto('/gazette');
	const nonMoored = hobbies.filter((hobby) => hobby.state !== 'moored');
	const text = (await page.locator('.gazette__classified').textContent())!;
	expect(text.split(' · ')).toHaveLength(nonMoored.length);
	expect(text).not.toContain('HOME LAB');
	for (const hobby of nonMoored) {
		expect(text).toContain(hobby.name.toUpperCase());
	}
});

test('the filler ad ports the argsea dictionary verbatim, the only place the word appears as copy', async ({ page }) => {
	await page.goto('/gazette');
	await expect(page.locator('.gazette__ad-label')).toHaveText('advertisement · run every edition, unpaid');
	const adText = (await page.locator('.gazette__ad-copy').textContent())!.replace(/\s+/g, ' ').trim();
	expect(adText).toContain(siteCopy.dict.replace(/\s+/g, ' ').trim());

	const pageText = (await page.locator('.gazette').textContent())!;
	expect(pageText.match(/argsea/g)).toHaveLength(1);
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

// The keeper's landing dropped the ten-poke finale; the canon's own entry
// point is the passing gull, a plain link straight to the Gull Post.
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

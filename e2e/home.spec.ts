// Homepage (fixtures build, no watch kept): the keeper's landing (design/
// Hello.dc.html). The hero headline always renders; the "now" panel only
// when a watch is kept (proven against the mock in e2e/watch.spec.ts). Three
// flagship rows (the flagship flag first, then the next two by order, never
// by the featured flag), the journal's newest three, and the wandering
// chart's two highest gauges plus its lowest, worn behind the skills gag.
// Counts are derived from the checked-in fixture, never pinned literally,
// same house rule e2e/projects.spec.ts established.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import type { Hobby, Note, Project, SiteCopy } from '../src/lib/api';

const fixture = <T,>(name: string): T => JSON.parse(
	readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'fixtures', `${name}.json`), 'utf8'),
);

const projects = fixture<Project[]>('projects');
const notes = fixture<Note[]>('notes');
const hobbies = fixture<Hobby[]>('hobbies');
const siteCopy = fixture<SiteCopy>('siteCopy');

// The flagship sort: the flagship flag floats first, the rest stay in their
// already-order-sorted place; the register's real no. is order * 2, gapped.
const sorted = [...projects].sort((a, b) => a.order - b.order);
const flagshipFirst = [...sorted].sort((a, b) => (b.flagship ? 1 : 0) - (a.flagship ? 1 : 0)).slice(0, 3);
const flagTitles = flagshipFirst.map((p) => p.title.toLowerCase());
const flagNos = flagshipFirst.map((p) => String(p.order * 2).padStart(3, '0'));

const journalCount = Math.min(3, notes.length);

const gauged = hobbies.filter((h): h is Hobby & { gauge: number } => h.gauge != null).sort((a, b) => b.gauge - a.gauge);
const gaugePicks = gauged.slice(0, 2);
if (gauged.length > 2) gaugePicks.push(gauged[gauged.length - 1]);

test('the hero kicker and pitch read the copy singleton; the headline is the canon\'s own static line', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('.hero .role')).toHaveText('Justin Smith · senior software engineer, Pittsburgh PA');
	await expect(page.locator('.hero h1')).toContainText('I help keep the lights on');
	await expect(page.locator('.hero h1')).toContainText('behind the news.');
	await expect(page.locator('.hero h1 br')).toHaveCount(1);
	await expect(page.locator('.hero .pitch')).toContainText('29 services');
	// the banked round makes the two doors unequal and moves the helm out of
	// them onto the chart door below (design/Hello.dc.html)
	await expect(page.locator('.hero .doors a.lead')).toHaveAttribute('href', '/resume.pdf');
	await expect(page.locator('.hero .doors a.quiet')).toHaveAttribute('href', '/projects');
	await expect(page.locator('.hero .doors a', { hasText: 'set sail' })).toHaveCount(0);
	// the imported round drops the hero's own "say hello" door
	await expect(page.locator('.hero .doors a', { hasText: 'say hello' })).toHaveCount(0);

	const chartDoor = page.locator('.hero .chartdoor');
	await expect(chartDoor).toHaveAttribute('href', '/helm');
	await expect(chartDoor.locator('.cd-kick')).toHaveText('the sea chart');
	await expect(chartDoor.locator('.cd-sub')).toContainText('Built for no reason at all.');
});

test('the fixtures build ships no watch: the headline stands, the now panel never renders', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('.hero h1')).toBeVisible();
	await expect(page.locator('.now')).toHaveCount(0);
	await expect(page.locator('.hero')).not.toHaveClass(/hero--watch/);
});

test(`the flagship rows show the flagship flag first, then the next ${flagTitles.length - 1} by order, never by the featured flag`, async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('.flagship .info b')).toHaveText(flagTitles);
	await expect(page.locator('.flagship .archive')).toHaveText(flagNos.map((no) => `from the station archive · no. ${no}`));
	// zig-zags: the second row flips sides, the first and third don't
	await expect(page.locator('.flagship').nth(0)).not.toHaveClass(/flip/);
	await expect(page.locator('.flagship').nth(1)).toHaveClass(/flip/);
});

test('a flagship row carries its facts and the real characteristic code', async ({ page }) => {
	await page.goto('/');
	const first = page.locator('.flagship').first();
	await expect(first.locator('.frow')).toHaveCount(flagshipFirst[0].facts?.length ?? 0);
	await expect(first.locator('.frow').first().locator('dt')).toHaveText(flagshipFirst[0].facts![0].heading);
	await expect(first.locator('.fl-facts')).toContainText('Fl W 8s');
});

test('the flagship shot links into the light\'s own log', async ({ page }) => {
	await page.goto('/');
	const first = page.locator('.flagship').first();
	await expect(first.locator('.shot')).toHaveAttribute('href', `/projects/${flagshipFirst[0].slug}`);
	await expect(first.locator('.fulllog')).toHaveAttribute('href', `/projects/${flagshipFirst[0].slug}`);
});

test('every flagship row wears its built line, and This website names its harness alongside the keeper', async ({ page }) => {
	await page.goto('/');
	// Canon prints a built row on every light, the by-hand ones included, so
	// the count is the row count rather than the assisted subset.
	await expect(page.locator('.flagship .made')).toHaveCount(flagTitles.length);
	// The wording itself, not just the row: the fixture's top-3 flagships all
	// carry no assist, so every one of them reads the keeper-alone line.
	await expect(page.locator('.flagship .made .lbl').first()).toHaveText('built');
	await expect(page.locator('.flagship .made .val')).toHaveText(flagTitles.map(() => 'by hand'));

	const onFlagship = flagTitles.includes('this website');
	test.skip(!onFlagship, 'this website is order 5, outside the homepage\'s top-3 flagship rows: its assisted line reaches no rendered surface under the current fixture');

	const row = page.locator('.flagship', { has: page.locator('.info b', { hasText: 'this website' }) });
	await expect(row.locator('.made .val')).toHaveText('by hand, with Claude Code alongside');
});

test(`the journal shows its newest ${journalCount} entries`, async ({ page }) => {
	await page.goto('/');
	const cards = page.locator('.feat');
	await expect(cards).toHaveCount(journalCount);
	await expect(cards.first().locator('.feat-main b')).toHaveText(notes[0].title);
	for (const href of await cards.evaluateAll((els) => els.map((el) => el.getAttribute('href')))) {
		expect(href).toBe('/notes');
	}
});

test('a journal card with a tied doodle shows it; one without shows none', async ({ page }) => {
	await page.goto('/');
	const withDoodle = notes.findIndex((note) => note.doodleId);
	const withoutDoodle = notes.findIndex((note) => !note.doodleId);
	expect(withDoodle).toBeGreaterThanOrEqual(0);
	expect(withoutDoodle).toBeGreaterThanOrEqual(0);
	await expect(page.locator('.feat').nth(withDoodle).locator('.feat-doodle')).toHaveCount(1);
	await expect(page.locator('.feat').nth(withoutDoodle).locator('.feat-doodle')).toHaveCount(0);
});

test(`the wandering chart picks its two highest gauges then its lowest, ${gaugePicks.length} in all`, async ({ page }) => {
	await page.goto('/');
	const cards = page.locator('.gauge.rv');
	await expect(cards).toHaveCount(gaugePicks.length);
	await expect(cards.locator('.gtop b')).toHaveText(gaugePicks.map((h) => h.name.toLowerCase()));
	await expect(cards.first()).toHaveAttribute('href', `/hobbies?bearing=${encodeURIComponent(gaugePicks[0].name)}`);
	await expect(page.locator('#hobbies-real .gauge')).toHaveCount(gaugePicks.length);
});

test('the skills gag: the fake grid is stamped from a template, invisible to a plain read of the static HTML', async ({ page }) => {
	const html = await (await page.request.get('/')).text();
	expect(html).not.toContain('javascript</b><span class="gstate">Expert');
	expect(html).toContain('id="skills-fake-tpl"');
	await page.goto('/');
	// the template is stamped client-side, so the fake grid only exists once JS runs
	await expect(page.locator('#skills-fake .gauge')).toHaveCount(12);
});

test('the gull post link sits on the page, aimed at /gazette', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('#gull-mark')).toHaveAttribute('href', '/gazette');
});

test('the sea footer\'s CTA writes to the keeper\'s email; the write-direct aside is gone', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('.cta-doors .primary')).toHaveAttribute('href', 'mailto:hello@argsea.com');
	await expect(page.locator('.cta-aside')).toHaveCount(0);
});

test('the berth CTAs render at the canon mock\'s 46px, not content-box inflated', async ({ page }) => {
	await page.goto('/');
	const box = await page.locator('.cta-doors .primary').boundingBox();
	expect(box?.height).toBe(46);
});

// The canon's berth ends at .cta-doors and carries no link row of its own
// (design/Hello.dc.html); its .berth .row rules are dead CSS with no markup.
// The header nav and the shared footer strip below the sea carry those links.
test('the berth carries no link row of its own', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('.berth .row')).toHaveCount(0);
});

test('the footer carries the argsea definition', async ({ page }) => {
	await page.goto('/');
	const definition = page.locator('.definition');
	await expect(definition).toContainText('argsea');
	await expect(definition).toContainText(siteCopy.dict);
});

test('the tug tows the manifest decoratively: no door, no button role, no pointer', async ({ page }) => {
	await page.goto('/');
	const tow = page.locator('.tow');
	await expect(tow).not.toHaveAttribute('href', /.*/);
	await expect(tow).not.toHaveAttribute('role', /.*/);
	await expect(tow).toHaveAttribute('title', 'the manifest, under tow');
	expect(await tow.evaluate((el) => getComputedStyle(el).cursor)).not.toBe('pointer');
	// the design copy fixture ships no stores drawers, so the manifest falls back to the canon's own barges
	await expect(tow.locator('.barge')).toHaveCount(3);
	await expect(tow.locator('.barge').first().locator('.crate')).toHaveText(['rust', 'python', 'typescript']);
});

test('every page\'s shared footer colophon reads its own per-page signal flag', async ({ page }) => {
	const quipByPath: Record<string, string> = {
		'/':                                        siteCopy.quipHello,
		'/projects':                                siteCopy.quipProjects,
		'/hobbies':                                 siteCopy.quipHobbies,
		'/notes':                                   siteCopy.quipNotes,
		'/404.html':                                siteCopy.quip404,
		[`/projects/${flagshipFirst[0].slug}`]:     siteCopy.quipProjects,
	};
	for (const [path, quip] of Object.entries(quipByPath)) {
		await page.goto(path);
		await expect(page.locator('.copyright')).toHaveText(`© 2026 · ${quip}`);
	}
});

test('reduced motion stills the flagship lamp and freezes the tug in its resting berth', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/');

	const core = page.locator('.flagship').first().locator('.light-badge__core');
	await expect(core).toBeVisible();
	expect(await core.evaluate((el) => el.getAnimations().length)).toBe(0);

	await expect(page.locator('.rv').first()).toHaveCSS('opacity', '1');
	const tow = await page.locator('.tow').evaluate((el) => getComputedStyle(el).transform);
	expect(tow).not.toBe('none');
});

test('the sea sends a bottled proverb on its own schedule, no boat to poke', async ({ page }) => {
	await page.clock.install();
	await page.goto('/');
	await expect(page.locator('.boat-track')).toHaveCount(0);

	await page.clock.fastForward(45000);
	// the bottle keeps drifting (a real CSS animation, not something the fake
	// clock touches), so it never sits still for a real click; dispatch it
	// instead, same idiom the never-stops-sailing tug/boat specs already use
	const glass = page.locator('.bottle-drift__glass-wrap').first();
	await expect(glass).toBeVisible();
	await glass.dispatchEvent('click');

	const note = page.locator('.bottle-note');
	await expect(note).toBeVisible();
	const proverb = await note.locator('.bottle-note__proverb').textContent();
	expect(siteCopy.bottleProverbs).toContain(proverb);

	await note.dispatchEvent('click');
	await expect(note).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// The overlay layer (design/Hello.dc.html): the three section triggers open
// their subject in place instead of navigating away. Every trigger keeps a real
// href, so these also pin that the click is intercepted rather than followed.
// ---------------------------------------------------------------------------

/** The skills gag hides the gauges until it drops the act; the bearing tests need them. */
async function revealGauges(page: import('@playwright/test').Page) {
	await page.locator('#skills-fake').scrollIntoViewIfNeeded();
	await expect(page.locator('.gauge.rv').first()).toBeVisible({ timeout: 10000 });
}

test('a flagship shot opens the light in place instead of sailing off to its case log', async ({ page }) => {
	await page.goto('/');
	const shot = page.locator('[data-light-shot]').first();
	// the trigger really does carry a navigable href: the interception is what
	// this proves, so a passing test can never just be a dead link
	await expect(shot).toHaveAttribute('href', /\/projects\//);

	await shot.click();
	await expect(page.locator('.light-entry-wrap')).toHaveCount(1);
	await expect(page).toHaveURL(/\/$/);
});

test('a journal card opens the entry on its own paper, still on the home page', async ({ page }) => {
	await page.goto('/');
	const card = page.locator('[data-journal-card]').first();
	await expect(card).toHaveAttribute('href', '/notes');

	await card.click();
	await expect(page.locator('.letter-wrap')).toHaveCount(1);
	await expect(page).toHaveURL(/\/$/);
});

test('a gauge opens the hobby-s bearing card rather than the wandering chart', async ({ page }) => {
	await page.goto('/');
	await revealGauges(page);
	const gauge = page.locator('[data-bearing-gauge]').first();
	await expect(gauge).toHaveAttribute('href', /\/hobbies/);

	await gauge.click();
	await expect(page.locator('.bearing-card')).toHaveCount(1);
	await expect(page.locator('.bearing-card__name')).toHaveText(gauged[0].name);
	await expect(page).toHaveURL(/\/$/);
});

test('a modified click still sails off: the overlay layer only claims the plain one', async ({ page }) => {
	await page.goto('/');
	await page.locator('[data-light-shot]').first().click({ modifiers: ['Shift'] });
	await expect(page.locator('.light-entry-wrap')).toHaveCount(0);
});

// The cross-links are a swap, never a stack: the entry that raised the link is
// gone by the time its destination mounts. Two backdrops at once is the bug
// this shape exists to prevent, so each arm asserts the source is gone.
test('a journal entry steps into the light it was found in, and the entry stands down', async ({ page }) => {
	await page.goto('/');
	await page.locator('[data-journal-card="fixture-note-1"]').click();
	await page.locator('.letter__found-in-link', { hasText: 'The Great Un-monolithing' }).click();

	await expect(page.locator('.light-entry-wrap')).toHaveCount(1);
	await expect(page.locator('.letter-wrap')).toHaveCount(0);
});

test('a journal entry crosses to the bearing it was logged against, and the entry stands down', async ({ page }) => {
	await page.goto('/');
	await page.locator('[data-journal-card="fixture-note-2"]').click();
	await page.locator('.letter__found-in-link', { hasText: 'The home lab' }).click();

	await expect(page.locator('.bearing-card')).toHaveCount(1);
	await expect(page.locator('.letter-wrap')).toHaveCount(0);
});

test('a bearing card pulls up its logged entry, and the card stands down', async ({ page }) => {
	await page.goto('/');
	await revealGauges(page);
	await page.locator('[data-bearing-gauge="fixture-hobby-1"]').click();
	await page.locator('.bearing-card__note-link').first().click();

	await expect(page.locator('.letter-wrap')).toHaveCount(1);
	await expect(page.locator('.bearing-card')).toHaveCount(0);
});

test('Escape closes whichever overlay the layer is holding', async ({ page }) => {
	await page.goto('/');
	await page.locator('[data-journal-card]').first().click();
	await expect(page.locator('.letter-wrap')).toHaveCount(1);

	await page.keyboard.press('Escape');
	await expect(page.locator('.letter-wrap')).toHaveCount(0);
});

test('the section heads wear their lore, and the skills gag swaps its aside with its heading', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('.sec .lore').first()).toHaveText(siteCopy.loreProjects);
	await expect(page.locator('#hobby-lore')).toHaveText(siteCopy.loreSkills);

	await revealGauges(page);
	await expect(page.locator('#hobby-title')).toHaveText('Hobbies');
	await expect(page.locator('#hobby-lore')).toHaveText(siteCopy.loreHobbies);
});

test('the nav wraps to a second row at the mock-s breakpoint instead of vanishing', async ({ page }) => {
	await page.setViewportSize({ width: 820, height: 900 });
	await page.goto('/');

	const links = page.locator('.site-nav .links');
	await expect(links).toBeVisible();

	// wrapped, not squeezed: the links take a row of their own under the brand
	const brand = await page.locator('.site-nav .brand').boundingBox();
	const linkRow = await links.boundingBox();
	expect(linkRow!.y).toBeGreaterThan(brand!.y + brand!.height - 1);
});

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
import type { Hobby, Note, Project } from '../src/lib/api';

const fixture = <T,>(name: string): T => JSON.parse(
	readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'fixtures', `${name}.json`), 'utf8'),
);

const projects = fixture<Project[]>('projects');
const notes = fixture<Note[]>('notes');
const hobbies = fixture<Hobby[]>('hobbies');

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
	await expect(page.locator('.hero .doors a', { hasText: 'set sail' })).toHaveAttribute('href', '/helm');
	// the imported round (design/Hello.dc.html) drops the hero's own "say hello" door
	await expect(page.locator('.hero .doors a', { hasText: 'say hello' })).toHaveCount(0);
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

test('the This-website flagship wears its assisted-by stamp, when it rides the flagship rows', async ({ page }) => {
	// "This website" carries the canon assist (design/site-data.js), but under
	// the current fixture order it isn't one of the top-3 flagship rows, and
	// the register page wears no provenance chip yet (out of this fix's
	// scope), so there's no rendered surface to assert against right now.
	const onFlagship = flagTitles.includes('this website');
	test.skip(!onFlagship, 'this website is order 5, outside the homepage\'s top-3 flagship rows, and the register carries no stamp yet: the stamp reaches no rendered surface under the current fixture');

	await page.goto('/');
	const row = page.locator('.flagship', { has: page.locator('.info b', { hasText: 'this website' }) });
	await expect(row.locator('.tags .stamp')).toHaveText('assisted by opus 4.8');
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

// The imported round (design/Hello.dc.html) drops contact and the github/
// linkedin text links from the row; .sea-social carries the icons instead.
test('the footer link row carries only hello/projects/hobbies/notes/resume', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('.berth .row a')).toHaveText(['hello', 'projects', 'hobbies', 'notes', 'resume ↗']);
});

test('the sea wears its own social icons, GitHub and LinkedIn, hrefs unset like canon\'s', async ({ page }) => {
	await page.goto('/');
	const social = page.locator('.sea-social a');
	await expect(social.nth(0)).toHaveAttribute('aria-label', 'GitHub');
	await expect(social.nth(1)).toHaveAttribute('aria-label', 'LinkedIn');
	for (const href of await social.evaluateAll((els) => els.map((el) => el.getAttribute('href')))) {
		expect(href).toBe('#');
	}
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

test('every page\'s shared footer reads "the lighthouse", not the old byline', async ({ page }) => {
	for (const path of ['/', '/projects', '/hobbies', '/notes', '/404.html', `/projects/${flagshipFirst[0].slug}`]) {
		await page.goto(path);
		await expect(page.locator('.copyright')).toHaveText('© 2026 · the lighthouse');
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
	const siteCopy = fixture<{ bottleProverbs: string[] }>('siteCopy');
	const proverb = await note.locator('.bottle-note__proverb').textContent();
	expect(siteCopy.bottleProverbs).toContain(proverb);

	await note.dispatchEvent('click');
	await expect(note).toHaveCount(0);
});

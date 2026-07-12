// The beacon (sighting build on 4824, armed with a PUBLIC_ base; fixtures build
// on 4821, disarmed). Every ping is intercepted at the network edge and
// answered 204, so nothing here needs a real API: the specs read the beacon's
// own request bodies and assert on the four wire fields. The disarmed and
// doNotTrack cases prove the beacon stays silent, which is the whole point of
// it being off by default.
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const ARMED = 'http://127.0.0.1:4824';
const DISARMED = 'http://127.0.0.1:4821';

interface Sighting {
	kind:    'sail' | 'flip' | 'read' | 'visit' | 'bottle';
	path:    string;
	subject: string;
	ref:     string;
}

// Catch every sighting POST and fulfill it 204, collecting the parsed body.
// sendBeacon and the fetch(keepalive) fallback both surface here, so the specs
// never care which path the beacon actually took.
async function collect(page: Page): Promise<Sighting[]> {
	const seen: Sighting[] = [];
	await page.route(/\/1\/sighting\//, async (route) => {
		const body = route.request().postData();
		if (body) {
			seen.push(JSON.parse(body) as Sighting);
		}
		await route.fulfill({ status: 204 });
	});
	return seen;
}

const only = (seen: Sighting[], kind: Sighting['kind']) => seen.filter((s) => s.kind === kind);

test('a page load emits exactly one sail carrying its path and referrer', async ({ page }) => {
	const seen = await collect(page);
	await page.goto(`${ARMED}/projects`, { referer: `${ARMED}/` });

	await expect.poll(() => only(seen, 'sail').length).toBe(1);
	expect(only(seen, 'sail')[0]).toMatchObject({ kind: 'sail', path: '/projects', subject: '', ref: `${ARMED}/` });
	// a bare load opens nothing, so no flip or read rides along
	expect(seen.filter((s) => s.kind !== 'sail')).toHaveLength(0);
});

test('opening a light emits one flip with the project id, and reopening it does not double-fire', async ({ page }) => {
	const seen = await collect(page);
	await page.goto(`${ARMED}/projects`);

	await page.locator('.register .register__row').first().click();
	await expect(page.locator('.overlay-card.light-entry')).toBeVisible();

	await expect.poll(() => only(seen, 'flip').length).toBe(1);
	expect(only(seen, 'flip')[0]).toMatchObject({ kind: 'flip', path: '/projects', subject: 'fixture-project-1', ref: '' });

	// close and reopen the same light: the once-per-project guard holds
	await page.locator('.overlay-card.light-entry .pill-close').click();
	await expect(page.locator('.overlay-card.light-entry')).toHaveCount(0);
	await page.locator('.register .register__row').first().click();
	await expect(page.locator('.overlay-card.light-entry')).toBeVisible();

	await page.waitForTimeout(300);
	expect(only(seen, 'flip')).toHaveLength(1);
});

test('pulling a note out of a light emits one read with the note id', async ({ page }) => {
	const seen = await collect(page);
	await page.goto(`${ARMED}/projects`);

	// the flagship (fixture-project-1) ties two notes, so its entry offers the pull-out
	await page.locator('.register .register__row').first().click();
	const pull = page.locator('.light-entry__notes-link').first();
	await expect(pull).toBeVisible();
	await pull.click();

	await expect.poll(() => only(seen, 'read').length).toBe(1);
	expect(only(seen, 'read')[0]).toMatchObject({ kind: 'read', path: '/projects', subject: 'fixture-note-1', ref: '' });
});

test('opening a note on the notes page emits one read with the note id', async ({ page }) => {
	const seen = await collect(page);
	await page.goto(`${ARMED}/notes`);

	await page.locator('.note-row').first().click();
	await expect(page.locator('.overlay-card.letter')).toBeVisible();

	await expect.poll(() => only(seen, 'read').length).toBe(1);
	expect(only(seen, 'read')[0]).toMatchObject({ kind: 'read', path: '/notes', subject: 'fixture-note-1', ref: '' });
});

test('opening a hobby record emits one visit with the hobby id, and reopening it does not double-fire', async ({ page }) => {
	const seen = await collect(page);
	await page.goto(`${ARMED}/hobbies`);

	await page.locator('.graveyard__row').first().click();
	await expect(page.locator('.record-modal')).toBeVisible();

	await expect.poll(() => only(seen, 'visit').length).toBe(1);
	expect(only(seen, 'visit')[0]).toMatchObject({ kind: 'visit', path: '/hobbies', subject: 'fixture-hobby-1', ref: '' });

	// close and reopen the same record: the once-per-hobby guard holds
	await page.keyboard.press('Escape');
	await expect(page.locator('.record-modal')).toHaveCount(0);
	await page.locator('.graveyard__row').first().click();
	await expect(page.locator('.record-modal')).toBeVisible();

	await page.waitForTimeout(300);
	expect(only(seen, 'visit')).toHaveLength(1);
});

test('poking the boat emits a bottle, and poking it again emits another with no dedupe', async ({ page }) => {
	const seen = await collect(page);
	await page.goto(`${ARMED}/`);

	// the boat never stops sailing, so dispatch the click wherever it is now; it
	// can fire before the island hydrates, so retry until a bottle actually drops
	await expect(async () => {
		await page.locator('.boat-track').dispatchEvent('click');
		await expect(page.locator('.bottle-note')).toBeVisible({ timeout: 500 });
	}).toPass();

	await expect.poll(() => only(seen, 'bottle').length).toBe(1);
	expect(only(seen, 'bottle')[0]).toMatchObject({ kind: 'bottle', path: '/', subject: '', ref: '' });

	// every poke serves a fresh bottle, so a second poke counts again with no guard
	await page.locator('.boat-track').dispatchEvent('click');
	await expect.poll(() => only(seen, 'bottle').length).toBe(2);
});

test('doNotTrack silences the beacon entirely', async ({ page }) => {
	const seen = await collect(page);
	await page.addInitScript(() => {
		Object.defineProperty(navigator, 'doNotTrack', { get: () => '1', configurable: true });
	});
	await page.goto(`${ARMED}/projects`);

	await page.locator('.register .register__row').first().click();
	await expect(page.locator('.overlay-card.light-entry')).toBeVisible();

	await page.waitForTimeout(400);
	expect(seen).toHaveLength(0);
});

test('Global Privacy Control silences the beacon entirely', async ({ page }) => {
	const seen = await collect(page);
	await page.addInitScript(() => {
		Object.defineProperty(navigator, 'globalPrivacyControl', { get: () => true, configurable: true });
	});
	await page.goto(`${ARMED}/projects`);

	await page.locator('.register .register__row').first().click();
	await expect(page.locator('.overlay-card.light-entry')).toBeVisible();

	await page.waitForTimeout(400);
	expect(seen).toHaveLength(0);
});

test('a build with no base configured fires nothing and stays clean', async ({ page }) => {
	const errors: string[] = [];
	page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));

	const seen = await collect(page);
	await page.goto(`${DISARMED}/projects`);

	await page.locator('.register .register__row').first().click();
	await expect(page.locator('.overlay-card.light-entry')).toBeVisible();
	await page.locator('.light-entry__notes-link').first().click();

	await page.waitForTimeout(400);
	expect(seen).toHaveLength(0);
	expect(errors).toHaveLength(0);
});

// Build-time mermaid rendering for case-study diagrams: zero runtime mermaid,
// no CDN (ruling 7, sessions/repo/2026-07-11-bank-portfolio-evolution-mocks.md).
// Astro's static output ships pre-rendered SVG; this module only ever runs
// inside `astro build`, never in a browser bundle.
//
// mermaid's own renderer needs real DOM (d3 selections, getBBox, etc.), so
// this drives it inside a headless Chromium page via @playwright/test (already
// a dev dependency for the e2e suite) rather than trying to run it under Node.
// One browser instance is shared across every diagram in a build; call
// closeMermaidBrowser() once the caller is done rendering (see getStaticPaths
// in src/pages/projects/[slug].astro) so `astro build` can actually exit.
import { chromium, type Browser } from '@playwright/test';
import { join } from 'node:path';
import type { CaseStudyBlock } from './caseStudy';

// Resolved from the working directory, not import.meta.url: Astro bundles
// this module into dist/ for the build, where a source-relative path would
// resolve to a node_modules that doesn't exist there. `astro build` always
// runs from the project root, so process.cwd() is the reliable anchor.
const MERMAID_BUNDLE = join(process.cwd(), 'node_modules/mermaid/dist/mermaid.min.js');

// Themed to the site's own dark palette (src/styles/global.css tokens), the
// same mapping the design mock's mermaid.initialize() used.
const THEME_VARIABLES = {
	darkMode:            true,
	background:          '#161a2c',
	mainBkg:             '#1a1e33',
	primaryColor:        '#1a1e33',
	primaryTextColor:    '#dde1f0',
	primaryBorderColor:  '#5f6ec4',
	secondaryColor:      '#1e2340',
	tertiaryColor:       '#131728',
	lineColor:           '#93a0e8',
	textColor:           '#c3cbf2',
	nodeBorder:          '#5f6ec4',
	clusterBkg:          '#141830',
	clusterBorder:       '#3a4067',
	edgeLabelBackground: '#131628',
	fontFamily:          "'IBM Plex Mono', monospace",
	fontSize:            '13px',
};

let browserPromise: Promise<Browser> | undefined;

function getBrowser(): Promise<Browser> {
	browserPromise ??= chromium.launch({ headless: true });
	return browserPromise;
}

/** Renders one mermaid source string to an inline SVG string via a headless page. */
export async function renderMermaid(source: string): Promise<string> {
	const browser = await getBrowser();
	const page = await browser.newPage();
	try {
		await page.setContent('<!doctype html><html><body></body></html>');
		await page.addScriptTag({ path: MERMAID_BUNDLE });
		return await page.evaluate(
			async ({ source, themeVariables }) => {
				// @ts-expect-error mermaid is a UMD global injected by the script tag above
				mermaid.initialize({ startOnLoad: false, securityLevel: 'loose', theme: 'base', themeVariables });
				const id = 'cs-mermaid-' + Math.random().toString(36).slice(2, 9);
				// @ts-expect-error same global
				const { svg } = await mermaid.render(id, source);
				return svg as string;
			},
			{ source, themeVariables: THEME_VARIABLES },
		);
	} finally {
		await page.close();
	}
}

/** Renders every mermaid block in place (mutating `svg`); a source that fails to render falls back to the mock's own raw-notation message. */
export async function renderMermaidBlocks(blocks: CaseStudyBlock[]): Promise<void> {
	for (const block of blocks) {
		if (block.type !== 'mermaid') {
			continue;
		}
		try {
			block.svg = await renderMermaid(block.source);
		} catch {
			const escaped = block.source.replace(/&/g, '&amp;').replace(/</g, '&lt;');
			block.svg = `<pre class="cs-mermaid__error">the chart would not draw. raw notation:\n${escaped}</pre>`;
		}
	}
}

/** Closes the shared browser once a build's diagrams are all rendered, so `astro build` can exit. */
export async function closeMermaidBrowser(): Promise<void> {
	if (!browserPromise) {
		return;
	}
	const browser = await browserPromise;
	browserPromise = undefined;
	await browser.close();
}

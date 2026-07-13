// Build-time syntax highlighting for case-log code blocks via shiki (bundled
// with Astro), themed to the design mock's own tokenizer palette (design/
// CaseStudy.dc.html): base #c3cbf2 on #131728, comments #6b74a0, strings
// #8fb98a, keywords #93a0e8, numbers #e9b96e. Runs only inside `astro build`;
// the shipped page carries static token spans, no runtime highlighter and no
// CDN, same posture as the mermaid prerender.
//
// The mock tokenizes with a hand-rolled regex; shiki tokenizes with real
// grammars, so token boundaries differ, but the palette matches value-for-
// value. Shiki needs a known language grammar: an unknown or empty lang, or any
// render failure, leaves the block's `html` unset and the page falls back to a
// plain <pre>, same as the mock's unhighlighted default.
import { codeToHtml, type ThemeRegistrationRaw } from 'shiki';
import type { CaseLogBlock } from './caseStudy';

const LOG_THEME: ThemeRegistrationRaw = {
	name: 'argsea-log',
	type: 'dark',
	fg:   '#c3cbf2',
	bg:   '#131728',
	settings: [
		{ settings: { foreground: '#c3cbf2', background: '#131728' } },
		{ scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#6b74a0' } },
		{ scope: ['string', 'string.quoted', 'constant.other.symbol', 'punctuation.definition.string'], settings: { foreground: '#8fb98a' } },
		{ scope: ['keyword', 'storage', 'storage.type', 'storage.modifier', 'keyword.control', 'variable.language', 'constant.language', 'support.type', 'support.class', 'entity.name.tag'], settings: { foreground: '#93a0e8' } },
		{ scope: ['constant.numeric', 'constant.numeric.integer', 'constant.numeric.float'], settings: { foreground: '#e9b96e' } },
	],
};

/** Fills each code block's `html` with themed token spans; an unknown lang or a render failure leaves it unset for the plain-pre fallback. */
export async function highlightCodeBlocks(blocks: CaseLogBlock[]): Promise<void> {
	for (const block of blocks) {
		if ('code' !== block.kind || !block.lang) {
			continue;
		}
		try {
			block.html = await codeToHtml(block.code, { lang: block.lang, theme: LOG_THEME, structure: 'inline' });
		} catch {
			// unknown lang or highlighter error: leave html unset, plain pre renders
		}
	}
}

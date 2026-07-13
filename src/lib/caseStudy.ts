// The case log's block model and inline parser. Case studies publish as typed
// blocks (the CaseLog wire contract lives on api.ts); this file holds that block
// union, the inline-mark parser its text fields carry, and the heading auto-
// numbering the page renders them with. The old block-level dialect parser
// retired when the log moved to structured blocks: prose is still authored with
// the keeper's inline marks, but the block split now happens upstream in the
// admin, not here.
//
// Inline marks stay textual inside a block's text fields and parse here with the
// same priority order and regex as the design mock's inline() (design/
// CaseStudy.dc.html): the amber [? chip ?] placeholder first, then a [text](url)
// link, then `code`, **bold**, *italic*. Marks never touch code/mermaid bodies
// or figure/comparison captions, same as the mock.

export type InlineNode =
	| { kind: 'text'; value: string }
	| { kind: 'chip'; value: string }
	| { kind: 'link'; value: string; url: string }
	| { kind: 'code'; value: string }
	| { kind: 'bold'; value: string }
	| { kind: 'italic'; value: string };

export interface FactRow {
	heading: string;
	fact:    string;
}

export interface OutcomeRow {
	value:   string;
	caption: string;
}

export interface ComparisonStage {
	image: string;
	label: string;
}

export interface TimelineRow {
	date:  string;
	event: string;
	link?: string; // optional; the wire may send "" for no evidence link
}

export interface LinkRow {
	label: string;
	url:   string;
}

export type CalloutRegister = 'note' | 'warning' | 'dead-end';

// The block union, discriminated by `kind`, field-for-field with the CaseLog
// wire contract. The header lives in blocks: the first title/subhead/facts/meta
// feed the entry header, any later ones render in-flow (see [slug].astro).
// `code.html` and `mermaid.svg` are filled at build time (codeHighlight.ts,
// mermaid.ts); the wire never carries them.
export type CaseLogBlock =
	| { kind: 'title'; text: string }
	| { kind: 'subhead'; text: string }
	| { kind: 'meta'; established: string; tags: string[] }
	| { kind: 'heading'; text: string }
	| { kind: 'paragraph'; text: string }
	| { kind: 'quote'; text: string }
	| { kind: 'list'; ordered: boolean; items: string[] }
	| { kind: 'code'; lang: string; code: string; html?: string }
	| { kind: 'mermaid'; code: string; svg?: string }
	| { kind: 'facts'; rows: FactRow[] }
	| { kind: 'outcomes'; rows: OutcomeRow[] }
	| { kind: 'figure'; image: string; caption: string }
	| { kind: 'comparison'; stages: ComparisonStage[] }
	| { kind: 'timeline'; rows: TimelineRow[] }
	| { kind: 'links'; rows: LinkRow[] }
	| { kind: 'callout'; register: CalloutRegister; text: string };

// Placeholder chip first (spans reflowed text, non-greedy), then the link token,
// then inline code, then bold, then italic: same priority order as the mock.
const INLINE_RE = /(\[\?[\s\S]+?\?\])|(\[[^\]]+\]\([^)\s]+\))|(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)/;

/** Tokenizes one run of text into text/chip/link/code/bold/italic nodes, verbatim to the mock's `inline()`. */
export function parseInline(text: string): InlineNode[] {
	const nodes: InlineNode[] = [];
	let rest = text;
	while (rest.length) {
		const match = rest.match(INLINE_RE);
		if (!match) {
			nodes.push({ kind: 'text', value: rest });
			break;
		}
		if (match.index! > 0) {
			nodes.push({ kind: 'text', value: rest.slice(0, match.index) });
		}
		const token = match[0];
		if (token.startsWith('[?')) {
			nodes.push({ kind: 'chip', value: token.slice(2, -2).trim() });
		} else if (token.startsWith('[')) {
			const link = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
			nodes.push({ kind: 'link', value: link ? link[1] : token, url: link ? link[2] : '#' });
		} else if (token.startsWith('`')) {
			nodes.push({ kind: 'code', value: token.slice(1, -1) });
		} else if (token.startsWith('**')) {
			nodes.push({ kind: 'bold', value: token.slice(2, -2) });
		} else {
			nodes.push({ kind: 'italic', value: token.slice(1, -1) });
		}
		rest = rest.slice(match.index! + token.length);
	}
	return nodes;
}

export interface NumberedBlock {
	block: CaseLogBlock;
	no?:   string; // '01', '02', ... on heading blocks, in document order
}

/** Numbers heading blocks 01, 02, ... in order, the mock's own section counter; every other block passes through unnumbered. */
export function numberHeadings(blocks: CaseLogBlock[]): NumberedBlock[] {
	let section = 0;
	return blocks.map((block) => {
		if ('heading' === block.kind) {
			section++;
			return { block, no: String(section).padStart(2, '0') };
		}
		return { block };
	});
}

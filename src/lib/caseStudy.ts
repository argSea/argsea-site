// The keeper's dialect: a small markdown-like grammar case studies are
// written in (see the field comment on Project.caseStudy). Build-time only,
// mirrored off the design mock's own line-scanning parser (design/CaseStudy.dc.html
// in the banked mocks) rather than a general markdown library, since the
// dialect is deliberately narrow: numbered `##` sections, `>` from-the-log
// asides, `-`/`*` lists, `:::facts`/`:::outcomes` blocks, fenced code
// (mermaid rendered separately, see mermaid.ts), inline `[? ?]` amber
// placeholder chips, and `![caption](media-name)` figures.
//
// Inline formatting applies to heading/paragraph/quote/list text and facts/
// outcomes cell text, never to code/mermaid bodies or figure captions/keys,
// same as the mock.

export type InlineNode =
	| { kind: 'text'; value: string }
	| { kind: 'chip'; value: string }
	| { kind: 'code'; value: string }
	| { kind: 'bold'; value: string }
	| { kind: 'italic'; value: string };

export interface FactRow {
	label: string;
	value: InlineNode[];
}

export interface OutcomeCard {
	big:     InlineNode[];
	caption: InlineNode[];
}

export type CaseStudyBlock =
	| { type: 'heading'; number: string; nodes: InlineNode[] }
	| { type: 'paragraph'; nodes: InlineNode[] }
	| { type: 'quote'; nodes: InlineNode[] }
	| { type: 'list'; items: InlineNode[][] }
	| { type: 'facts'; rows: FactRow[] }
	| { type: 'outcomes'; cards: OutcomeCard[] }
	| { type: 'code'; body: string }
	| { type: 'mermaid'; source: string; svg: string }
	| { type: 'figure'; caption: string; key: string };

// Placeholder chip first (spans reflowed text, non-greedy), then inline code,
// then bold, then italic: same priority order as the mock.
const INLINE_RE = /(\[\?[\s\S]+?\?\])|(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)/;

/** Tokenizes one run of text into text/chip/code/bold/italic nodes, verbatim to the mock's `inline()`. */
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

interface RawBlock {
	t: 'code' | 'mermaid' | 'facts' | 'outcomes' | 'h' | 'img' | 'quote' | 'ul' | 'p';
	body?:    string;
	rows?:    string[];
	text?:    string;
	items?:   string[];
	caption?: string;
	key?:     string;
}

/** Line-scanning pass, mirroring the mock's `parseMd()`: splits the source into typed raw blocks before inline parsing. */
function scanBlocks(md: string): RawBlock[] {
	const lines = md.split('\n');
	const blocks: RawBlock[] = [];
	let i = 0;
	while (i < lines.length) {
		const line = lines[i];
		if (!line.trim()) { i++; continue; }

		if (line.startsWith('```')) {
			const lang = line.slice(3).trim().toLowerCase();
			const buf: string[] = [];
			i++;
			while (i < lines.length && !lines[i].startsWith('```')) { buf.push(lines[i]); i++; }
			i++;
			blocks.push({ t: lang === 'mermaid' ? 'mermaid' : 'code', body: buf.join('\n') });
			continue;
		}

		if (line.startsWith(':::')) {
			const kind = line.slice(3).trim().toLowerCase();
			const buf: string[] = [];
			i++;
			while (i < lines.length && !lines[i].startsWith(':::')) {
				if (lines[i].trim()) { buf.push(lines[i].trim()); }
				i++;
			}
			i++;
			blocks.push({ t: kind === 'outcomes' ? 'outcomes' : 'facts', rows: buf });
			continue;
		}

		if (/^#{1,3} /.test(line)) {
			blocks.push({ t: 'h', text: line.replace(/^#{1,3} /, '').trim() });
			i++;
			continue;
		}

		const img = line.match(/^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/);
		if (img) {
			blocks.push({ t: 'img', caption: img[1], key: img[2] });
			i++;
			continue;
		}

		if (line.startsWith('> ')) {
			const buf = [line.slice(2)];
			i++;
			while (i < lines.length && lines[i].startsWith('> ')) { buf.push(lines[i].slice(2)); i++; }
			blocks.push({ t: 'quote', text: buf.join(' ') });
			continue;
		}

		if (/^[-*] /.test(line)) {
			const items: string[] = [];
			while (i < lines.length && /^[-*] /.test(lines[i])) { items.push(lines[i].slice(2)); i++; }
			blocks.push({ t: 'ul', items });
			continue;
		}

		const buf = [line];
		i++;
		while (i < lines.length && lines[i].trim() && !/^(#{1,3} |> |:::|```|[-*] )/.test(lines[i])) { buf.push(lines[i]); i++; }
		blocks.push({ t: 'p', text: buf.join(' ') });
	}
	return blocks;
}

/** A `:::facts`/`:::outcomes` row split on the first colon only; a colon-less line is an unlabeled value, same as the mock. */
function splitLabelValue(row: string): { label: string; value: string } {
	const colon = row.indexOf(':');
	return colon > -1
		? { label: row.slice(0, colon).trim(), value: row.slice(colon + 1).trim() }
		: { label: '', value: row };
}

/** An outcomes row is `big | caption`; a third `|`-delimited segment, if any, is dropped, same as the mock. */
function splitOutcome(row: string): { big: string; caption: string } {
	const parts = row.split('|');
	return { big: (parts[0] ?? '').trim(), caption: (parts[1] ?? '').trim() };
}

/**
 * Parses a case study's markdown into typed blocks with inline formatting
 * already resolved, ready for the Astro page to render. Mermaid blocks come
 * back with an empty `svg`; render them separately (see renderMermaidBlocks
 * in mermaid.ts) before the page uses them, since rendering needs a browser.
 */
export function parseCaseStudy(md: string): CaseStudyBlock[] {
	const raw = scanBlocks(md);
	let sectionCount = 0;

	return raw.map((block): CaseStudyBlock => {
		switch (block.t) {
			case 'h':
				sectionCount++;
				return { type: 'heading', number: String(sectionCount).padStart(2, '0'), nodes: parseInline(block.text!) };
			case 'p':
				return { type: 'paragraph', nodes: parseInline(block.text!) };
			case 'quote':
				return { type: 'quote', nodes: parseInline(block.text!) };
			case 'ul':
				return { type: 'list', items: block.items!.map((item) => parseInline(item)) };
			case 'facts':
				return {
					type: 'facts',
					rows: block.rows!.map((row) => {
						const { label, value } = splitLabelValue(row);
						return { label, value: parseInline(value) };
					}),
				};
			case 'outcomes':
				return {
					type: 'outcomes',
					cards: block.rows!.map((row) => {
						const { big, caption } = splitOutcome(row);
						return { big: parseInline(big), caption: parseInline(caption) };
					}),
				};
			case 'code':
				return { type: 'code', body: block.body! };
			case 'mermaid':
				return { type: 'mermaid', source: block.body!, svg: '' };
			case 'img':
				return { type: 'figure', caption: block.caption!, key: block.key! };
		}
	});
}

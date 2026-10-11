// The small markup a Campaign Frame's text is written in. A frame is long
// prose with the occasional bold term, list of prompts and sub-heading, so
// this covers exactly those and nothing else:
//
//   **bold**   *italic*   ***both***   **bold with *italic* inside**
//   - a bullet            (also "•" or "●", as pasted from a document)
//   ### A sub-heading
//
// Every line is its own paragraph: one press of Enter in the editor is one
// paragraph break on the page. Parsed to plain data here so the rendering
// (components/FrameText) never has to build HTML from a string.

export interface FrameSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

export type FrameBlock =
  | { kind: 'paragraph'; spans: FrameSpan[] }
  | { kind: 'heading'; spans: FrameSpan[] }
  | { kind: 'list'; items: FrameSpan[][] };

// Longest marker first, so "***x***" isn't read as bold wrapped in stray
// asterisks. A marker must hug its text ("* not this *"), which is what
// leaves a lone asterisk in ordinary prose alone. Bold closes on the last
// two of a run of asterisks, so "**a *b***" ends its italic before its bold.
const SPAN_PATTERN = /\*\*\*(?!\s)(.+?)(?<!\s)\*\*\*|\*\*(?!\s)(.+?)(?<!\s)\*\*(?!\*)|\*(?![\s*])(.+?)(?<![\s*])\*(?!\*)/g;

type SpanStyle = Pick<FrameSpan, 'bold' | 'italic'>;

export function parseFrameSpans(text: string, style: SpanStyle = {}): FrameSpan[] {
  const spans: FrameSpan[] = [];
  const plain = (part: string) => {
    if (part) spans.push({ text: part, ...style });
  };
  let last = 0;
  for (const match of text.matchAll(SPAN_PATTERN)) {
    const start = match.index ?? 0;
    plain(text.slice(last, start));
    // Bold and italic each look inside themselves for the other, which is
    // how a bold sentence carries an italic term.
    if (match[1] !== undefined) spans.push({ text: match[1], bold: true, italic: true });
    else if (match[2] !== undefined) spans.push(...parseFrameSpans(match[2], { ...style, bold: true }));
    else spans.push(...parseFrameSpans(match[3], { ...style, italic: true }));
    last = start + match[0].length;
  }
  plain(text.slice(last));
  return spans;
}

const BULLET = /^\s*(?:[-•●])\s+(.*)$/;
const HEADING = /^\s*#{1,6}\s+(.*)$/;

export function parseFrameText(text: string): FrameBlock[] {
  const blocks: FrameBlock[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const bullet = BULLET.exec(line);
    if (bullet) {
      const previous = blocks[blocks.length - 1];
      const item = parseFrameSpans(bullet[1]);
      if (previous?.kind === 'list') previous.items.push(item);
      else blocks.push({ kind: 'list', items: [item] });
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) blocks.push({ kind: 'heading', spans: parseFrameSpans(heading[1]) });
    else blocks.push({ kind: 'paragraph', spans: parseFrameSpans(line) });
  }
  return blocks;
}

/** "Loss, Tragedy , Healing" -> ["Loss", "Tragedy", "Healing"]: how the book prints Tone & Feel, Themes and Touchstones. */
export function splitCommaList(text: string): string[] {
  return text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

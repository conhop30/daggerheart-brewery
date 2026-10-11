import DOMPurify from 'dompurify';
import { hbfm } from 'marked-hbfm';

// The Advanced format of a Campaign Frame: one Markdown document, written
// the way Homebrewery (homebrewery.naturalcrit.com, MIT) documents are, and
// drawn as fixed letter-size, two-column pages.
//
//   \page                      starts a new page (nothing flows on its own)
//   \column                    starts the next column
//   {{class,prop:value ...}}   a block or span with those classes and styles
//   ![alt](url) {width:50%}    an image, styled by the braces after it
//
// The Markdown itself is parsed by Homebrewery's own flavour of `marked`
// (the marked-hbfm package), so a document written there reads the same
// here. What it produces is HTML built from the author's text, so every
// page goes through DOMPurify before anything is allowed to draw it.

/** Homebrewery's own rule: a line that is `\page` (or `\pagebreak`), optionally followed by {braces}. */
const PAGE_BREAK = /^(?=\\page(?:break)?(?: *{[^\n{}]*})?$)/m;
const PAGE_LINE = /^\\page(?:break)?(?: *{[^\n{}]*})?[ \t]*\r?\n?/;

/** The document cut into pages, each without its own `\page` line. Always at least one page. */
export function splitPages(markdown: string): string[] {
  return markdown.split(PAGE_BREAK).map((page) => page.replace(PAGE_LINE, ''));
}

export function joinPages(pages: string[]): string {
  return pages.map((page) => page.replace(/\s+$/, '')).join('\n\n\\page\n\n');
}

// Pictures may come from the web, from the app's own folder (dhmedia:) or be
// embedded; links may also point within the document. Nothing else: no
// file:, no javascript:.
const ALLOWED_URI = /^(?:https?:|dhmedia:|data:image\/|#)/i;

// DOMPurify lets any data: URI through on an <img> whatever the pattern
// above says; only embedded pictures are wanted. (Outside a browser, in a
// test of something else that imports this file, there is nothing to hook.)
if (DOMPurify.isSupported) DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
  if ((data.attrName === 'src' || data.attrName === 'href') && !ALLOWED_URI.test(data.attrValue.trim())) {
    data.keepAttr = false;
  }
});

/** What a page's HTML is reduced to before it is drawn. Exported for the tests that pin it. */
export function sanitizeBrewHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    FORBID_TAGS: ['style', 'script', 'iframe', 'frame', 'object', 'embed', 'form', 'input', 'button', 'link', 'meta', 'base'],
    ALLOWED_URI_REGEXP: ALLOWED_URI,
    ADD_ATTR: ['loading'],
  });
}

/** One page of Markdown as sanitized HTML. `index` is the page's position: pages must be rendered in order from 0. */
export function renderBrewPage(markdown: string, index: number): string {
  return sanitizeBrewHtml(hbfm.render(markdown, index));
}

/** The whole document as one sanitized HTML string per page. */
export function renderBrew(markdown: string): string[] {
  return splitPages(markdown).map((page, index) => renderBrewPage(page, index));
}

/** The document's top-level blocks (paragraphs, headings, tables, brace blocks...), as the exact text each was written as. */
export function splitBlocks(pageMarkdown: string): string[] {
  return hbfm.marked.lexer(pageMarkdown).map((token) => token.raw);
}

/** An author's CSS as it is applied inside the pages: without any @import, which would fetch from elsewhere. */
export function cleanBrewCss(css: string): string {
  return css.replace(/@import\b[^;]*;?/gi, '');
}

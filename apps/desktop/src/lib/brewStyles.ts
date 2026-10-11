import baseCss from '../styles/brew/brew-base.css?inline';
import themeCss from '../styles/brew/brew-daggerheart.css?inline';

// The stylesheet that goes inside every BrewPages shadow root: the page
// mechanics, the rules pointing each stain and mask class at its image, then
// the look.

// The stain and mask images are Homebrewery's (MIT; see
// THIRD_PARTY_NOTICES.md). Vite hands back each one's final URL, hashed and
// relative, so they resolve the same under the dev server and the packaged
// app's file:// page.
const assets = import.meta.glob('../assets/brew/**/*.{png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

function maskRules(): string {
  const rules: string[] = [];
  for (const [path, url] of Object.entries(assets)) {
    const stain = /\/watercolor\/watercolor(\d+)\.png$/.exec(path);
    const mask = /\/masks\/(edge|center|corner)\/(\w+)\.webp$/.exec(path);
    let className: string | null = null;
    if (stain) className = `watercolor${Number(stain[1])}`;
    else if (mask) {
      const kind = mask[1][0].toUpperCase() + mask[1].slice(1);
      // "0007" -> 7; the one named mask ("special") keeps its name.
      const variant = /^\d+$/.test(mask[2]) ? String(Number(mask[2])) : mask[2];
      className = `imageMask${kind}${variant}`;
    }
    if (className) rules.push(`.page .${className} { --wc: url("${url}"); }`);
  }
  return rules.join('\n');
}

// All of it sits in a cascade layer, so that anything in a frame's own CSS
// (which is not layered) wins without having to out-specify these rules:
// a plain `h1 { color: ... }` is enough.
export const BREW_CSS = `@layer brew {\n${baseCss}\n${maskRules()}\n${themeCss}\n}`;

/** A string as a CSS <string> token, for handing the frame's name to `content: var(--frame-name)`. */
export function cssString(text: string): string {
  return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n]+/g, ' ')}"`;
}

/** Letter paper at CSS's 96px to the inch: the width a page is drawn at before it is scaled to fit. */
export const PAGE_WIDTH_PX = (215.9 / 25.4) * 96;

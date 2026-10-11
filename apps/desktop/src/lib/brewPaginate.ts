import { cleanBrewCss, joinPages, renderBrewPage, splitBlocks, splitPages } from './brew';
import { BREW_CSS, PAGE_WIDTH_PX, cssString } from './brewStyles';

// Advanced-format pages don't flow: text past the bottom of a page is simply
// cut off until the author writes \page. This does that job for them. Each
// page is laid out for real, off screen, block by block, and a \page is put
// in wherever the next block would not fit.
//
// It only ever adds breaks. A page that already fits is left exactly as it
// was written, and a single block too tall for a page (a very long table)
// can't be split here, so it is reported instead.

export interface PaginateResult {
  markdown: string;
  pageCount: number;
  /** Pages (1-based) that still hold more than fits. */
  overflowing: number[];
}

interface PaginateOptions {
  styleCss?: string;
  frameName?: string;
}

const isHeading = (block: string) => /^\s*#{1,6}\s/.test(block);
const isBlank = (block: string) => block.trim() === '';

export function autoPaginate(markdown: string, { styleCss = '', frameName = '' }: PaginateOptions = {}): PaginateResult {
  const host = document.createElement('div');
  host.style.cssText = `position:fixed; left:-20000px; top:0; width:${PAGE_WIDTH_PX}px; visibility:hidden; pointer-events:none;`;
  host.style.setProperty('--frame-name', cssString(frameName));
  const root = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `${BREW_CSS}\n${cleanBrewCss(styleCss)}`;
  const pagesEl = document.createElement('div');
  pagesEl.className = 'pages';
  // Two pages, so the one being measured is the second: an ordinary page
  // with the running header, unless it turns itself into a title page.
  const first = document.createElement('div');
  first.className = 'page';
  const page = document.createElement('div');
  page.className = 'page';
  const wrapper = document.createElement('div');
  wrapper.className = 'columnWrapper';
  page.append(wrapper);
  pagesEl.append(first, page);
  root.append(style, pagesEl);
  document.body.append(host);

  const fits = (blocks: string[]) => {
    // Already sanitized by renderBrewPage.
    wrapper.innerHTML = renderBrewPage(blocks.join(''), 0);
    return wrapper.scrollWidth <= wrapper.clientWidth + 2 && wrapper.scrollHeight <= wrapper.clientHeight + 2;
  };

  try {
    const out: string[] = [];
    const overflowing: number[] = [];
    for (const original of splitPages(markdown)) {
      const blocks = splitBlocks(original);
      if (fits(blocks)) {
        out.push(original);
        continue;
      }
      let current: string[] = [];
      const emit = () => {
        if (current.some((b) => !isBlank(b))) {
          if (!fits(current)) overflowing.push(out.length + 1);
          out.push(current.join(''));
        }
        current = [];
      };
      for (const block of blocks) {
        if (isBlank(block) || fits([...current, block]) || !current.some((b) => !isBlank(b))) {
          current.push(block);
          continue;
        }
        // The page is full. A heading left at the foot of it belongs with
        // what follows, so it comes along to the next page.
        const carried: string[] = [];
        while (current.length > 1 && (isBlank(current[current.length - 1]) || isHeading(current[current.length - 1]))) {
          carried.unshift(current.pop() as string);
        }
        emit();
        current = [...carried, block];
      }
      emit();
    }
    return { markdown: joinPages(out) + '\n', pageCount: out.length, overflowing };
  } finally {
    host.remove();
  }
}

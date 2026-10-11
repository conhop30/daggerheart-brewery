// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { cleanBrewCss, joinPages, renderBrew, sanitizeBrewHtml, splitBlocks, splitPages } from './brew';

function dom(html: string): HTMLElement {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div;
}

describe('splitPages', () => {
  it('cuts on a \\page line and drops the line itself', () => {
    expect(splitPages('# One\n\n\\page\n\n# Two\n\\pagebreak\nThree')).toEqual(['# One\n\n', '\n# Two\n', 'Three']);
  });

  it('only counts \\page when it is a line of its own', () => {
    expect(splitPages('Write \\page to break.\n  \\page indented')).toHaveLength(1);
  });

  it('always gives at least one page', () => {
    expect(splitPages('')).toEqual(['']);
  });

  it('joinPages puts them back with a \\page between', () => {
    expect(splitPages(joinPages(['# One', '# Two'])).map((p) => p.trim())).toEqual(['# One', '# Two']);
  });
});

describe('renderBrew', () => {
  it('draws ordinary Markdown', () => {
    const [page] = renderBrew('# Overview\n\nBefore **the age** of *Cresting*.\n\n- one\n- two');
    const el = dom(page);
    expect(el.querySelector('h1')?.textContent).toBe('Overview');
    expect(el.querySelector('strong')?.textContent).toBe('the age');
    expect(el.querySelector('em')?.textContent).toBe('Cresting');
    expect(el.querySelectorAll('li')).toHaveLength(2);
  });

  it('renders one HTML string per page', () => {
    expect(renderBrew('One\n\n\\page\n\nTwo\n\n\\page\n\nThree')).toHaveLength(3);
  });

  it('turns \\column into a column break', () => {
    const [page] = renderBrew('Left\n\n\\column\n\nRight');
    expect(dom(page).querySelectorAll('.columnSplit')).toHaveLength(1);
  });

  it('gives a brace block its classes and styles: a watercolor stain', () => {
    const [page] = renderBrew('{{watercolor3,top:20px,left:30px,width:300px,background-color:#BBAD82,opacity:80%}}');
    const stain = dom(page).querySelector('.watercolor3') as HTMLElement;
    expect(stain).not.toBeNull();
    expect(stain.style.top).toBe('20px');
    expect(stain.style.width).toBe('300px');
    expect(stain.style.opacity).toBe('80%');
  });

  it('keeps a masked picture, its custom properties and its own styles', () => {
    const [page] = renderBrew(
      '{{imageMaskEdge2,--offset:10%,--rotation:180\n  ![swamp](dhmedia://frame-image/abc.png) {width:100%,top:0%}\n}}'
    );
    const mask = dom(page).querySelector('.imageMaskEdge2') as HTMLElement;
    expect(mask.getAttribute('style')).toContain('--offset:10%');
    expect(mask.getAttribute('style')).toContain('--rotation:180');
    const img = mask.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('dhmedia://frame-image/abc.png');
    expect(img.getAttribute('alt')).toBe('swamp');
    expect(img.style.width).toBe('100%');
  });

  it('wraps a {{wide}} table across both columns', () => {
    const [page] = renderBrew('{{wide\n| A | B |\n|---|---|\n| 1 | 2 |\n}}');
    expect(dom(page).querySelector('.wide table td')?.textContent).toBe('1');
  });
});

describe('what is never drawn', () => {
  it('scripts, event handlers and embedded frames', () => {
    const [page] = renderBrew(
      'Hi\n\n<script>window.pwned = 1</script>\n\n<img src="https://example.com/a.png" onerror="window.pwned = 1">\n\n<iframe src="https://example.com"></iframe>\n\n<style>.app-shell { display: none }</style>'
    );
    expect(page).not.toMatch(/<script|onerror|<iframe|<style|pwned/i);
    expect(dom(page).querySelector('img')?.getAttribute('src')).toBe('https://example.com/a.png');
  });

  it('links and pictures that point anywhere but the web, the app or an embedded image', () => {
    const html = sanitizeBrewHtml(
      '<a href="javascript:alert(1)">a</a><a href="#overview">b</a><a href="https://daggerheart.com">c</a>' +
        '<img src="file:///C:/Users/secret.png"><img src="data:image/png;base64,AAAA"><img src="data:text/html,<b>x</b>">'
    );
    const el = dom(html);
    const hrefs = Array.from(el.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual([null, '#overview', 'https://daggerheart.com']);
    const srcs = Array.from(el.querySelectorAll('img')).map((img) => img.getAttribute('src'));
    expect(srcs).toEqual([null, 'data:image/png;base64,AAAA', null]);
  });
});

describe('splitBlocks', () => {
  it('gives back the document in pieces that add up to it exactly', () => {
    const text = '# One\n\nA paragraph.\n\n- a\n- b\n\n| A |\n|---|\n| 1 |\n\n{{wide\nBlock\n}}\n';
    const blocks = splitBlocks(text);
    expect(blocks.join('')).toBe(text);
    expect(blocks.length).toBeGreaterThan(4);
  });
});

describe('cleanBrewCss', () => {
  it('drops @import and leaves the rest alone', () => {
    expect(cleanBrewCss('@import url("https://example.com/x.css");\n.page h1 { color: red; }').trim()).toBe(
      '.page h1 { color: red; }'
    );
  });
});

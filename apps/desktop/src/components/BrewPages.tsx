import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { cleanBrewCss, renderBrew } from '../lib/brew';
import { BREW_CSS, PAGE_WIDTH_PX, cssString } from '../lib/brewStyles';

interface BrewPagesProps {
  markdown: string;
  /** The frame's own CSS, applied inside these pages and nowhere else. */
  styleCss?: string;
  /** Shown in each page's running header. */
  frameName: string;
  /** The frame's cover, used by a {{titlePage}}. */
  coverImage?: string | null;
  /** Drawn at full size, one page per printed sheet (Export PDF), instead of scaled to the space available. */
  print?: boolean;
  /** Told, after each layout, which pages (0-based) have more on them than fits. */
  onOverflow?: (pages: number[]) => void;
}

/** True when a page's content has spilled past its two columns. */
export function pageOverflows(page: Element): boolean {
  const wrapper = page.querySelector('.columnWrapper');
  if (!wrapper) return false;
  return wrapper.scrollWidth > wrapper.clientWidth + 2 || wrapper.scrollHeight > wrapper.clientHeight + 2;
}

// An Advanced-format frame, drawn as its letter-size pages. Everything is
// inside a shadow root: the pages' stylesheet (and the frame's own CSS)
// can't touch the app, and the app's styles can't leak into the pages. The
// HTML each page is given has been through DOMPurify (lib/brew), which is the
// only reason dangerouslySetInnerHTML is acceptable here.
function BrewPages({ markdown, styleCss = '', frameName, coverImage, print = false, onOverflow }: BrewPagesProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [root, setRoot] = useState<ShadowRoot | null>(null);
  const [zoom, setZoom] = useState(1);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (host) setRoot(host.shadowRoot ?? host.attachShadow({ mode: 'open' }));
  }, []);

  // Pages keep their real proportions and shrink to the width on offer.
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host || print) return;
    const fit = () => setZoom(Math.min(1, Math.max(0.2, host.clientWidth / PAGE_WIDTH_PX)));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(host);
    return () => observer.disconnect();
  }, [print]);

  const pages = useMemo(() => renderBrew(markdown), [markdown]);
  const userCss = useMemo(() => cleanBrewCss(styleCss), [styleCss]);

  useEffect(() => {
    if (!root || !onOverflow) return;
    const measure = () => {
      const over: number[] = [];
      root.querySelectorAll('.page').forEach((page, i) => {
        if (pageOverflows(page)) over.push(i);
      });
      onOverflow(over);
    };
    measure();
    // Pictures change the layout when they arrive.
    const images = Array.from(root.querySelectorAll('img'));
    images.forEach((img) => img.addEventListener('load', measure));
    return () => images.forEach((img) => img.removeEventListener('load', measure));
  }, [root, pages, userCss, onOverflow]);

  const hostStyle = {
    '--frame-name': cssString(frameName),
    ...(coverImage ? { '--frame-cover': `url("${coverImage}")` } : {}),
  } as CSSProperties;

  return (
    <div ref={hostRef} className="brew-pages" style={hostStyle} data-print={print ? '' : undefined}>
      {root &&
        createPortal(
          <>
            <style>{BREW_CSS}</style>
            <style>{userCss}</style>
            <div className="pages" style={{ zoom }}>
              {pages.map((html, i) => (
                <div className="page" key={i} data-page={i + 1}>
                  <div className="columnWrapper" dangerouslySetInnerHTML={{ __html: html }} />
                </div>
              ))}
            </div>
          </>,
          root
        )}
    </div>
  );
}

export default memo(BrewPages);

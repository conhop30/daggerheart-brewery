import { useMemo, useRef, useState } from 'react';
import type { CampaignFrame } from '../api/campaignFrames';
import { splitPages } from '../lib/brew';
import { exportFramePdf } from '../lib/brewPrint';
import { alertDialog } from '../lib/confirm';
import BrewPages from './BrewPages';

interface BrewReaderProps {
  frame: CampaignFrame;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

interface Heading {
  title: string;
  /** 1-based page it sits on. */
  page: number;
}

/** The document's top-level headings and the page each is on: what the jump list offers. */
export function brewHeadings(markdown: string): Heading[] {
  const headings: Heading[] = [];
  splitPages(markdown).forEach((page, i) => {
    for (const match of page.matchAll(/^#[ \t]+(.+?)[ \t]*#*$/gm)) {
      headings.push({ title: match[1].replace(/[*_`]/g, ''), page: i + 1 });
    }
  });
  return headings;
}

// An Advanced-format frame opened to read: its pages, a list of its
// headings to jump by, and the PDF export.
export default function BrewReader({ frame, onBack, onEdit, onDelete }: BrewReaderProps) {
  const pagesRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const headings = useMemo(() => brewHeadings(frame.markdown), [frame.markdown]);

  function jumpTo(page: number) {
    const root = pagesRef.current?.querySelector('.brew-pages')?.shadowRoot;
    root?.querySelector(`.page[data-page="${page}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function handleExport() {
    setExporting(true);
    try {
      await exportFramePdf(frame);
    } catch (err) {
      alertDialog(err instanceof Error ? err.message : 'Could not export the PDF.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="frame-view frame-view--pages">
      <button type="button" className="frame-view__back" onClick={onBack}>
        &larr; All Campaign Frames
      </button>

      <div className="frame-view__bar">
        <div className="frame-view__bar-title">
          <h1>{frame.name}</h1>
          {frame.concept && <p>{frame.concept}</p>}
        </div>
        <div className="frame-view__bar-actions">
          <button type="button" className="frame-view__bar-action" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export PDF'}
          </button>
          <button type="button" className="frame-view__bar-action" onClick={onEdit}>
            Edit Frame
          </button>
          <button type="button" className="frame-view__bar-action frame-view__bar-action--danger" onClick={onDelete}>
            Delete Frame
          </button>
        </div>
      </div>

      {!frame.markdown.trim() ? (
        <p className="frame-view__empty">
          This frame has nothing written in it yet. Choose Edit Frame above to write it.
        </p>
      ) : (
        <div className="frame-view__layout">
          <nav className="frame-view__jump" aria-label="Headings">
            {headings.map((heading, i) => (
              <button key={i} type="button" className="frame-view__jump-link" onClick={() => jumpTo(heading.page)}>
                {heading.title}
              </button>
            ))}
          </nav>
          <div className="frame-view__pages" ref={pagesRef}>
            <BrewPages
              markdown={frame.markdown}
              styleCss={frame.styleCss}
              frameName={frame.name}
              coverImage={frame.coverImage}
            />
          </div>
        </div>
      )}
    </div>
  );
}

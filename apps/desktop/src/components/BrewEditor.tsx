import { useCallback, useEffect, useLayoutEffect, useRef, useState, type DragEvent } from 'react';
import { apiClient, type FrameImage } from '../api/client';
import { alertDialog } from '../lib/confirm';
import { autoPaginate } from '../lib/brewPaginate';
import * as snippets from '../lib/brewSnippets';
import BrewPages from './BrewPages';
import './BrewEditor.css';

interface BrewEditorProps {
  markdown: string;
  onMarkdownChange: (markdown: string) => void;
  styleCss: string;
  onStyleCssChange: (css: string) => void;
  frameName: string;
  coverImage: string | null;
  /** Writes the frame's structured sections out as Markdown. Offered while there's no Markdown yet. */
  onStartFromSections?: () => void;
}

/** Where a watercolor-edged picture can go; the value says which snippet builds it. */
const PLACEMENTS: { value: string; label: string; build: (image: FrameImage) => string }[] = [
  { value: 'edge-bottom', label: 'Along the bottom', build: (i) => snippets.imageEdge(i.url, 'bottom', i.name) },
  { value: 'edge-top', label: 'Along the top', build: (i) => snippets.imageEdge(i.url, 'top', i.name) },
  { value: 'edge-left', label: 'Down the left', build: (i) => snippets.imageEdge(i.url, 'left', i.name) },
  { value: 'edge-right', label: 'Down the right', build: (i) => snippets.imageEdge(i.url, 'right', i.name) },
  { value: 'center', label: 'In the middle', build: (i) => snippets.imageCenter(i.url, i.name) },
  { value: 'corner-top-left', label: 'Top left corner', build: (i) => snippets.imageCorner(i.url, 'top', 'left', i.name) },
  { value: 'corner-top-right', label: 'Top right corner', build: (i) => snippets.imageCorner(i.url, 'top', 'right', i.name) },
  { value: 'corner-bottom-left', label: 'Bottom left corner', build: (i) => snippets.imageCorner(i.url, 'bottom', 'left', i.name) },
  { value: 'corner-bottom-right', label: 'Bottom right corner', build: (i) => snippets.imageCorner(i.url, 'bottom', 'right', i.name) },
];

// The Advanced editor: the frame as Markdown on the left, its pages as they
// will look on the right, the way Homebrewery lays its editor out. The bar
// above the text inserts the pieces that are awkward to type by hand.
export default function BrewEditor({
  markdown,
  onMarkdownChange,
  styleCss,
  onStyleCssChange,
  frameName,
  coverImage,
  onStartFromSections,
}: BrewEditorProps) {
  const [tab, setTab] = useState<'text' | 'style'>('text');
  const [overflowing, setOverflowing] = useState<number[]>([]);
  // The pages lag the typing a little: laying out a long document on every
  // keystroke would make the text box stutter.
  const [shown, setShown] = useState({ markdown, styleCss });
  const textRef = useRef<HTMLTextAreaElement>(null);
  const caretRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setShown({ markdown, styleCss }), 250);
    return () => clearTimeout(timer);
  }, [markdown, styleCss]);

  // After an insert, the caret goes to the end of what was inserted.
  useLayoutEffect(() => {
    if (caretRef.current === null || !textRef.current) return;
    textRef.current.focus();
    textRef.current.setSelectionRange(caretRef.current, caretRef.current);
    caretRef.current = null;
  }, [markdown]);

  function insert(text: string) {
    const el = textRef.current;
    const start = el ? el.selectionStart : markdown.length;
    const end = el ? el.selectionEnd : markdown.length;
    caretRef.current = start + text.length;
    setTab('text');
    onMarkdownChange(markdown.slice(0, start) + text + markdown.slice(end));
  }

  async function pickImages(build: (image: FrameImage) => string) {
    try {
      const result = await apiClient.importFrameImage();
      if (!result.canceled) insert(result.images.map(build).join(''));
    } catch (err) {
      alertDialog(err instanceof Error ? err.message : 'Could not add that picture.');
    }
  }

  async function handleDrop(e: DragEvent<HTMLTextAreaElement>) {
    // Electron gives a file dragged in from the OS its path.
    const paths = Array.from(e.dataTransfer.files)
      .map((file) => (file as File & { path?: string }).path)
      .filter((path): path is string => Boolean(path));
    if (paths.length === 0) return;
    e.preventDefault();
    try {
      const { images } = await apiClient.importFrameImagePaths(paths);
      insert(images.map((image) => snippets.image(image.url, image.name)).join(''));
    } catch (err) {
      alertDialog(err instanceof Error ? err.message : 'Could not add that picture.');
    }
  }

  function fitToPages() {
    const result = autoPaginate(markdown, { styleCss, frameName });
    onMarkdownChange(result.markdown);
  }

  const handleOverflow = useCallback((pages: number[]) => {
    setOverflowing((prev) => (prev.join() === pages.join() ? prev : pages));
  }, []);

  return (
    <div className="brew-editor">
      <div className="brew-editor__pane">
        <div className="brew-editor__tabs" role="tablist" aria-label="Advanced editor">
          <button type="button" role="tab" aria-selected={tab === 'text'} className="brew-editor__tab" onClick={() => setTab('text')}>
            Text
          </button>
          <button type="button" role="tab" aria-selected={tab === 'style'} className="brew-editor__tab" onClick={() => setTab('style')}>
            Style
          </button>
        </div>

        {tab === 'text' && (
          <>
            <div className="brew-editor__bar" role="toolbar" aria-label="Insert">
              <button type="button" onClick={() => insert(snippets.pageBreak())}>Page break</button>
              <button type="button" onClick={() => insert(snippets.columnBreak())}>Column break</button>
              <button type="button" onClick={() => pickImages((i) => snippets.image(i.url, i.name))}>Picture&hellip;</button>
              <select
                aria-label="Watercolor picture"
                value=""
                onChange={(e) => {
                  const placement = PLACEMENTS.find((p) => p.value === e.target.value);
                  if (placement) pickImages(placement.build);
                }}
              >
                <option value="">Watercolor picture&hellip;</option>
                {PLACEMENTS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => insert(snippets.stain())}>Stain</button>
              <button type="button" onClick={() => insert(snippets.wideBlock())}>Wide block</button>
              <button type="button" onClick={() => insert(snippets.table())}>Table</button>
              <button type="button" onClick={() => insert(snippets.titlePage(frameName || undefined))}>Title page</button>
              <button type="button" onClick={fitToPages} title="Adds a page break wherever a page has more on it than fits">
                Fit to pages
              </button>
            </div>
            {!markdown.trim() && onStartFromSections && (
              <button type="button" className="brew-editor__start" onClick={onStartFromSections}>
                Start from this frame&rsquo;s sections
              </button>
            )}
            <textarea
              ref={textRef}
              className="brew-editor__text"
              aria-label="Frame Markdown"
              spellCheck
              placeholder={'# A heading\n\nWrite in Markdown. \\page starts a new page, \\column the next column.'}
              value={markdown}
              onChange={(e) => onMarkdownChange(e.target.value)}
              onDrop={handleDrop}
            />
            <p className="create-form__hint">
              \page starts a new page and \column the next column; nothing moves to the next page on its own. Pictures you
              add are kept with the app&rsquo;s data on this computer and, like music, are not part of Export Data.
            </p>
          </>
        )}

        {tab === 'style' && (
          <>
            <textarea
              className="brew-editor__text"
              aria-label="Frame CSS"
              spellCheck={false}
              placeholder={'/* CSS for this frame\'s pages only */\n.page h1 { color: #7a1f1f; }'}
              value={styleCss}
              onChange={(e) => onStyleCssChange(e.target.value)}
            />
            <p className="create-form__hint">
              Applies inside this frame&rsquo;s pages and nowhere else. Every page is a <code>.page</code>.
            </p>
          </>
        )}
      </div>

      <div className="brew-editor__preview">
        {overflowing.length > 0 && (
          <p className="brew-editor__overflow" role="status">
            {overflowing.length === 1 ? 'Page' : 'Pages'} {overflowing.map((i) => i + 1).join(', ')}{' '}
            {overflowing.length === 1 ? 'has' : 'have'} more than fits. Add a page break, or use Fit to pages.
          </p>
        )}
        <BrewPages
          markdown={shown.markdown}
          styleCss={shown.styleCss}
          frameName={frameName}
          coverImage={coverImage}
          onOverflow={handleOverflow}
        />
      </div>
    </div>
  );
}

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import { useEffect, useRef, useState } from 'react';
import './RichNotesEditor.css';

interface RichNotesEditorProps {
  /** The note's text, as Markdown — the same format every other free-text field in this app stores. */
  value: string;
  onChange: (markdown: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  /** Reflows the formatted text newspaper-style; the raw-Markdown view always stays one column, since there's nothing to lay out there but the syntax itself. */
  columns?: 1 | 2;
}

type Mode = 'rich' | 'raw';

function getMarkdown(editor: NonNullable<ReturnType<typeof useEditor>>): string {
  // tiptap-markdown's Storage type isn't merged into Tiptap's own
  // Editor['storage'] type, so this needs a cast — see its README.
  return (editor.storage as unknown as { markdown: { getMarkdown(): string } }).markdown.getMarkdown();
}

// A GM's Session notes, formatted live as they're typed — "# Heading" turns
// into an actual heading in place, no separate preview pane — but still
// backed by plain Markdown (tiptap-markdown's Markdown extension parses it
// in and serializes it back out), so it stays the same portable text format
// every other note/description field in this app already uses. The "Show
// Markdown" toggle swaps to a plain textarea over that exact same string,
// for anyone who'd rather edit the raw syntax directly — see SessionNotesPanel.
export default function RichNotesEditor({ value, onChange, onBlur, placeholder, columns = 1 }: RichNotesEditorProps) {
  const [mode, setMode] = useState<Mode>('rich');

  // The editor instance is created exactly once and never remounted on a
  // tab switch or a toolbar click — see the sync effect below for why.
  // Real bug this replaced: SessionNotesPanel keys this component by
  // `page.id`, and a brand-new, never-saved Notes tab only gets a real id
  // once its first edit is committed — which happens on *blur*, and
  // clicking any toolbar button blurs the editor. So "click Bold, then
  // type" was remounting this component mid-click, throwing away whatever
  // had just been typed. Tracking our own last-emitted value instead of
  // keying-to-remount means a real external change (switching tabs) still
  // calls setContent, but our own edit round-tripping back down through
  // `value` is recognized as a no-op and never touches the live document.
  const lastEmitted = useRef(value);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Markdown.configure({ html: false, linkify: false }),
      Placeholder.configure({ placeholder: placeholder ?? 'Notes…' }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const markdown = getMarkdown(editor);
      lastEmitted.current = markdown;
      onChange(markdown);
    },
    onBlur: () => onBlur?.(),
    editorProps: {
      attributes: { class: 'rich-notes-editor__content', 'aria-label': placeholder ?? 'Notes' },
    },
  });

  useEffect(() => {
    if (!editor || value === lastEmitted.current) return;
    lastEmitted.current = value;
    editor.commands.setContent(value);
  }, [editor, value]);

  const btn = (active: boolean) => `rich-notes-editor__btn${active ? ' rich-notes-editor__btn--active' : ''}`;

  return (
    <div className="rich-notes-editor">
      <div className="rich-notes-editor__bar" role="toolbar" aria-label="Notes formatting">
        {mode === 'rich' && editor ? (
          <div className="rich-notes-editor__toolbar">
            <button type="button" className={btn(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()} aria-label="Bold">
              <strong>B</strong>
            </button>
            <button
              type="button"
              className={btn(editor.isActive('heading', { level: 1 }))}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              aria-label="Heading 1"
            >
              H1
            </button>
            <button
              type="button"
              className={btn(editor.isActive('heading', { level: 2 }))}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              aria-label="Heading 2"
            >
              H2
            </button>
            <button
              type="button"
              className={btn(editor.isActive('bulletList'))}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              aria-label="Bullet list"
            >
              &bull; List
            </button>
            <button
              type="button"
              className={btn(editor.isActive('orderedList'))}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              aria-label="Numbered list"
            >
              1. List
            </button>
          </div>
        ) : (
          <div className="rich-notes-editor__bar-spacer" />
        )}
        <button type="button" className="rich-notes-editor__mode-toggle" onClick={() => setMode((m) => (m === 'rich' ? 'raw' : 'rich'))}>
          {mode === 'rich' ? 'Show Markdown' : 'Show Formatted'}
        </button>
      </div>

      {/* Both views stay mounted; CSS hides whichever isn't active instead
          of conditionally rendering, so the rich editor's live ProseMirror
          document (cursor, undo history) survives switching to raw and back —
          exactly the kind of remount this component is built to avoid. */}
      <div
        className={`rich-notes-editor__editable${columns === 2 ? ' rich-notes-editor__editable--columns' : ''}`}
        hidden={mode !== 'rich'}
        // A click below the last line (this box, unlike the content it
        // wraps, is stretched to fill the whole Notes area) should still
        // focus the editor and land the cursor at the end — the same
        // "click anywhere in the box" feel a <textarea> gives for free.
        onClick={(e) => {
          if (e.target === e.currentTarget) editor?.chain().focus('end').run();
        }}
      >
        <EditorContent editor={editor} />
      </div>
      <textarea
        className="rich-notes-editor__raw"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        hidden={mode !== 'raw'}
      />
    </div>
  );
}

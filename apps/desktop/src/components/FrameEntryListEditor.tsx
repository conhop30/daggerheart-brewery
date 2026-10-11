import type { FrameEntry } from '../api/campaignFrames';
import { emptyFrameEntry } from '../lib/frameSections';
import { useListEditor } from '../lib/useListEditor';
import AutoGrowTextarea from './AutoGrowTextarea';
import FrameTableEditor, { emptyFrameTable } from './FrameTableEditor';
import StringListEditor from './StringListEditor';
import './FeatureListEditor.css';

interface FrameEntryListEditorProps {
  /** Singular, e.g. "distinction": names the add button and the remove buttons. */
  itemLabel: string;
  entries: FrameEntry[];
  onChange: (entries: FrameEntry[]) => void;
  /** Whether an entry may carry tables (Distinctions and Campaign Mechanics). */
  allowTables?: boolean;
}

// The editor behind every repeatable section of a Campaign Frame. One entry
// is a heading, its text, any questions to put to the players, and (where
// allowed) tables; entries reorder by their handle like every other list
// editor here.
export default function FrameEntryListEditor({ itemLabel, entries, onChange, allowTables = false }: FrameEntryListEditorProps) {
  const { getHandleProps, getRowClassName, update, remove, add } = useListEditor(entries, onChange, emptyFrameEntry);

  return (
    <div className="frame-entry-editor">
      {entries.map((entry, index) => (
        <div className={`frame-entry-editor__entry${getRowClassName(index)}`} key={index}>
          <div className="frame-entry-editor__head">
            <span {...getHandleProps(index)}>⠿</span>
            <input
              type="text"
              className="frame-entry-editor__heading"
              placeholder="Heading"
              aria-label={`${itemLabel} heading`}
              value={entry.heading}
              onChange={(e) => update(index, (en) => ({ ...en, heading: e.target.value }))}
            />
            <button
              type="button"
              className="feature-editor__remove"
              onClick={() => remove(index)}
              aria-label={`Remove ${itemLabel}`}
            >
              &times;
            </button>
          </div>
          <AutoGrowTextarea
            className="frame-entry-editor__body"
            placeholder="Text"
            aria-label={`${itemLabel} text`}
            value={entry.body}
            onChange={(e) => update(index, (en) => ({ ...en, body: e.target.value }))}
          />
          <StringListEditor
            label="Question"
            placeholder="A question to ask the players"
            values={entry.questions}
            onChange={(questions) => update(index, (en) => ({ ...en, questions }))}
          />
          {allowTables && (
            <>
              {entry.tables.map((table, t) => (
                <FrameTableEditor
                  key={t}
                  table={table}
                  onChange={(next) =>
                    update(index, (en) => ({ ...en, tables: en.tables.map((old, i) => (i === t ? next : old)) }))
                  }
                  onRemove={() => update(index, (en) => ({ ...en, tables: en.tables.filter((_, i) => i !== t) }))}
                />
              ))}
              <button
                type="button"
                className="feature-editor__add"
                onClick={() => update(index, (en) => ({ ...en, tables: [...en.tables, emptyFrameTable()] }))}
              >
                + Add table
              </button>
            </>
          )}
        </div>
      ))}
      <button type="button" className="feature-editor__add frame-entry-editor__add" onClick={add}>
        + Add {itemLabel}
      </button>
    </div>
  );
}

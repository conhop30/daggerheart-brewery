import type { FrameTable } from '../api/campaignFrames';
import AutoGrowTextarea from './AutoGrowTextarea';

interface FrameTableEditorProps {
  table: FrameTable;
  onChange: (table: FrameTable) => void;
  onRemove: () => void;
}

export function emptyFrameTable(): FrameTable {
  return { title: '', caption: '', columns: ['Value', 'Effect'], rows: [['', '']] };
}

// A small grid for a mechanic's table: name the columns, fill the cells.
// Rows are kept exactly as wide as the header as columns come and go, which
// is the shape the store insists on anyway.
export default function FrameTableEditor({ table, onChange, onRemove }: FrameTableEditorProps) {
  function setColumn(index: number, value: string) {
    onChange({ ...table, columns: table.columns.map((c, i) => (i === index ? value : c)) });
  }

  function addColumn() {
    onChange({ ...table, columns: [...table.columns, ''], rows: table.rows.map((row) => [...row, '']) });
  }

  function removeColumn(index: number) {
    onChange({
      ...table,
      columns: table.columns.filter((_, i) => i !== index),
      rows: table.rows.map((row) => row.filter((_, i) => i !== index)),
    });
  }

  function setCell(rowIndex: number, columnIndex: number, value: string) {
    onChange({
      ...table,
      rows: table.rows.map((row, r) => (r === rowIndex ? row.map((cell, c) => (c === columnIndex ? value : cell)) : row)),
    });
  }

  function addRow() {
    onChange({ ...table, rows: [...table.rows, table.columns.map(() => '')] });
  }

  function removeRow(index: number) {
    onChange({ ...table, rows: table.rows.filter((_, i) => i !== index) });
  }

  return (
    <div className="frame-table-editor">
      <div className="frame-table-editor__head">
        <input
          type="text"
          className="frame-table-editor__title"
          placeholder="Table title"
          aria-label="Table title"
          value={table.title}
          onChange={(e) => onChange({ ...table, title: e.target.value })}
        />
        <button type="button" className="frame-table-editor__remove-table" onClick={onRemove}>
          Remove table
        </button>
      </div>
      <input
        type="text"
        placeholder="Line above the table (optional), e.g. how to roll on it"
        aria-label="Table caption"
        value={table.caption}
        onChange={(e) => onChange({ ...table, caption: e.target.value })}
      />
      <div className="frame-table-editor__scroll">
        <table className="frame-table-editor__grid">
          <thead>
            <tr>
              {table.columns.map((column, c) => (
                <th key={c}>
                  <div className="frame-table-editor__column">
                    <input
                      type="text"
                      placeholder={`Column ${c + 1}`}
                      aria-label={`Column ${c + 1} heading`}
                      value={column}
                      onChange={(e) => setColumn(c, e.target.value)}
                    />
                    {table.columns.length > 1 && (
                      <button
                        type="button"
                        className="frame-table-editor__x"
                        onClick={() => removeColumn(c)}
                        aria-label={`Remove column ${c + 1}`}
                      >
                        &times;
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th className="frame-table-editor__gutter" />
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c}>
                    <AutoGrowTextarea
                      aria-label={`Row ${r + 1}, ${table.columns[c] || `column ${c + 1}`}`}
                      value={cell}
                      onChange={(e) => setCell(r, c, e.target.value)}
                    />
                  </td>
                ))}
                <td className="frame-table-editor__gutter">
                  <button
                    type="button"
                    className="frame-table-editor__x"
                    onClick={() => removeRow(r)}
                    aria-label={`Remove row ${r + 1}`}
                  >
                    &times;
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="frame-table-editor__adds">
        <button type="button" className="feature-editor__add" onClick={addRow}>
          + Add row
        </button>
        <button type="button" className="feature-editor__add" onClick={addColumn}>
          + Add column
        </button>
      </div>
    </div>
  );
}

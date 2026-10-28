import { useState } from 'react';
import type { FormEvent } from 'react';
import GameSetSelect from './GameSetSelect';
import TextField from './TextField';
import TextAreaField from './TextAreaField';
import './forms.css';

interface NameDescriptionRecord {
  id: string;
  name: string;
  description: string | null;
  /** Loot's corebook roll/lookup number — absent on types that don't have one, like Consumable. */
  value?: number | null;
  gameSetId: string;
}

interface SimpleNameDescriptionFormProps<T extends NameDescriptionRecord> {
  title: string;
  submitLabel: string;
  /** Pass an existing record to edit it; omit to create a new one. */
  initial?: T | null;
  /** Shows the numeric "Value" field — only Loot has one; Consumable omits this. */
  showValue?: boolean;
  /** Only needed when this form might be used to create — an edit-only caller (e.g. TableDetail) can omit it. */
  create?: (body: { name: string; description?: string; value?: number | null; gameSetId: string }) => Promise<T>;
  update: (id: string, body: { name?: string; description?: string; value?: number | null; gameSetId?: string }) => Promise<T>;
  onSaved: (item: T) => void;
  onCancel: () => void;
}

// Shared by Loot and Consumable — both are just Name + Description + Set
// (plus Loot's optional Value), so a bespoke form per type would be mostly
// duplication.
export default function SimpleNameDescriptionForm<T extends NameDescriptionRecord>({
  title,
  submitLabel,
  initial,
  showValue,
  create,
  update,
  onSaved,
  onCancel,
}: SimpleNameDescriptionFormProps<T>) {
  const isEditing = initial != null;

  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [value, setValue] = useState(initial?.value != null ? String(initial.value) : '');
  const [gameSetId, setGameSetId] = useState<string>(initial?.gameSetId ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!gameSetId) {
      setError('Choose a Game Set.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const body = { name, description, gameSetId, ...(showValue ? { value: value ? Number(value) : null } : {}) };
    try {
      const item = isEditing
        ? await update(initial!.id, body)
        : await (create ? create(body) : Promise.reject(new Error('Create is not supported here.')));
      onSaved(item);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${isEditing ? 'save' : 'create'} the ${title}.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="create-form" onSubmit={submit}>
      <h3 className="create-form__title">{isEditing ? `Edit ${initial!.name}` : `New ${title}`}</h3>
      <TextField label="Name" value={name} onChange={setName} required />
      <TextAreaField label="Description" value={description} onChange={setDescription} />
      {showValue && (
        <TextField label="Value" type="number" value={value} onChange={setValue} min={1} placeholder="Roll # (optional)" />
      )}
      <GameSetSelect value={gameSetId} onChange={setGameSetId} />
      {error && <p className="create-form__error">{error}</p>}
      <div className="create-form__actions">
        <button type="button" onClick={onCancel} className="create-form__cancel">
          Cancel
        </button>
        <button type="submit" className="create-form__submit" disabled={submitting}>
          {submitting ? 'Saving…' : isEditing ? 'Save Changes' : submitLabel}
        </button>
      </div>
    </form>
  );
}

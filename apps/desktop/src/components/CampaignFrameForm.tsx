import { useState } from 'react';
import type { FormEvent } from 'react';
import { campaignFramesApi, type CampaignFrame, type FrameEntry } from '../api/campaignFrames';
import { splitCommaList } from '../lib/frameMarkup';
import { FRAME_ENTRY_SECTIONS, MAX_COMPLEXITY } from '../lib/frameSections';
import AutoGrowTextarea from './AutoGrowTextarea';
import CollapsibleSection from './CollapsibleSection';
import FrameEntryListEditor from './FrameEntryListEditor';
import GameSetSelect from './GameSetSelect';
import ImageUploadField from './ImageUploadField';
import SelectField from './SelectField';
import StringListEditor from './StringListEditor';
import TextField from './TextField';
import './forms.css';
import './CampaignFrameForm.css';

interface CampaignFrameFormProps {
  /** Pass an existing frame to edit it; omit to create a new one. */
  initial?: CampaignFrame | null;
  onSaved: (frame: CampaignFrame) => void;
  onCancel: () => void;
}

type EntrySections = Record<(typeof FRAME_ENTRY_SECTIONS)[number]['key'], FrameEntry[]>;

function LongText({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <AutoGrowTextarea
      className="frame-form__long"
      aria-label={label}
      placeholder={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

// One form for a whole Campaign Frame, in the rulebook's section order.
// A frame runs to pages, so every section past the basics folds away: the
// form opens as a short list of headings (each saying how much it holds)
// rather than a wall of inputs.
export default function CampaignFrameForm({ initial, onSaved, onCancel }: CampaignFrameFormProps) {
  const isEditing = initial != null;

  const [name, setName] = useState(initial?.name ?? '');
  const [gameSetId, setGameSetId] = useState(initial?.gameSetId ?? '');
  const [concept, setConcept] = useState(initial?.concept ?? '');
  const [designers, setDesigners] = useState(initial?.designers ?? '');
  const [complexity, setComplexity] = useState(String(initial?.complexity ?? 1));
  const [coverImage, setCoverImage] = useState<string | null>(initial?.coverImage ?? null);
  const [pitch, setPitch] = useState(initial?.pitch ?? '');
  const [toneAndFeel, setToneAndFeel] = useState((initial?.toneAndFeel ?? []).join(', '));
  const [themes, setThemes] = useState((initial?.themes ?? []).join(', '));
  const [touchstones, setTouchstones] = useState((initial?.touchstones ?? []).join(', '));
  const [overview, setOverview] = useState(initial?.overview ?? '');
  const [sections, setSections] = useState<EntrySections>(
    () => Object.fromEntries(FRAME_ENTRY_SECTIONS.map((s) => [s.key, initial?.[s.key] ?? []])) as EntrySections
  );
  const [incitingIncident, setIncitingIncident] = useState(initial?.incitingIncident ?? '');
  const [sessionZeroQuestions, setSessionZeroQuestions] = useState<string[]>(initial?.sessionZeroQuestions ?? []);
  const [credits, setCredits] = useState(initial?.credits ?? '');
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
    const body = {
      name,
      gameSetId,
      concept,
      designers,
      complexity: Number(complexity) || 1,
      coverImage,
      pitch,
      toneAndFeel: splitCommaList(toneAndFeel),
      themes: splitCommaList(themes),
      touchstones: splitCommaList(touchstones),
      overview,
      ...sections,
      incitingIncident,
      sessionZeroQuestions,
      credits,
    };
    try {
      const frame = isEditing ? await campaignFramesApi.update(initial!.id, body) : await campaignFramesApi.create(body);
      onSaved(frame);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${isEditing ? 'save' : 'create'} the Campaign Frame.`);
    } finally {
      setSubmitting(false);
    }
  }

  const filled = (text: string) => (text.trim() ? '' : ' (empty)');

  return (
    <form className="create-form frame-form" onSubmit={submit}>
      <h3 className="create-form__title">{isEditing ? `Edit ${initial!.name}` : 'New Campaign Frame'}</h3>

      <TextField label="Name" value={name} onChange={setName} required />
      <TextField label="Concept" placeholder="One sentence: the big idea of the campaign" value={concept} onChange={setConcept} />
      <div className="create-form__row">
        <TextField label="Designed by" value={designers} onChange={setDesigners} />
        <SelectField label="Complexity Rating" value={complexity} onChange={setComplexity}>
          {Array.from({ length: MAX_COMPLEXITY }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </SelectField>
      </div>
      <GameSetSelect value={gameSetId} onChange={setGameSetId} />
      <ImageUploadField
        label="Cover image"
        hint="Shown behind the frame's title, and on its card in the gallery."
        value={coverImage}
        onChange={setCoverImage}
        aspectRatio="2.4"
      />

      <p className="create-form__hint">
        In any text below: **bold**, *italic*, start a line with &ldquo;- &rdquo; for a bullet or &ldquo;### &rdquo; for a
        sub-heading. Each new line is a new paragraph. In a section of entries, a first entry with no heading replaces
        the line printed under the section&rsquo;s title.
      </p>

      <CollapsibleSection title={`The Pitch${filled(pitch)}`} defaultOpen={!isEditing}>
        <LongText label="The pitch, as you would read it to your players" value={pitch} onChange={setPitch} />
        <TextField label="Tone & Feel" placeholder="Comma-separated, e.g. Heroic, Uncanny" value={toneAndFeel} onChange={setToneAndFeel} />
        <TextField label="Themes" placeholder="Comma-separated" value={themes} onChange={setThemes} />
        <TextField label="Touchstones" placeholder="Comma-separated" value={touchstones} onChange={setTouchstones} />
      </CollapsibleSection>

      <CollapsibleSection title={`Overview${filled(overview)}`}>
        <LongText label="Overview" value={overview} onChange={setOverview} />
      </CollapsibleSection>

      {FRAME_ENTRY_SECTIONS.map((section) => (
        <CollapsibleSection key={section.key} title={`${section.title} (${sections[section.key].length})`}>
          <FrameEntryListEditor
            itemLabel={section.itemLabel}
            entries={sections[section.key]}
            onChange={(entries) => setSections((prev) => ({ ...prev, [section.key]: entries }))}
            allowTables={section.allowTables}
          />
        </CollapsibleSection>
      ))}

      <CollapsibleSection title={`The Inciting Incident${filled(incitingIncident)}`}>
        <LongText label="The inciting incident" value={incitingIncident} onChange={setIncitingIncident} />
      </CollapsibleSection>

      <CollapsibleSection title={`Session Zero Questions (${sessionZeroQuestions.length})`}>
        <StringListEditor
          label="Question"
          placeholder="A question to ask during session zero"
          values={sessionZeroQuestions}
          onChange={setSessionZeroQuestions}
        />
      </CollapsibleSection>

      <CollapsibleSection title={`Credits${filled(credits)}`}>
        <LongText label="Credits" value={credits} onChange={setCredits} />
      </CollapsibleSection>

      {error && <p className="create-form__error">{error}</p>}
      <div className="create-form__actions">
        <button type="button" onClick={onCancel} className="create-form__cancel">
          Cancel
        </button>
        <button type="submit" className="create-form__submit" disabled={submitting}>
          {submitting ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Campaign Frame'}
        </button>
      </div>
    </form>
  );
}

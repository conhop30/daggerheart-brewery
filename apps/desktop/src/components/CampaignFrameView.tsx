import { useRef, useState, type ReactNode } from 'react';
import { campaignFramesApi, type CampaignFrame, type FrameEntry, type FrameTable } from '../api/campaignFrames';
import { alertDialog, confirmDialog } from '../lib/confirm';
import {
  FRAME_ENTRY_SECTIONS,
  INCITING_INCIDENT_INTRO,
  MAX_COMPLEXITY,
  OVERVIEW_INTRO,
  PITCH_INTRO,
  SESSION_ZERO_INTRO,
} from '../lib/frameSections';
import BrewReader from './BrewReader';
import CampaignFrameForm from './CampaignFrameForm';
import FrameText from './FrameText';
import './BrewEditor.css';
import './CampaignFrameView.css';

const COLUMNS_KEY = 'daggerheart-frame-columns';

function loadColumns(): 1 | 2 {
  try {
    return localStorage.getItem(COLUMNS_KEY) === '2' ? 2 : 1;
  } catch {
    return 1; // localStorage can be unavailable; one column is fine.
  }
}

/** The rulebook's row of dots: how much a frame asks of the GM running it. */
export function ComplexityPips({ value }: { value: number }) {
  return (
    <span className="frame-pips" role="img" aria-label={`Complexity ${value} of ${MAX_COMPLEXITY}`}>
      {Array.from({ length: Math.max(value, 1) }, (_, i) => (
        <span key={i} className="frame-pips__pip" />
      ))}
    </span>
  );
}

function FrameTableView({ table }: { table: FrameTable }) {
  return (
    <figure className={`frame-table${table.columns.length >= 4 ? ' frame-table--wide' : ''}`}>
      {table.caption && (
        <figcaption className="frame-table__caption">
          <FrameText text={table.caption} inline />
        </figcaption>
      )}
      <div className="frame-table__scroll">
        <table>
          <thead>
            {table.title && (
              <tr>
                <th className="frame-table__title" colSpan={Math.max(table.columns.length, 1)}>
                  {table.title}
                </th>
              </tr>
            )}
            {/* A plain numbered list (a d20 of prompts, say) has no column names to show. */}
            {table.columns.some((column) => column.trim()) && (
              <tr>
                {table.columns.map((column, i) => (
                  <th key={i}>{column}</th>
                ))}
              </tr>
            )}
          </thead>
          <tbody>
            {table.rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c}>
                    <FrameText text={cell} inline />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

function FrameEntryView({ entry }: { entry: FrameEntry }) {
  return (
    <div className="frame-entry">
      {entry.heading && <h3 className="frame-entry__heading">{entry.heading}</h3>}
      {entry.body && <FrameText text={entry.body} />}
      {entry.questions.length > 0 && (
        <ul className="frame-entry__questions">
          {entry.questions.map((question, i) => (
            <li key={i}>
              <FrameText text={question} inline />
            </li>
          ))}
        </ul>
      )}
      {entry.tables.map((table, i) => (
        <FrameTableView key={i} table={table} />
      ))}
    </div>
  );
}

interface Section {
  id: string;
  title: string;
  intro?: string;
  content: ReactNode;
}

interface CampaignFrameViewProps {
  frame: CampaignFrame;
  /** The frame's Set, by name, or null while Sets are still loading. */
  setName: string | null;
  onBack: () => void;
  onSaved: (frame: CampaignFrame) => void;
  onDeleted: (id: string) => void;
}

// A Campaign Frame opened to read, section by section in the rulebook's
// order. Sections with nothing in them are left out, so a frame that's only
// a pitch and a few principles reads as a short page, not a form with
// holes in it.
export default function CampaignFrameView({ frame, setName, onBack, onSaved, onDeleted }: CampaignFrameViewProps) {
  const [editing, setEditing] = useState(false);
  const [columns, setColumns] = useState<1 | 2>(loadColumns);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  function changeColumns(next: 1 | 2) {
    setColumns(next);
    try {
      localStorage.setItem(COLUMNS_KEY, String(next));
    } catch {
      // Not remembered, then.
    }
  }

  async function handleDelete() {
    if (!(await confirmDialog(`Delete "${frame.name}"? This can't be undone.`))) return;
    try {
      await campaignFramesApi.remove(frame.id);
      onDeleted(frame.id);
    } catch (err) {
      alertDialog(err instanceof Error ? err.message : 'Could not delete the Campaign Frame.');
    }
  }

  if (editing) {
    return (
      <div className="frame-view">
        <button type="button" className="frame-view__back" onClick={() => setEditing(false)}>
          &larr; Back to {frame.name}
        </button>
        <CampaignFrameForm
          initial={frame}
          onSaved={(saved) => {
            onSaved(saved);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  if (frame.format === 'advanced') {
    return <BrewReader frame={frame} onBack={onBack} onEdit={() => setEditing(true)} onDelete={handleDelete} />;
  }

  const lists = [
    { title: 'Tone & Feel', values: frame.toneAndFeel },
    { title: 'Themes', values: frame.themes },
    { title: 'Touchstones', values: frame.touchstones },
  ].filter((list) => list.values.length > 0);

  const sections: Section[] = [];
  if (frame.pitch || lists.length > 0) {
    sections.push({
      id: 'pitch',
      title: 'The Pitch',
      intro: frame.pitch ? PITCH_INTRO : undefined,
      content: (
        <div className="frame-view__pitch">
          {frame.pitch && <FrameText text={frame.pitch} />}
          {lists.length > 0 && (
            <dl className="frame-view__lists">
              {lists.map((list) => (
                <div key={list.title}>
                  <dt>{list.title}</dt>
                  <dd>{list.values.join(', ')}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      ),
    });
  }
  if (frame.overview) {
    sections.push({ id: 'overview', title: 'Overview', intro: OVERVIEW_INTRO, content: <FrameText text={frame.overview} /> });
  }
  for (const section of FRAME_ENTRY_SECTIONS) {
    const entries = frame[section.key];
    if (entries.length === 0) continue;
    // A frame that says something of its own under the heading ("Only these
    // ancestries are available...") writes it as a first entry with no
    // heading; that takes the place of the stock line.
    const [first, ...rest] = entries;
    const ownIntro = !first.heading && first.body && first.questions.length === 0 && first.tables.length === 0;
    sections.push({
      id: section.key,
      title: section.title,
      intro: ownIntro ? first.body : section.intro,
      content: (ownIntro ? rest : entries).map((entry, i) => <FrameEntryView key={i} entry={entry} />),
    });
  }
  if (frame.incitingIncident) {
    sections.push({
      id: 'incitingIncident',
      title: 'The Inciting Incident',
      intro: INCITING_INCIDENT_INTRO,
      content: <FrameText text={frame.incitingIncident} />,
    });
  }
  if (frame.sessionZeroQuestions.length > 0) {
    sections.push({
      id: 'sessionZero',
      title: 'Session Zero Questions',
      intro: SESSION_ZERO_INTRO,
      content: (
        <ul className="frame-entry__questions">
          {frame.sessionZeroQuestions.map((question, i) => (
            <li key={i}>
              <FrameText text={question} inline />
            </li>
          ))}
        </ul>
      ),
    });
  }
  if (frame.credits) {
    sections.push({ id: 'credits', title: 'Credit', content: <FrameText text={frame.credits} /> });
  }

  return (
    <div className={`frame-view${columns === 2 ? ' frame-view--two' : ''}`}>
      <button type="button" className="frame-view__back" onClick={onBack}>
        &larr; All Campaign Frames
      </button>

      <header className={`frame-view__hero${frame.coverImage ? ' frame-view__hero--art' : ''}`}>
        {frame.coverImage && <div className="frame-view__art" style={{ backgroundImage: `url(${frame.coverImage})` }} />}
        <div className="frame-view__scrim" />
        <div className="frame-view__hero-content">
          <div className="frame-view__actions">
            <button type="button" className="frame-view__action" onClick={() => setEditing(true)}>
              Edit Frame
            </button>
            <button type="button" className="frame-view__action frame-view__action--danger" onClick={handleDelete}>
              Delete Frame
            </button>
          </div>
          <h1 className="frame-view__title">{frame.name}</h1>
          {frame.concept && <p className="frame-view__concept">{frame.concept}</p>}
          <p className="frame-view__meta">
            {frame.designers && <span>Designed by {frame.designers}</span>}
            <span className="frame-view__complexity">
              Complexity Rating <ComplexityPips value={frame.complexity} />
            </span>
            {setName && <span>{setName}</span>}
          </p>
        </div>
      </header>

      {sections.length === 0 ? (
        <p className="frame-view__empty">
          This frame has nothing written in it yet. Choose Edit Frame above to add its pitch, principles and the rest.
        </p>
      ) : (
        <div className="frame-view__layout">
          <nav className="frame-view__jump" aria-label="Sections">
            <div className="frame-toggle frame-view__columns" role="group" aria-label="Columns">
              <button
                type="button"
                className={`frame-toggle__option${columns === 1 ? ' frame-toggle__option--active' : ''}`}
                aria-pressed={columns === 1}
                onClick={() => changeColumns(1)}
              >
                One column
              </button>
              <button
                type="button"
                className={`frame-toggle__option${columns === 2 ? ' frame-toggle__option--active' : ''}`}
                aria-pressed={columns === 2}
                onClick={() => changeColumns(2)}
              >
                Two columns
              </button>
            </div>
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                className="frame-view__jump-link"
                onClick={() => sectionRefs.current[section.id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              >
                {section.title}
              </button>
            ))}
          </nav>
          <article className="frame-view__article">
            {sections.map((section) => (
              <section
                key={section.id}
                className="frame-section"
                data-section={section.id}
                ref={(el) => {
                  sectionRefs.current[section.id] = el;
                }}
              >
                <h2 className="frame-section__title">{section.title}</h2>
                {section.intro && (
                  <p className="frame-section__intro">
                    <FrameText text={section.intro} inline />
                  </p>
                )}
                <div className={`frame-section__body${section.id === 'pitch' ? ' frame-section__body--pitch' : ''}`}>
                  {section.content}
                </div>
              </section>
            ))}
          </article>
        </div>
      )}
    </div>
  );
}

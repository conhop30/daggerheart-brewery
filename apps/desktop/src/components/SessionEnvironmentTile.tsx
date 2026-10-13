import { useState } from 'react';
import type { SessionEnvironment, UpdateSessionEnvironmentRequest } from '../api/sessionEnvironments';
import type { FeatureSections } from '../lib/featureKinds';
import { featureRowsFor } from '../lib/featureKinds';
import { ContentCard, EditableMetaField, FeatureRowLines, MetaChip, StringLines } from './ContentCard';
import TextAreaField from './TextAreaField';
import AdversaryRefButtons from './AdversaryRefButtons';
import './SessionTile.css';

interface SessionEnvironmentTileProps {
  environment: SessionEnvironment;
  /** Looked up live from the master Environment — see CombatPanel for why. */
  masterFeatures: FeatureSections | undefined;
  onChange: (patch: UpdateSessionEnvironmentRequest) => void;
  onRemove: () => void;
}

// Environments have no HP/Stress in Daggerheart, so this is lighter than
// SessionAdversaryTile — description, impulses, and a notes field are the
// only things a GM actually touches during play. (These notes travel with the
// Environment into later sessions — they live on the Environment record
// itself, unrelated to Session-level note-taking.)
//
// Pinned, it leaves the board's columns for a strip across the top (see
// CombatPanel) and is laid out to be short instead of narrow: impulses on
// one line, features side by side in columns.
export default function SessionEnvironmentTile({ environment, masterFeatures, onChange, onRemove }: SessionEnvironmentTileProps) {
  const [featuresOpen, setFeaturesOpen] = useState(true);
  const [bodyOpen, setBodyOpen] = useState(true);
  const featureRows = featureRowsFor(masterFeatures);
  const { pinned } = environment;
  return (
    <ContentCard
      title={environment.label}
      className={`session-environment${pinned ? ' session-environment--pinned' : ''}`}
      titleNode={
        <div className="session-tile__title">
          <button
            type="button"
            className="session-tile__body-toggle"
            onClick={() => setBodyOpen((open) => !open)}
            aria-expanded={bodyOpen}
            aria-label={bodyOpen ? `Collapse ${environment.label}` : `Expand ${environment.label}`}
          >
            {bodyOpen ? '▾' : '▸'}
          </button>
          <h3 className="content-card__title">{environment.label}</h3>
        </div>
      }
      onEdit={() => onChange({ pinned: !pinned })}
      editLabel={pinned ? 'Unpin' : 'Pin to top'}
      onDelete={onRemove}
      deleteLabel="Remove"
      meta={
        <>
          <MetaChip label="Tier" value={environment.tier} />
          <EditableMetaField
            label="Difficulty"
            value={environment.difficulty}
            onChange={(difficulty) => onChange({ difficulty })}
          />
        </>
      }
    >
      {bodyOpen && (
        <>
          {environment.description && <p className="content-card__description">{environment.description}</p>}
          {pinned ? (
            environment.impulses.length > 0 && (
              <p className="session-environment__impulses">
                <strong>Impulses:</strong> {environment.impulses.join(', ')}
              </p>
            )
          ) : (
            <StringLines label="Impulses" values={environment.impulses} />
          )}
          <TextAreaField label="Notes" value={environment.notes ?? ''} onChange={(notes) => onChange({ notes })} rows={pinned ? 1 : 2} />
          {featureRows.length > 0 && (
            <div className="session-tile__features">
              <button
                type="button"
                className="session-tile__features-toggle"
                onClick={() => setFeaturesOpen((open) => !open)}
                aria-expanded={featuresOpen}
              >
                {featuresOpen ? '▾' : '▸'} Features
              </button>
              {featuresOpen && (
                <FeatureRowLines
                  label={null}
                  rows={featureRows}
                  renderExtra={(row) => <AdversaryRefButtons text={row.description} ownerName={environment.name} />}
                />
              )}
            </div>
          )}
        </>
      )}
    </ContentCard>
  );
}

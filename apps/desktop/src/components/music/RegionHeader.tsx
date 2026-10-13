import { useState } from 'react';
import type { MusicRegion } from '../../api/music';
import './RegionHeader.css';

interface RegionHeaderProps {
  region: MusicRegion;
  importing: boolean;
  onRename: (name: string) => void;
  onDelete: () => void;
  onAddFiles: () => void;
}

// The selected region's title (double-click to rename it), Delete (neither
// offered for the built-in Global region), and the dialog-based
// "+ Add Music" entry point.
export default function RegionHeader({ region, importing, onRename, onDelete, onAddFiles }: RegionHeaderProps) {
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState('');

  function submitRename() {
    setRenaming(false);
    onRename(draft);
  }

  return (
    <div className="region-header">
      <div className="region-header__row">
        {renaming ? (
          <input
            autoFocus
            className="region-header__rename"
            value={draft}
            aria-label="Region name"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={submitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitRename();
              if (e.key === 'Escape') setRenaming(false);
            }}
          />
        ) : (
          <h2
            className={`region-header__title${region.isDefault ? '' : ' region-header__title--renamable'}`}
            title={region.isDefault ? undefined : 'Double-click to rename'}
            onDoubleClick={() => {
              if (region.isDefault) return;
              setDraft(region.name);
              setRenaming(true);
            }}
          >
            {region.name}
          </h2>
        )}
        <div className="region-header__actions">
          {!region.isDefault && (
            <button type="button" className="region-header__btn region-header__btn--danger" onClick={onDelete}>
              Delete Region
            </button>
          )}
          <button type="button" className="region-header__btn region-header__btn--primary" onClick={onAddFiles} disabled={importing}>
            {importing ? 'Adding…' : '+ Add Music'}
          </button>
        </div>
      </div>

      {region.isDefault && (
        <p className="region-header__hint">
          Global is the fallback: a region with no music of its own, or a session with no region, plays these.
        </p>
      )}
    </div>
  );
}

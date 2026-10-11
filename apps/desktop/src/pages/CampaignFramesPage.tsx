import { memo, useCallback, useEffect, useState } from 'react';
import { campaignFramesApi, type CampaignFrame } from '../api/campaignFrames';
import CampaignFrameForm from '../components/CampaignFrameForm';
import CampaignFrameView, { ComplexityPips } from '../components/CampaignFrameView';
import SetFilter from '../components/SetFilter';
import { useGameSets } from '../context/GameSetsContext';
import { useApiList } from '../lib/useApiList';
import './BrowsePage.css';
import './CampaignFramesPage.css';

interface CampaignFramesPageProps {
  /** A frame to open straight away: set by a Campaign's "Open frame" button, see App.tsx. */
  jumpToFrame?: string | null;
  onJumpHandled?: () => void;
  /** Called after any frame is saved or deleted, for pages that show a frame's name. */
  onFramesChanged?: () => void;
}

interface FrameCardProps {
  frame: CampaignFrame;
  setName: string | null;
  onOpen: (id: string) => void;
}

const FrameCard = memo(function FrameCard({ frame, setName, onOpen }: FrameCardProps) {
  return (
    <button type="button" className="frame-card" onClick={() => onOpen(frame.id)}>
      <span
        className="frame-card__art"
        style={frame.coverImage ? { backgroundImage: `url(${frame.coverImage})` } : undefined}
        aria-hidden="true"
      />
      <span className="frame-card__body">
        <span className="frame-card__title">{frame.name}</span>
        {frame.concept && <span className="frame-card__concept">{frame.concept}</span>}
        <span className="frame-card__meta">
          <ComplexityPips value={frame.complexity} />
          {setName && <span>{setName}</span>}
          {frame.designers && <span>{frame.designers}</span>}
        </span>
        {frame.toneAndFeel.length > 0 && <span className="frame-card__tone">{frame.toneAndFeel.join(' · ')}</span>}
      </span>
    </button>
  );
});

// The Campaign Frames gallery, and (once one is opened) that frame's own
// reading page: the same gallery -> detail shape DomainsPage uses.
export default function CampaignFramesPage({ jumpToFrame, onJumpHandled, onFramesChanged }: CampaignFramesPageProps) {
  const list = useApiList<CampaignFrame>(campaignFramesApi.list);
  const { gameSets } = useGameSets();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [setFilter, setSetFilter] = useState('all');

  // A frame linked from a Campaign may have been made since this page last
  // loaded its list (pages stay mounted), so the jump refetches rather than
  // trusting what's already here.
  useEffect(() => {
    if (!jumpToFrame) return;
    let cancelled = false;
    campaignFramesApi
      .list()
      .then((frames) => {
        if (cancelled) return;
        const target = frames.find((f) => f.id === jumpToFrame);
        if (!target) return;
        list.upsert(target);
        setCreating(false);
        setSelectedId(target.id);
      })
      .finally(() => {
        if (!cancelled) onJumpHandled?.();
      });
    return () => {
      cancelled = true;
    };
    // list.upsert is a fresh closure every render; only the jump itself should re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpToFrame, onJumpHandled]);

  const handleOpen = useCallback((id: string) => setSelectedId(id), []);
  const setNameOf = (frame: CampaignFrame) => gameSets.find((set) => set.id === frame.gameSetId)?.name ?? null;

  const selected = list.items.find((frame) => frame.id === selectedId) ?? null;
  if (selected) {
    return (
      <div className="browse-page frames-page">
        <CampaignFrameView
          key={selected.id}
          frame={selected}
          setName={setNameOf(selected)}
          onBack={() => setSelectedId(null)}
          onSaved={(saved) => {
            list.upsert(saved);
            onFramesChanged?.();
          }}
          onDeleted={(id) => {
            list.remove(id);
            setSelectedId(null);
            onFramesChanged?.();
          }}
        />
      </div>
    );
  }

  const shown = list.items
    .filter((frame) => setFilter === 'all' || frame.gameSetId === setFilter)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="browse-page frames-page">
      <div className="browse-page__header">
        <h1 className="browse-page__title">Campaign Frames</h1>
        <div className="frames-page__header-actions">
          <SetFilter value={setFilter} onChange={setSetFilter} />
          <button type="button" className="browse-page__add-button" onClick={() => setCreating(true)}>
            + New Campaign Frame
          </button>
        </div>
      </div>

      {creating && (
        <div className="browse-page__inline-form frames-page__form">
          <CampaignFrameForm
            onSaved={(saved) => {
              list.upsert(saved);
              setCreating(false);
              setSelectedId(saved.id);
              onFramesChanged?.();
            }}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}

      {list.loading && <p className="browse-page__status">Loading Campaign Frames&hellip;</p>}
      {list.error && <p className="browse-page__status browse-page__status--error">{list.error}</p>}
      {!list.loading && !list.error && shown.length === 0 && !creating && (
        <p className="browse-page__status">
          {list.items.length === 0
            ? 'No Campaign Frames yet — click + New Campaign Frame above to write one.'
            : 'No Campaign Frames in this Set.'}
        </p>
      )}
      {shown.length > 0 && (
        <div className="frames-page__grid">
          {shown.map((frame) => (
            <FrameCard key={frame.id} frame={frame} setName={setNameOf(frame)} onOpen={handleOpen} />
          ))}
        </div>
      )}
    </div>
  );
}

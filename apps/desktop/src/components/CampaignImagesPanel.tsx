import { useEffect, useState, type DragEvent } from 'react';
import { campaignImagesApi, campaignImageUrl, type CampaignImage } from '../api/campaignImages';
import { alertDialog, confirmDialog } from '../lib/confirm';
import './CampaignImagesPanel.css';

interface CampaignImagesPanelProps {
  campaignId: string;
}

// A Campaign's image folder, at the top of a Session's sidebar: somewhere to
// keep maps. Deliberately small: a list of names with a thumbnail each,
// folded away until wanted. Clicking a thumbnail opens the picture large.
//
// Its own disclosure, not CollapsibleSection, because the heading carries a
// count and the list is fetched up front to have one.
export default function CampaignImagesPanel({ campaignId }: CampaignImagesPanelProps) {
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<CampaignImage[]>([]);
  const [viewing, setViewing] = useState<CampaignImage | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [dropping, setDropping] = useState(false);

  useEffect(() => {
    let cancelled = false;
    campaignImagesApi
      .listByCampaign(campaignId)
      .then((list) => {
        if (!cancelled) setImages(list);
      })
      // An empty folder is what shows; adding still works.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  // Escape closes the large view.
  useEffect(() => {
    if (!viewing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewing(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewing]);

  function fail(err: unknown, fallback: string) {
    alertDialog(err instanceof Error ? err.message : fallback);
  }

  async function add() {
    try {
      const { images: added } = await campaignImagesApi.import(campaignId);
      setImages((prev) => [...prev, ...added]);
    } catch (err) {
      fail(err, 'Could not add those pictures.');
    }
  }

  async function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDropping(false);
    // Electron adds `.path` to a File dragged in from the OS.
    const paths = Array.from(e.dataTransfer.files)
      .map((file) => (file as File & { path?: string }).path)
      .filter((p): p is string => Boolean(p));
    if (paths.length === 0) return;
    try {
      const { images: added } = await campaignImagesApi.importPaths(campaignId, paths);
      setImages((prev) => [...prev, ...added]);
    } catch (err) {
      fail(err, 'Could not add those pictures.');
    }
  }

  async function submitRename(image: CampaignImage) {
    setRenamingId(null);
    const name = draft.trim();
    if (!name || name === image.name) return;
    setImages((prev) => prev.map((i) => (i.id === image.id ? { ...i, name } : i)));
    try {
      await campaignImagesApi.rename(image.id, name);
    } catch (err) {
      fail(err, 'Could not rename that picture.');
    }
  }

  async function remove(image: CampaignImage) {
    if (!(await confirmDialog(`Remove "${image.name}"? The copy kept in the app is deleted; your original file is not.`))) return;
    try {
      await campaignImagesApi.remove(image.id);
      setImages((prev) => prev.filter((i) => i.id !== image.id));
    } catch (err) {
      fail(err, 'Could not remove that picture.');
    }
  }

  return (
    <div className="campaign-images" role="group" aria-label="Images">
      <button type="button" className="campaign-images__toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? '▾' : '▸'} Images
        {images.length > 0 && <span className="campaign-images__count">{images.length}</span>}
      </button>

      {open && (
        <div
          className={`campaign-images__body${dropping ? ' campaign-images__body--dropping' : ''}`}
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes('Files')) return;
            e.preventDefault();
            setDropping(true);
          }}
          onDragLeave={() => setDropping(false)}
          onDrop={handleDrop}
        >
          {images.length === 0 && <p className="campaign-images__empty">No pictures yet. Add maps here, or drop them in.</p>}
          <ul className="campaign-images__list">
            {images.map((image) => (
              <li key={image.id} className="campaign-images__item">
                <button type="button" className="campaign-images__thumb" aria-label={`Open ${image.name}`} onClick={() => setViewing(image)}>
                  <img src={campaignImageUrl(image)} alt="" loading="lazy" />
                </button>
                {renamingId === image.id ? (
                  <input
                    autoFocus
                    className="campaign-images__rename"
                    aria-label="Picture name"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => submitRename(image)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitRename(image);
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    className="campaign-images__name"
                    // The thumbnail opens the picture. The name doesn't: a
                    // click that opened it would cover the name before the
                    // second click of a double-click could land.
                    title="Double-click to rename"
                    onDoubleClick={() => {
                      setDraft(image.name);
                      setRenamingId(image.id);
                    }}
                  >
                    {image.name}
                  </button>
                )}
                <button type="button" className="campaign-images__remove" aria-label={`Remove ${image.name}`} onClick={() => remove(image)}>
                  &times;
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="campaign-images__add" onClick={add}>
            + Add Images
          </button>
        </div>
      )}

      {viewing && (
        <div className="campaign-images__viewer" role="dialog" aria-label={viewing.name} onClick={() => setViewing(null)}>
          <img src={campaignImageUrl(viewing)} alt={viewing.name} />
          <span className="campaign-images__viewer-name">{viewing.name}</span>
          <button type="button" className="campaign-images__viewer-close" aria-label="Close">
            &times;
          </button>
        </div>
      )}
    </div>
  );
}

import type { MusicRegion, MusicTrack } from '../../api/music';
import './RegionDefaults.css';

interface RegionDefaultsProps {
  region: MusicRegion;
  candidates: MusicTrack[];
  inheritLabel: string;
  onSetDefault: (trackId: string) => void;
}

// The default-track picker for the selected region: the song a Session
// starts on when it picks this region. The rest of the folder follows it.
export default function RegionDefaults({ region, candidates, inheritLabel, onSetDefault }: RegionDefaultsProps) {
  return (
    <div className="region-defaults">
      <label>
        Default track
        <select aria-label="Default track" value={region.defaultTrackId ?? ''} onChange={(e) => onSetDefault(e.target.value)}>
          <option value="">{inheritLabel}</option>
          {candidates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

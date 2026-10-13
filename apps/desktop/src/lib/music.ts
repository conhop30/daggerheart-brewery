import { EVERYWHERE_REGION_ID, type MusicRegion, type MusicTrack } from '../api/music';

/**
 * The track that should loop for a Session: the chosen region's own default
 * if it has one, else the Everywhere region's, else nothing. There's no
 * mode/combat axis here any more — a GM switches regions by hand whenever
 * they want different music playing.
 */
export function resolveDefaultTrack(
  regionId: string | null,
  regions: MusicRegion[],
  tracks: MusicTrack[]
): MusicTrack | null {
  const pick = (region: MusicRegion | undefined) =>
    region?.defaultTrackId ? (tracks.find((t) => t.id === region.defaultTrackId) ?? null) : null;
  const chosen = regionId ? regions.find((r) => r.id === regionId) : undefined;
  const everywhere = regions.find((r) => r.id === EVERYWHERE_REGION_ID);
  return pick(chosen) ?? pick(everywhere);
}

/** Tracks a region may pick its defaults from: Everywhere can use any, a user region only its own. */
export function defaultCandidates(region: MusicRegion, tracks: MusicTrack[]): MusicTrack[] {
  return region.isDefault ? tracks : tracks.filter((t) => t.regionId === region.id);
}

/**
 * What a Session plays through for a region: that region's own folder of
 * tracks, starting on its default track if it has one. A region with nothing
 * in it plays Everywhere's instead, so picking an empty region isn't silence.
 */
export function resolvePlaylist(regionId: string | null, regions: MusicRegion[], tracks: MusicTrack[]): MusicTrack[] {
  const listFor = (region: MusicRegion | undefined): MusicTrack[] => {
    if (!region) return [];
    const own = tracks.filter((t) => t.regionId === region.id);
    // Everywhere's default may be a track filed under another region.
    const first = region.defaultTrackId ? tracks.find((t) => t.id === region.defaultTrackId) : undefined;
    return first ? [first, ...own.filter((t) => t.id !== first.id)] : own;
  };
  const chosen = listFor(regionId ? regions.find((r) => r.id === regionId) : undefined);
  return chosen.length > 0 ? chosen : listFor(regions.find((r) => r.id === EVERYWHERE_REGION_ID));
}

/** Past this many seconds into a song, the back button restarts it; before, it goes to the previous song. */
export const RESTART_AFTER_SECONDS = 5;

/** What the back button does, `elapsed` seconds into track `index` of `length`. */
export function backtrackTarget(elapsed: number, index: number, length: number): 'restart' | number {
  if (elapsed > RESTART_AFTER_SECONDS || length <= 1) return 'restart';
  return (index - 1 + length) % length;
}

/** Seconds as m:ss, for the play bar. */
export function formatTime(seconds: number): string {
  const whole = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

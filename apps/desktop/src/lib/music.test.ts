import { describe, expect, it } from 'vitest';
import { backtrackTarget, defaultCandidates, formatTime, resolveDefaultTrack, resolvePlaylist } from './music';
import type { MusicRegion, MusicTrack } from '../api/music';

const track = (id: string, regionId = 'everywhere'): MusicTrack => ({
  id,
  name: id,
  regionId,
  fileName: `${id}.mp3`,
  sizeBytes: 1,
  volume: 1,
});
const region = (over: Partial<MusicRegion> & { id: string }): MusicRegion => ({
  name: over.id,
  isDefault: false,
  campaignId: null,
  defaultTrackId: null,
  ...over,
});

const everywhere = region({ id: 'everywhere', isDefault: true, defaultTrackId: 'calm' });
const coast = region({ id: 'coast', defaultTrackId: 'surf' });
const tracks = [track('calm'), track('surf', 'coast')];
const regions = [everywhere, coast];

describe('resolveDefaultTrack', () => {
  it("uses the region's own default when it has one", () => {
    expect(resolveDefaultTrack('coast', regions, tracks)?.id).toBe('surf');
  });

  it('falls back to Everywhere when the region has no default set', () => {
    const empty = region({ id: 'empty' });
    expect(resolveDefaultTrack('empty', [everywhere, empty], tracks)?.id).toBe('calm');
  });

  it('uses Everywhere when the session has no region', () => {
    expect(resolveDefaultTrack(null, regions, tracks)?.id).toBe('calm');
  });

  it('returns null when nothing is set anywhere, or the track no longer exists', () => {
    expect(resolveDefaultTrack(null, [region({ id: 'everywhere', isDefault: true })], tracks)).toBeNull();
    expect(resolveDefaultTrack('coast', regions, [])).toBeNull();
  });
});

describe('defaultCandidates', () => {
  it('lets Everywhere pick any track but a user region only its own', () => {
    expect(defaultCandidates(everywhere, tracks)).toHaveLength(2);
    expect(defaultCandidates(coast, tracks).map((t) => t.id)).toEqual(['surf']);
  });
});

describe('resolvePlaylist', () => {
  const marsh = region({ id: 'marsh' });
  const empty = region({ id: 'empty' });
  const all = [track('calm'), track('drums'), track('surf', 'coast'), track('reeds', 'marsh'), track('frogs', 'marsh')];
  const everyRegion = [everywhere, coast, marsh, empty];

  it("plays a region's own folder even when it has no default track", () => {
    expect(resolvePlaylist('marsh', everyRegion, all).map((t) => t.id)).toEqual(['reeds', 'frogs']);
  });

  it('starts on the default track, then the rest of the folder', () => {
    const marshFrogsFirst = region({ id: 'marsh', defaultTrackId: 'frogs' });
    expect(resolvePlaylist('marsh', [everywhere, marshFrogsFirst], all).map((t) => t.id)).toEqual(['frogs', 'reeds']);
  });

  it("falls back to Everywhere's folder for an empty region, or none", () => {
    expect(resolvePlaylist('empty', everyRegion, all).map((t) => t.id)).toEqual(['calm', 'drums']);
    expect(resolvePlaylist(null, everyRegion, all).map((t) => t.id)).toEqual(['calm', 'drums']);
    expect(resolvePlaylist('gone', everyRegion, all).map((t) => t.id)).toEqual(['calm', 'drums']);
  });

  it('is empty when there is no music at all', () => {
    expect(resolvePlaylist('coast', [everywhere, coast], [])).toEqual([]);
  });
});

describe('backtrackTarget', () => {
  it('restarts a song that is more than five seconds in', () => {
    expect(backtrackTarget(5.1, 1, 3)).toBe('restart');
    expect(backtrackTarget(90, 0, 3)).toBe('restart');
  });

  it('goes to the previous song before that, round to the last from the first', () => {
    expect(backtrackTarget(5, 2, 3)).toBe(1);
    expect(backtrackTarget(0, 0, 3)).toBe(2);
  });

  it('can only restart when there is one song', () => {
    expect(backtrackTarget(1, 0, 1)).toBe('restart');
  });
});

describe('formatTime', () => {
  it('writes seconds as m:ss', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(65.9)).toBe('1:05');
    expect(formatTime(600)).toBe('10:00');
    expect(formatTime(NaN)).toBe('0:00');
  });
});

import { useMusicContext, useMusicProgress } from '../../context/MusicContext';
import { formatTime } from '../../lib/music';
import './MusicTransport.css';

// Back / play / skip, and the play bar under them: how far into the song
// playback is, out of how long, on a slider that can be clicked or dragged
// to move within it. Reads everything from MusicContext, so it can sit
// anywhere under the provider.
export default function MusicTransport() {
  const { track, playlist, playing, toggle, next, previous } = useMusicContext();
  const { position, duration, seek } = useMusicProgress();
  const many = playlist.length > 1;

  return (
    <div className="music-transport">
      <div className="music-transport__buttons">
        <button
          type="button"
          className="music-transport__skip"
          onClick={previous}
          disabled={!track}
          aria-label="Previous track"
          title={many ? 'Restart this song, or go to the one before if it has only just started' : 'Restart this song'}
        >
          ⏮
        </button>
        <button
          type="button"
          className="session-music-panel__play"
          onClick={toggle}
          disabled={!track}
          aria-label={playing ? 'Pause music' : 'Play music'}
        >
          {playing ? '❚❚ Pause' : '▶ Play'}
        </button>
        <button
          type="button"
          className="music-transport__skip"
          onClick={next}
          disabled={!track || !many}
          aria-label="Next track"
          title="Next song"
        >
          ⏭
        </button>
      </div>
      <div className="music-transport__bar">
        <span className="music-transport__time" data-testid="music-elapsed">
          {formatTime(position)}
        </span>
        <input
          type="range"
          className="music-transport__seek"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(position, duration || 0)}
          disabled={!track || !duration}
          aria-label="Song position"
          aria-valuetext={`${formatTime(position)} of ${formatTime(duration)}`}
          onChange={(e) => seek(Number(e.target.value))}
        />
        <span className="music-transport__time" data-testid="music-duration">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}

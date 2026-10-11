import { createRoot } from 'react-dom/client';
import { apiClient } from '../api/client';
import type { CampaignFrame } from '../api/campaignFrames';
import BrewPages from '../components/BrewPages';
import '../styles/brew/brew-print.css';

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Resolves once every picture in the pages has loaded or given up, so none is missing from the PDF. */
async function picturesSettled(container: HTMLElement) {
  const root = container.querySelector('.brew-pages')?.shadowRoot;
  const images = Array.from(root?.querySelectorAll('img') ?? []);
  const each = images.map((img) =>
    img.complete
      ? Promise.resolve()
      : new Promise<void>((resolve) => {
          img.loading = 'eager';
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', () => resolve(), { once: true });
        })
  );
  await Promise.race([Promise.all(each), wait(8000)]);
}

// Saves an Advanced-format frame as a letter-size PDF. Electron prints what
// the window is showing, so for a moment the window shows nothing but the
// frame's pages at full size (brew-print.css hides the rest), and is put
// back whatever happens.
export async function exportFramePdf(frame: CampaignFrame): Promise<{ canceled: boolean; filePath?: string }> {
  const container = document.createElement('div');
  container.id = 'brew-print';
  document.body.append(container);
  document.documentElement.classList.add('brew-printing');
  const root = createRoot(container);
  try {
    root.render(
      <BrewPages
        markdown={frame.markdown}
        styleCss={frame.styleCss}
        frameName={frame.name}
        coverImage={frame.coverImage}
        print
      />
    );
    await nextFrame();
    await nextFrame();
    await document.fonts.ready;
    await picturesSettled(container);
    // Mask and background images have no load event to wait on.
    await wait(400);
    return await apiClient.exportFramePdf(frame.name);
  } finally {
    root.unmount();
    container.remove();
    document.documentElement.classList.remove('brew-printing');
  }
}

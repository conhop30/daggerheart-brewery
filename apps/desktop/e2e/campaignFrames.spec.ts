import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test.describe('Campaign Frames', () => {
  let tempDir: string;
  let app: ElectronApplication;
  let win: Page;

  test.beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daggerheart-e2e-frames-'));
    const env: Record<string, string> = Object.fromEntries(
      Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)
    );
    env.DAGGERHEART_STORE_DIR = tempDir;
    // Stands in for Export PDF's Save dialog.
    env.DAGGERHEART_PDF_PATH = path.join(tempDir, 'frame.pdf');
    delete env.ELECTRON_RUN_AS_NODE;
    app = await electron.launch({ args: [path.resolve('.')], env });
    win = await app.firstWindow();
    // The app's own "are you sure?" (ConfirmHost) is agreed to wherever it appears.
    await win.addLocatorHandler(win.locator('.confirm-dialog'), async () => {
      await win.locator('.confirm-dialog__confirm').click();
    });
    await win.waitForSelector('text=Daggerheart Brewery', { timeout: 15000 });
    await win.click('.app-shell__nav-link:has-text("Campaign Frames")');
  });

  test.afterEach(async () => {
    await app.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const form = () => win.locator('.frame-form:visible');
  const section = (key: string) => win.locator(`.frame-section[data-section="${key}"]:visible`);
  const openFormSection = (title: string) => form().locator('.collapsible-section__toggle', { hasText: title }).click();

  /** Creates a frame with only its basics filled in, and leaves it open. */
  async function createFrame(name: string, concept = '') {
    await win.getByRole('button', { name: '+ New Campaign Frame' }).click();
    await form().getByLabel('Name').fill(name);
    if (concept) await form().getByLabel('Concept').fill(concept);
    await form().getByRole('button', { name: 'Create Campaign Frame' }).click();
    await expect(win.locator('.frame-view__title:visible')).toHaveText(name);
  }

  test('an empty gallery says how to start, and a new frame opens straight into its page', async () => {
    await expect(win.locator('.frames-page:visible')).toContainText('No Campaign Frames yet');
    await createFrame('Bare Frame');
    await expect(win.locator('.frame-view__empty:visible')).toContainText('nothing written in it yet');
  });

  test('a frame is written section by section and reads back like the book', async () => {
    await win.getByRole('button', { name: '+ New Campaign Frame' }).click();
    await form().getByLabel('Name').fill('Lost Legend of Hope');
    await form().getByLabel('Concept').fill('Empathy must bring back a world only found in legend.');
    await form().getByLabel('Designed by').fill('Connor Hopkins');
    await form().getByLabel('Complexity Rating').selectOption('2');

    // The Pitch is open on a new frame.
    await form().getByLabel('The pitch, as you would read it to your players').fill('"Hope" was a **literal** force.\nYou play *unlikely* heroes.');
    await form().getByLabel('Tone & Feel').fill('Loss, Tragedy ,Healing');
    await form().getByLabel('Touchstones').fill('Arcane, The Odyssey');

    await openFormSection('Communities');
    await form().getByRole('button', { name: '+ Add community note' }).click();
    await form().getByLabel('community note heading').fill('Loreborne');
    await form().getByLabel('community note text').fill('The Kollect preserve knowledge.');
    await form().getByRole('button', { name: '+ Add question' }).click();
    await form().getByPlaceholder('A question to ask the players').fill('Are you part of the **Kollect**?');

    await openFormSection('Distinctions');
    await form().getByRole('button', { name: '+ Add distinction' }).click();
    await form().getByLabel('distinction heading').fill('Aterra');
    await form()
      .getByLabel('distinction text')
      .fill('Aterra hosted fear.\n### Before the age of Cresting\nIt took the opposite shape.\n- A desert\n- A swamp');

    await openFormSection('Campaign Mechanics');
    await form().getByRole('button', { name: '+ Add mechanic' }).click();
    await form().getByLabel('mechanic heading').fill('Pivoting Fate Countdown');
    await form().getByLabel('mechanic text').fill('Count up or down.');
    await form().getByRole('button', { name: '+ Add table' }).last().click(); // Distinctions offers one too
    await form().getByLabel('Table title').fill('Redeemed Action');
    await form().getByLabel('Table caption').fill('Roll a number of d6s equal to the tier.');
    await form().getByLabel('Row 1, Value').fill('1');
    await form().getByLabel('Row 1, Effect').fill('The GM gains a **Fear**.');
    await form().getByRole('button', { name: '+ Add row' }).click();
    await form().getByLabel('Row 2, Value').fill('2');
    await form().getByLabel('Row 2, Effect').fill('A PC gains a Hope.');

    await openFormSection('Session Zero Questions');
    await form().getByRole('button', { name: '+ Add question' }).last().click();
    await form().getByPlaceholder('A question to ask during session zero').fill('How do you perceive karma?');

    await form().getByRole('button', { name: 'Create Campaign Frame' }).click();

    // The hero.
    await expect(win.locator('.frame-view__title:visible')).toHaveText('Lost Legend of Hope');
    await expect(win.locator('.frame-view__concept:visible')).toHaveText('Empathy must bring back a world only found in legend.');
    await expect(win.locator('.frame-view__meta:visible')).toContainText('Designed by Connor Hopkins');
    await expect(win.locator('.frame-view__meta:visible .frame-pips__pip')).toHaveCount(2);

    // Only the sections that were written appear, in the book's order.
    await expect(win.locator('.frame-view__jump-link:visible')).toHaveText([
      'The Pitch',
      'Communities',
      'Distinctions',
      'Campaign Mechanics',
      'Session Zero Questions',
    ]);

    // Markup is drawn, not shown.
    const pitch = section('pitch');
    await expect(pitch.locator('.frame-text p')).toHaveCount(2);
    await expect(pitch.locator('strong')).toHaveText('literal');
    await expect(pitch.locator('em')).toHaveText('unlikely');
    await expect(pitch).not.toContainText('**');
    await expect(pitch.locator('.frame-view__lists')).toContainText('Loss, Tragedy, Healing');
    await expect(pitch.locator('.frame-view__lists')).toContainText('Arcane, The Odyssey');
    await expect(pitch.locator('.frame-view__lists')).not.toContainText('Themes');

    await expect(section('communities').locator('.frame-entry__heading')).toHaveText('Loreborne');
    await expect(section('communities').locator('.frame-entry__questions li')).toHaveText('Are you part of the Kollect?');
    await expect(section('communities').locator('.frame-entry__questions strong')).toHaveText('Kollect');

    const distinctions = section('distinctions');
    await expect(distinctions.locator('.frame-text__heading')).toHaveText('Before the age of Cresting');
    await expect(distinctions.locator('.frame-text__list li')).toHaveText(['A desert', 'A swamp']);

    const table = section('mechanics').locator('.frame-table');
    await expect(table.locator('.frame-table__caption')).toHaveText('Roll a number of d6s equal to the tier.');
    await expect(table.locator('.frame-table__title')).toHaveText('Redeemed Action');
    await expect(table.locator('thead tr').nth(1).locator('th')).toHaveText(['Value', 'Effect']);
    await expect(table.locator('tbody tr')).toHaveCount(2);
    await expect(table.locator('tbody tr').first().locator('td')).toHaveText(['1', 'The GM gains a Fear.']);
    await expect(table.locator('tbody strong')).toHaveText('Fear');

    await expect(section('sessionZero').locator('li')).toHaveText('How do you perceive karma?');

    // And it is still all there after a restart of the page.
    await win.reload();
    await win.click('.app-shell__nav-link:has-text("Campaign Frames")');
    const card = win.locator('.frame-card:visible', { hasText: 'Lost Legend of Hope' });
    await expect(card).toContainText('Empathy must bring back a world only found in legend.');
    await expect(card).toContainText('Loss · Tragedy · Healing');
    await card.click();
    await expect(section('mechanics').locator('.frame-table tbody tr')).toHaveCount(2);
  });

  test('a frame can be edited and deleted from its own page', async () => {
    await createFrame('Witherwild', 'A virulent overgrowth spreads.');

    await win.getByRole('button', { name: 'Edit Frame' }).click();
    await form().getByLabel('Name').fill('The Witherwild');
    await openFormSection('GM Principles');
    await form().getByRole('button', { name: '+ Add GM principle' }).click();
    await form().getByLabel('GM principle heading').fill('Paint the World in Contrast');
    await form().getByRole('button', { name: 'Save Changes' }).click();

    await expect(win.locator('.frame-view__title:visible')).toHaveText('The Witherwild');
    await expect(section('gmPrinciples').locator('.frame-entry__heading')).toHaveText('Paint the World in Contrast');
    await expect(section('gmPrinciples').locator('.frame-section__intro')).toContainText('Keep the following guidance in mind');

    // A first entry with no heading speaks for the section in place of that stock line.
    await win.getByRole('button', { name: 'Edit Frame' }).click();
    await openFormSection('Ancestries');
    await form().getByRole('button', { name: '+ Add ancestry note' }).click();
    await form().getByLabel('ancestry note text').fill('Only *clanks* are available.');
    await form().getByRole('button', { name: '+ Add ancestry note' }).click();
    await form().getByLabel('ancestry note heading').last().fill('Clanks');
    await form().getByRole('button', { name: 'Save Changes' }).click();
    await expect(section('ancestries').locator('.frame-section__intro')).toHaveText('Only clanks are available.');
    await expect(section('ancestries').locator('.frame-entry')).toHaveCount(1);
    await expect(section('ancestries').locator('.frame-entry__heading')).toHaveText('Clanks');

    // Cancelling an edit changes nothing.
    await win.getByRole('button', { name: 'Edit Frame' }).click();
    await form().getByLabel('Name').fill('Scrapped');
    await form().getByRole('button', { name: 'Cancel' }).click();
    await expect(win.locator('.frame-view__title:visible')).toHaveText('The Witherwild');

    await win.getByRole('button', { name: 'Delete Frame' }).click();
    await expect(win.locator('.frames-page:visible')).toContainText('No Campaign Frames yet');
  });

  test('the gallery lists frames by name and filters by Set', async () => {
    await createFrame('Motherboard');
    await win.locator('.frame-view__back:visible').click();

    // A second frame, in a Set made on the spot.
    await win.getByRole('button', { name: '+ New Campaign Frame' }).click();
    await form().getByLabel('Name').fill('Castle High');
    await form().getByLabel('Game Set').selectOption({ label: '+ New Set…' });
    await form().getByPlaceholder('e.g. Hope and Fear').fill('Hope & Fear');
    await form().getByRole('button', { name: 'Add', exact: true }).click();
    await form().getByRole('button', { name: 'Create Campaign Frame' }).click();
    await win.locator('.frame-view__back:visible').click();

    const titles = win.locator('.frame-card:visible .frame-card__title');
    await expect(titles).toHaveText(['Castle High', 'Motherboard']);

    const filter = win.locator('.frames-page:visible .set-filter');
    await filter.selectOption({ label: 'Hope & Fear' });
    await expect(titles).toHaveText(['Castle High']);
    await filter.selectOption({ label: 'Core' });
    await expect(titles).toHaveText(['Motherboard']);
    await filter.selectOption({ label: 'All Sets' });
    await expect(titles).toHaveCount(2);
  });

  test('a Campaign can name its frame, open it, and loses the link when the frame is deleted', async () => {
    await createFrame('Lost Legend of Hope', 'Bring back a world only found in legend.');
    await expect(win.locator('.tile:has-text("Campaign Frames")')).toHaveCount(1); // the Home tile exists, hidden

    await win.click('.app-shell__nav-link:has-text("Campaigns")');
    await win.click('.campaign-row--hollow');
    const campaignForm = win.locator('.campaigns-page:visible .create-form');
    await campaignForm.getByLabel('Name').fill('Eldrefell');
    await campaignForm.getByLabel('Campaign Frame').selectOption({ label: 'Lost Legend of Hope' });
    await campaignForm.getByRole('button', { name: 'Create Campaign' }).click();

    await win.locator('.campaign-row:not(.campaign-row--hollow)', { hasText: 'Eldrefell' }).click();
    const link = win.locator('.campaign-detail__frame');
    await expect(link).toContainText('Lost Legend of Hope');
    await expect(link).toContainText('Bring back a world only found in legend.');

    await link.getByRole('button', { name: 'Open frame' }).click();
    await expect(win.locator('.app-shell__nav-link.active')).toHaveText('Campaign Frames');
    await expect(win.locator('.frame-view__title:visible')).toHaveText('Lost Legend of Hope');

    // Deleting the frame leaves the Campaign, which simply stops naming it.
    await win.getByRole('button', { name: 'Delete Frame' }).click();
    await win.click('.app-shell__nav-link:has-text("Campaigns")');
    await expect(win.locator('.campaign-detail__title')).toHaveText('Eldrefell');
    await expect(win.locator('.campaign-detail__frame')).toHaveCount(0);
    await win.getByRole('button', { name: 'Edit Campaign' }).click();
    await expect(win.locator('.campaigns-page:visible .create-form').getByLabel('Campaign Frame')).toHaveValue('');
  });

  // ---- The Advanced format: the frame as Markdown, drawn as letter-size two-column pages ----

  const pages = () => win.locator('.frame-view__pages .page');
  const markdownBox = () => form().getByLabel('Frame Markdown');

  /** A new frame switched to Advanced, with the given Markdown typed in, saved and open. */
  async function createAdvancedFrame(name: string, markdown: string) {
    await win.getByRole('button', { name: '+ New Campaign Frame' }).click();
    await form().getByLabel('Name').fill(name);
    await form().getByRole('button', { name: 'Advanced' }).click();
    await markdownBox().fill(markdown);
    await form().getByRole('button', { name: 'Create Campaign Frame' }).click();
    await expect(win.locator('.frame-view__bar-title h1')).toHaveText(name);
  }

  test('an Advanced frame is Markdown drawn as two-column pages, with stains, in its own styles', async () => {
    await createAdvancedFrame(
      'Stains',
      [
        '# Overview',
        '',
        'Before **the age** of Cresting.',
        '',
        '{{watercolor3,top:20px,left:30px,width:300px,background-color:#BBAD82,opacity:80%}}',
        '',
        '\\column',
        '',
        '## Aterra',
        '',
        'The right-hand column.',
        '',
        '\\page',
        '',
        '# Campaign Mechanics',
        '',
        '<script>window.pwned = true</script>',
        '',
        '| Tier | Start |',
        '|:--|:--|',
        '| I | 3 |',
      ].join('\n')
    );

    await expect(pages()).toHaveCount(2);
    const first = pages().first();
    await expect(first.locator('h1')).toHaveText('Overview');
    await expect(first.locator('strong')).toHaveText('the age');
    await expect(pages().nth(1).locator('td')).toHaveText(['I', '3']);
    expect(await win.evaluate(() => (window as unknown as { pwned?: boolean }).pwned)).toBeUndefined();

    // Two real columns: what follows \column starts level with the top, to the right.
    const left = await first.locator('h1').boundingBox();
    const right = await first.locator('h2').boundingBox();
    expect(right!.x).toBeGreaterThan(left!.x + 100);
    expect(Math.abs(right!.y - left!.y)).toBeLessThan(20);

    // The stain is a coloured box shown through one of the watercolor shapes.
    const stain = first.locator('.watercolor3');
    const stainStyle = await stain.evaluate((el) => {
      const s = getComputedStyle(el);
      return { mask: s.maskImage || s.webkitMaskImage, color: s.backgroundColor, position: s.position };
    });
    expect(stainStyle.mask).toMatch(/^url\(.*watercolor3.*\.png/);
    expect(stainStyle.color).toBe('rgb(187, 173, 130)');
    expect(stainStyle.position).toBe('absolute');

    // The page look is the frames' in the books (teal headings), not the app's.
    expect(await first.locator('h1').evaluate((el) => getComputedStyle(el).color)).toBe('rgb(51, 112, 128)');
    await expect(win.locator('.frame-view__jump-link:visible')).toHaveText(['Overview', 'Campaign Mechanics']);

    // The frame's own CSS reaches its pages and nothing outside them.
    await win.getByRole('button', { name: 'Edit Frame' }).click();
    await form().getByRole('tab', { name: 'Style' }).click();
    await form().getByLabel('Frame CSS').fill('@import url("https://example.com/x.css"); h1 { color: rgb(200, 0, 0); }');
    await form().getByRole('button', { name: 'Save Changes' }).click();
    await expect(pages()).toHaveCount(2);
    expect(await pages().first().locator('h1').evaluate((el) => getComputedStyle(el).color)).toBe('rgb(200, 0, 0)');
    expect(await win.locator('.frame-view__bar-title h1').evaluate((el) => getComputedStyle(el).color)).not.toBe('rgb(200, 0, 0)');
  });

  test('the snippet bar writes page breaks, columns and stains, and warns when a page is too full', async () => {
    await win.getByRole('button', { name: '+ New Campaign Frame' }).click();
    await form().getByLabel('Name').fill('Snippets');
    await form().getByRole('button', { name: 'Advanced' }).click();

    await form().getByRole('button', { name: 'Title page' }).click();
    await form().getByRole('button', { name: 'Page break' }).click();
    await form().getByRole('button', { name: 'Stain' }).click();
    await form().getByRole('button', { name: 'Column break' }).click();
    await form().getByRole('button', { name: 'Table', exact: true }).click();
    const text = await markdownBox().inputValue();
    expect(text).toContain('{{titlePage}}');
    expect(text).toContain('# Snippets');
    expect(text).toMatch(/\n\\page\n\n\{\{watercolor\d+,top:20px/);
    expect(text).toContain('\n\\column\n\n##### Table Title');

    // The pages beside the text keep up with it.
    const preview = win.locator('.brew-editor__preview .page');
    await expect(preview).toHaveCount(2);
    await expect(preview.first().locator('.titlePage')).toHaveCount(1);
    await expect(win.locator('.brew-editor__overflow')).toHaveCount(0);

    // Far more than a page holds: said so, and Fit to pages breaks it up.
    const paragraph = 'Hope was a literal concentration of organic force in the world of Eldrefell. '.repeat(6);
    await markdownBox().fill(Array.from({ length: 40 }, (_, i) => `## Entry ${i + 1}\n\n${paragraph}`).join('\n\n'));
    await expect(win.locator('.brew-editor__overflow')).toContainText('Page 1 has more than fits');
    await form().getByRole('button', { name: 'Fit to pages' }).click();
    await expect(win.locator('.brew-editor__overflow')).toHaveCount(0);
    expect(await preview.count()).toBeGreaterThan(1);
    expect(await markdownBox().inputValue()).toContain('\n\\page\n');
  });

  test('the Guide shows an example frame without touching the one being written', async () => {
    await win.getByRole('button', { name: '+ New Campaign Frame' }).click();
    await form().getByLabel('Name').fill('Mine');
    await form().getByRole('button', { name: 'Advanced' }).click();
    await markdownBox().fill('# My Own Words\n\nNot to be replaced.');
    const preview = win.locator('.brew-editor__preview .page');
    await expect(preview.first().locator('h1')).toHaveText('My Own Words');

    await form().getByRole('tab', { name: 'Guide' }).click();
    const guide = form().getByLabel('Guide Markdown');
    await expect(guide).toHaveAttribute('readonly', '');
    await expect(guide).toHaveValue(/\{\{titlePage\}\}[\s\S]*# Headings[\s\S]*# Tables[\s\S]*# Stains[\s\S]*# Watercolor Edges/);

    // The pages beside it are the guide's: four of them, none over-full,
    // with a real stain, table, masked picture and title page among them.
    await expect(preview).toHaveCount(4);
    await expect(preview.first().locator('.titlePage')).toHaveCount(1);
    await expect(preview.first().locator('h1')).toHaveText('Writing a Frame');
    await expect(preview.nth(2).locator('.wide table')).toHaveCount(1);
    await expect(preview.nth(2).locator('[class*="watercolor"]')).toHaveCount(1);
    await expect(preview.nth(3).locator('.imageMaskEdge3 img')).toHaveCount(1);
    await expect.poll(() => preview.nth(3).locator('.imageMaskEdge3 img').evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(640);
    await expect(win.locator('.brew-editor__overflow')).toHaveCount(0);
    // \page and \column are shown in the guide as text, not obeyed where they are being described.
    await expect(preview.nth(1)).toContainText('to start a new page');

    // Back on Text, the frame is exactly as it was, and that is what gets saved.
    await form().getByRole('tab', { name: 'Text' }).click();
    await expect(markdownBox()).toHaveValue('# My Own Words\n\nNot to be replaced.');
    await expect(preview).toHaveCount(1);
    await form().getByRole('tab', { name: 'Guide' }).click();
    await form().getByRole('button', { name: 'Create Campaign Frame' }).click();
    await expect(pages()).toHaveCount(1);
    await expect(pages().first().locator('h1')).toHaveText('My Own Words');
  });

  test('a picture added to the app is shown inside a watercolor edge', async () => {
    // A real 2x2 PNG, brought in the way a dropped file is.
    const source = path.join(tempDir, 'swamp.png');
    fs.writeFileSync(
      source,
      Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFElEQVR4nGNkYPjPwMDAxAAGDAwMAA0OAQMfOdP3AAAAAElFTkSuQmCC', 'base64')
    );
    const url = await win.evaluate(async (file) => {
      const bridge = (window as unknown as { daggerheart: { importFrameImagePaths: (p: string[]) => Promise<{ images: { url: string }[] }> } })
        .daggerheart;
      const { images } = await bridge.importFrameImagePaths([file, 'C:/not-a-picture.txt']);
      return images.map((image) => image.url);
    }, source);
    expect(url).toHaveLength(1);
    expect(url[0]).toMatch(/^dhmedia:\/\/frame-image\/[0-9a-f-]+\.png$/);
    expect(fs.readdirSync(path.join(tempDir, 'frame-images'))).toHaveLength(1);

    await createAdvancedFrame(
      'Edges',
      `# Overview\n\nText over a picture.\n\n{{imageMaskEdge2,--offset:10%,--rotation:0\n  ![swamp](${url[0]}) {width:100%,bottom:0%}\n}}\n`
    );
    const mask = pages().first().locator('.imageMaskEdge2');
    const img = mask.locator('img');
    await expect(img).toHaveAttribute('alt', 'swamp');
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(2);
    const maskImage = await mask.evaluate((el) => getComputedStyle(el).maskImage || getComputedStyle(el).webkitMaskImage);
    expect(maskImage).toMatch(/^url\(.*\.webp/);
  });

  test("picking a Watercolor picture doesn't yank the editor's scroll position", async () => {
    const source = path.join(tempDir, 'swamp.png');
    fs.writeFileSync(
      source,
      Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFElEQVR4nGNkYPjPwMDAxAAGDAwMAA0OAQMfOdP3AAAAAElFTkSuQmCC', 'base64')
    );
    // Stands in for the native Open dialog the toolbar's "Watercolor picture" menu triggers.
    await app.evaluate(
      ({ dialog }, filePath) => {
        dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [filePath] });
      },
      source
    );

    await win.getByRole('button', { name: '+ New Campaign Frame' }).click();
    await form().getByLabel('Name').fill('Scroll Check');
    await form().getByRole('button', { name: 'Advanced' }).click();

    const box = markdownBox();
    const longDoc = Array.from({ length: 80 }, (_, i) => `Paragraph ${i + 1}.`).join('\n\n');
    await box.fill(longDoc);
    // A real user editing somewhere other than the very end: click near the
    // top, then scroll the box back up (fill() leaves it scrolled to the
    // bottom, same as a real person who'd just finished typing all of it).
    await box.click({ position: { x: 10, y: 5 } });
    await box.evaluate((el: HTMLTextAreaElement) => {
      el.setSelectionRange(0, 0);
      el.scrollTop = 0;
    });

    await win.locator('select[aria-label="Watercolor picture"]').selectOption('edge-bottom');
    await expect(box).toContainText('imageMaskEdge', { timeout: 10000 });

    // The picture landed at the cursor, and the view never jumped to show it.
    expect(await box.evaluate((el: HTMLTextAreaElement) => el.scrollTop)).toBe(0);
    expect(await box.evaluate((el: HTMLTextAreaElement) => el.value.startsWith('{{imageMaskEdge'))).toBe(true);
  });

  test('a structured frame converts to Advanced pages and can go back', async () => {
    await win.getByRole('button', { name: '+ New Campaign Frame' }).click();
    await form().getByLabel('Name').fill('Witherwild');
    await form().getByLabel('Concept').fill('A virulent overgrowth spreads.');
    await form().getByLabel('The pitch, as you would read it to your players').fill('Fanewick was once a place of peace.');
    await openFormSection('Overview');
    await form().getByLabel('Overview').fill('Fanewick is a **wild** land.');
    await openFormSection('GM Principles');
    await form().getByRole('button', { name: '+ Add GM principle' }).click();
    await form().getByLabel('GM principle heading').fill('Paint the World in Contrast');
    await form().getByLabel('GM principle text').fill('Subvert expectations.');
    await form().getByRole('button', { name: 'Create Campaign Frame' }).click();
    await expect(section('gmPrinciples').locator('.frame-entry__heading')).toHaveText('Paint the World in Contrast');

    await win.getByRole('button', { name: 'Edit Frame' }).click();
    await form().getByRole('button', { name: 'Advanced' }).click();
    await form().getByRole('button', { name: 'Start from this frame’s sections' }).click();
    await expect(markdownBox()).toHaveValue(/\{\{titlePage\}\}[\s\S]*# Witherwild[\s\S]*\\page[\s\S]*# Overview[\s\S]*# GM Principles\n\n\*Keep the following[\s\S]*## Paint the World in Contrast\n\nSubvert expectations\./);
    await form().getByRole('button', { name: 'Save Changes' }).click();

    await expect(pages()).toHaveCount(2);
    await expect(pages().first().locator('h1')).toHaveText('Witherwild');
    await expect(pages().nth(1).locator('h2')).toHaveText('Paint the World in Contrast');
    await expect(pages().nth(1).locator('strong')).toHaveText('wild');

    // Back to Structured: the sections were kept all along, and so is the Markdown.
    await win.getByRole('button', { name: 'Edit Frame' }).click();
    await form().getByRole('button', { name: 'Structured' }).click();
    await form().getByRole('button', { name: 'Save Changes' }).click();
    await expect(section('gmPrinciples').locator('.frame-entry__heading')).toHaveText('Paint the World in Contrast');
    await win.getByRole('button', { name: 'Edit Frame' }).click();
    await form().getByRole('button', { name: 'Advanced' }).click();
    await expect(markdownBox()).toHaveValue(/# GM Principles/);
  });

  test('a structured frame can be read in two columns, and that is remembered', async () => {
    await win.getByRole('button', { name: '+ New Campaign Frame' }).click();
    await form().getByLabel('Name').fill('Columns');
    await openFormSection('Overview');
    await form().getByLabel('Overview').fill(Array.from({ length: 8 }, (_, i) => `Paragraph ${i + 1} of the overview.`).join('\n'));
    await form().getByRole('button', { name: 'Create Campaign Frame' }).click();

    const body = section('overview').locator('.frame-section__body');
    expect(await body.evaluate((el) => getComputedStyle(el).columnCount)).toBe('auto');
    await win.getByRole('button', { name: 'Two columns' }).click();
    expect(await body.evaluate((el) => getComputedStyle(el).columnCount)).toBe('2');
    const first = await body.locator('p').first().boundingBox();
    const last = await body.locator('p').last().boundingBox();
    expect(last!.x).toBeGreaterThan(first!.x + 100);

    await win.reload();
    await win.click('.app-shell__nav-link:has-text("Campaign Frames")');
    await win.locator('.frame-card:visible', { hasText: 'Columns' }).click();
    await expect(win.getByRole('button', { name: 'Two columns' })).toHaveAttribute('aria-pressed', 'true');
    await win.getByRole('button', { name: 'One column' }).click();
    expect(await body.evaluate((el) => getComputedStyle(el).columnCount)).toBe('auto');
  });

  test('Export PDF saves the pages as a letter-size PDF and leaves the app as it was', async () => {
    await createAdvancedFrame('Printed', '# Overview\n\nPage one.\n\n\\page\n\n# Mechanics\n\nPage two.\n\n\\page\n\n# Credit\n\nPage three.');
    const pdfPath = path.join(tempDir, 'frame.pdf');
    await win.getByRole('button', { name: 'Export PDF' }).click();
    await expect.poll(() => fs.existsSync(pdfPath), { timeout: 20000 }).toBe(true);
    await expect(win.getByRole('button', { name: 'Export PDF' })).toBeEnabled();

    const pdf = fs.readFileSync(pdfPath);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    const text = pdf.toString('latin1');
    // Three sheets, each letter-size (612 x 792 points).
    expect((text.match(/\/Type\s*\/Page\b/g) ?? []).length).toBe(3);
    expect(text).toMatch(/\/MediaBox\s*\[\s*0\s+0\s+612\s+792\s*\]/);

    // The window is the app again, not the print layout.
    expect(await win.evaluate(() => document.documentElement.classList.contains('brew-printing'))).toBe(false);
    await expect(win.locator('.app-shell__nav-link.active')).toHaveText('Campaign Frames');
    await expect(pages()).toHaveCount(3);
  });
});

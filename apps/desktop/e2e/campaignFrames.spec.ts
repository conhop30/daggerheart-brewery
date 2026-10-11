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
});

import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';

// A tiny hand-rolled PNG encoder, same technique as the manual verification
// scripts used earlier for this feature — no external fixture files, no
// image-library dependency, just enough bytes to be a real, loadable image
// (uncompressed-filter scanlines through zlib.deflateSync). Flat color is
// fine here (unlike those manual scripts, which needed a checkerboard to
// show blur/feathering in a screenshot) — these tests only check that an
// upload round-trips and that orientation is read correctly, not how it looks.
function writePng(filePath: string, width: number, height: number, [r, g, b]: [number, number, number]) {
  function chunk(type: string, data: Buffer) {
    const typeBuf = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(zlib.crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  const raw = Buffer.alloc((width * 3 + 1) * height);
  let offset = 0;
  for (let y = 0; y < height; y++) {
    raw[offset++] = 0; // filter type: none
    for (let x = 0; x < width; x++) {
      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
    }
  }
  const idat = zlib.deflateSync(raw);
  fs.writeFileSync(
    filePath,
    Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
  );
}

test.describe('Campaigns & Party', () => {
  let tempDir: string;
  let imageDir: string;
  let app: ElectronApplication;
  let win: Page;

  test.beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daggerheart-e2e-campaigns-'));
    imageDir = path.join(tempDir, 'source-images');
    fs.mkdirSync(imageDir);
    writePng(path.join(imageDir, 'square.png'), 40, 40, [138, 103, 214]);
    writePng(path.join(imageDir, 'portrait.png'), 60, 120, [138, 103, 214]);
    writePng(path.join(imageDir, 'landscape.png'), 120, 60, [228, 179, 65]);

    const env: Record<string, string> = Object.fromEntries(
      Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)
    );
    env.DAGGERHEART_STORE_DIR = tempDir;
    delete env.ELECTRON_RUN_AS_NODE;
    app = await electron.launch({ args: [path.resolve('.')], env });
    win = await app.firstWindow();
    win.on('dialog', (dialog) => dialog.accept());
    // The app's own "are you sure?" (ConfirmHost) is agreed to wherever it appears.
    await win.addLocatorHandler(win.locator('.confirm-dialog'), async () => {
      await win.locator('.confirm-dialog__confirm').click();
    });
    await win.waitForSelector('text=Daggerheart Brewery', { timeout: 15000 });
    await win.click('.app-shell__nav-link:has-text("Campaigns")');
  });

  test.afterEach(async () => {
    await app.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('create -> view -> edit -> delete round trip for a Campaign', async () => {
    await win.click('.campaign-row--hollow');
    await win.fill('.create-form input[type="text"]', 'E2E Campaign');
    await win.click('button:has-text("Create Campaign")');

    const banner = win.locator('.campaign-row:not(.campaign-row--hollow)', { hasText: 'E2E Campaign' });
    await expect(banner).toBeVisible();

    // Edit/Delete live on CampaignDetail now, not the gallery row itself —
    // the row's whole job is opening it (see CampaignBanner.tsx).
    await banner.click();
    await win.getByRole('button', { name: 'Edit Campaign' }).click();
    await win.fill('.create-form input[type="text"]', 'E2E Campaign Renamed');
    await win.click('button:has-text("Save Changes")');
    await expect(win.locator('.campaign-detail__title')).toHaveText('E2E Campaign Renamed');

    await win.click('.campaign-detail__back');
    const renamed = win.locator('.campaign-row:not(.campaign-row--hollow)', { hasText: 'E2E Campaign Renamed' });
    await expect(renamed).toBeVisible();

    await renamed.click();
    await win.getByRole('button', { name: 'Delete Campaign' }).click();
    await expect(win.locator('.campaign-row', { hasText: 'E2E Campaign Renamed' })).toHaveCount(0);
  });

  test('open a Campaign, add a multiclassed Party member, then edit and delete the member', async () => {
    await win.click('.campaign-row--hollow');
    await win.fill('.create-form input[type="text"]', 'The Wildwood');
    await win.click('button:has-text("Create Campaign")');
    await win.locator('.campaign-row', { hasText: 'The Wildwood' }).click();
    await expect(win.locator('.campaign-detail__title')).toHaveText('The Wildwood');

    await win.click('.party-roster__add');
    await win.fill('.create-form input[type="text"]', 'Fenn');
    // No HP/Stress trackers on a Party member anymore: who they are, not what they've marked.
    await expect(win.locator('.create-form .trackable-editor')).toHaveCount(0);
    // Every choice is a labelled chip, not a dropdown.
    await expect(win.locator('.create-form select')).toHaveCount(0);
    await expect(win.locator('.chip-select__label')).toHaveText(['Class', 'Subclass', 'Ancestry', 'Community']);
    const classChips = win.getByRole('group', { name: 'Class', exact: true }).locator('.chip-select__chip');
    await expect(win.getByRole('group', { name: 'Subclass', exact: true })).toContainText('Choose a Class first.');
    const className = (await classChips.first().innerText()).trim();
    await classChips.first().click();
    await expect(classChips.first()).toHaveAttribute('aria-pressed', 'true');

    // Multiclassing adds a second Class and Subclass.
    await win.click('.create-form__link:has-text("+ Multiclass")');
    const secondChips = win.getByRole('group', { name: 'Second Class', exact: true }).locator('.chip-select__chip');
    const secondName = (await secondChips.nth(1).innerText()).trim();
    await secondChips.nth(1).click();
    await win.click('button:has-text("Add Party Member")');

    const card = win.locator('.content-card', { hasText: 'Fenn' });
    await expect(card).toBeVisible();
    await expect(card.locator('.party-roster__class')).toHaveText([className, secondName]);
    await expect(card.locator('.stat-stepper')).toHaveCount(0);

    // Reload to confirm it persisted, not just local state.
    await win.reload();
    await win.waitForSelector('text=Daggerheart Brewery', { timeout: 15000 });
    await win.click('.app-shell__nav-link:has-text("Campaigns")');
    await win.locator('.campaign-row', { hasText: 'The Wildwood' }).click();
    await expect(win.locator('.content-card', { hasText: 'Fenn' }).locator('.party-roster__class')).toHaveText([className, secondName]);

    const reloadedCard = win.locator('.content-card', { hasText: 'Fenn' });
    await reloadedCard.getByRole('button', { name: 'Edit' }).click();
    await win.fill('.create-form input[type="text"]', 'Fenn Renamed');
    await win.click('button:has-text("Save Changes")');
    await expect(win.locator('.content-card', { hasText: 'Fenn Renamed' })).toBeVisible();

    await win.locator('.content-card', { hasText: 'Fenn Renamed' }).getByRole('button', { name: 'Delete' }).click();
    await expect(win.locator('.content-card', { hasText: 'Fenn Renamed' })).toHaveCount(0);
  });

  test('deleting a Campaign cascades to remove its Party members', async () => {
    await win.click('.campaign-row--hollow');
    await win.fill('.create-form input[type="text"]', 'Doomed Campaign');
    await win.click('button:has-text("Create Campaign")');
    await win.locator('.campaign-row', { hasText: 'Doomed Campaign' }).click();

    await win.click('.party-roster__add');
    await win.fill('.create-form input[type="text"]', 'Toth');
    await win.click('button:has-text("Add Party Member")');
    await expect(win.locator('.content-card', { hasText: 'Toth' })).toBeVisible();

    await win.click('.campaign-detail__hero-action--danger');
    await expect(win.locator('.campaign-row', { hasText: 'Doomed Campaign' })).toHaveCount(0);
  });

  test('the Party is always shown, with no collapse toggle or hint, and each Session carries its number', async () => {
    await win.click('.campaign-row--hollow');
    await win.fill('.create-form input[type="text"]', 'The Wildwood');
    await win.click('button:has-text("Create Campaign")');
    await win.locator('.campaign-row', { hasText: 'The Wildwood' }).click();

    await win.click('.party-roster__add');
    await win.fill('.create-form input[type="text"]', 'Fenn');
    await win.click('button:has-text("Add Party Member")');
    const card = win.locator('.content-card', { hasText: 'Fenn' });
    await expect(card).toBeVisible();

    // Always shown: the Party has its own column, and nothing to collapse.
    await expect(win.locator('.party-roster__toggle')).toHaveCount(0);
    await expect(win.locator('.party-roster__title')).toHaveText('Party');
    await expect(win.locator('.party-roster__hint')).toHaveCount(0);

    // Sessions list newest first, each with its place in the Campaign.
    for (const name of ['Session 1', 'Session 2']) {
      await win.click('.session-list__add');
      await win.fill('.create-form input[type="text"]', name);
      await win.click('button:has-text("Start Session")');
    }
    await expect(win.locator('.session-list__number')).toHaveText(['#2', '#1']);

    // The two headings' rules sit level, each with its buttons underneath.
    const sessionsTitle = (await win.locator('.session-list__title').boundingBox())!;
    const partyTitle = (await win.locator('.party-roster__title').boundingBox())!;
    expect(Math.abs(sessionsTitle.y + sessionsTitle.height - (partyTitle.y + partyTitle.height))).toBeLessThan(1);
    expect((await win.locator('.party-roster__add').boundingBox())!.y).toBeGreaterThan(partyTitle.y + partyTitle.height - 1);

    // Seven Sessions fit; from the eighth on, the list scrolls instead of growing.
    const scroller = win.locator('.session-list__scroll');
    const overflows = () => scroller.evaluate((el) => el.scrollHeight > el.clientHeight + 1);
    for (let n = 3; n <= 7; n++) {
      await win.click('.session-list__add');
      await win.fill('.create-form input[type="text"]', `Session ${n}`);
      await win.click('button:has-text("Start Session")');
    }
    await expect(win.locator('.session-list__number')).toHaveCount(7);
    expect(await overflows()).toBe(false);
    await win.click('.session-list__add');
    await win.fill('.create-form input[type="text"]', 'Session 8');
    await win.click('button:has-text("Start Session")');
    await expect(win.locator('.session-list__number')).toHaveCount(8);
    await expect.poll(overflows).toBe(true);
  });

  test('a Campaign cover image round-trips through create, reload, and Remove', async () => {
    await win.click('.campaign-row--hollow');
    await win.fill('.create-form input[type="text"]', 'Illustrated Campaign');
    await win.setInputFiles('.create-form .image-upload-field input[type="file"]', path.join(imageDir, 'square.png'));
    await expect(win.locator('.create-form .image-upload-field__preview')).toBeVisible();
    await win.click('button:has-text("Create Campaign")');

    const row = win.locator('.campaign-row', { hasText: 'Illustrated Campaign' });
    await expect(row.locator('.campaign-row__art')).toBeVisible();

    await win.reload();
    await win.waitForSelector('text=Daggerheart Brewery', { timeout: 15000 });
    await win.click('.app-shell__nav-link:has-text("Campaigns")');
    const reloadedRow = win.locator('.campaign-row', { hasText: 'Illustrated Campaign' });
    await expect(reloadedRow.locator('.campaign-row__art')).toBeVisible();

    await reloadedRow.click();
    await win.getByRole('button', { name: 'Edit Campaign' }).click();
    await win.click('.create-form .image-upload-field__clear');
    await win.click('button:has-text("Save Changes")');
    await win.click('.campaign-detail__back');
    await expect(win.locator('.campaign-row', { hasText: 'Illustrated Campaign' }).locator('.campaign-row__art')).toHaveCount(0);
  });

  test("a Party member's portrait round-trips, and MemberBackdrop reads tall vs wide correctly", async () => {
    await win.click('.campaign-row--hollow');
    await win.fill('.create-form input[type="text"]', 'The Wildwood');
    await win.click('button:has-text("Create Campaign")');
    await win.locator('.campaign-row', { hasText: 'The Wildwood' }).click();

    await win.click('.party-roster__add');
    await win.fill('.create-form input[type="text"]', 'Fenn');
    await win.setInputFiles('.create-form .image-upload-field input[type="file"]', path.join(imageDir, 'portrait.png'));
    await expect(win.locator('.create-form .image-upload-field__preview')).toBeVisible();
    await win.click('button:has-text("Add Party Member")');

    // Orientation is read async (an off-screen Image() load), so the class
    // only appears once that resolves.
    const fennMember = win.locator('.party-roster__member', { hasText: 'Fenn' });
    await expect(fennMember.locator('.member-backdrop--portrait')).toBeVisible();

    await win.reload();
    await win.waitForSelector('text=Daggerheart Brewery', { timeout: 15000 });
    await win.click('.app-shell__nav-link:has-text("Campaigns")');
    await win.locator('.campaign-row', { hasText: 'The Wildwood' }).click();
    await expect(win.locator('.party-roster__member', { hasText: 'Fenn' }).locator('.member-backdrop--portrait')).toBeVisible();

    // Swap to a wide image via Edit — MemberBackdrop should re-read the new
    // image's orientation, not keep showing the stale portrait framing.
    await win.locator('.content-card', { hasText: 'Fenn' }).getByRole('button', { name: 'Edit' }).click();
    await win.setInputFiles('.create-form .image-upload-field input[type="file"]', path.join(imageDir, 'landscape.png'));
    await win.click('button:has-text("Save Changes")');
    await expect(win.locator('.party-roster__member', { hasText: 'Fenn' }).locator('.member-backdrop--landscape')).toBeVisible();
    await expect(win.locator('.party-roster__member', { hasText: 'Fenn' }).locator('.member-backdrop--portrait')).toHaveCount(0);
  });

  test('a Party member can have a mixed Ancestry: two of them, shown together', async () => {
    // A new store has no Ancestries of its own.
    await win.click('.app-shell__nav-link:has-text("Heritage")');
    for (const name of ['Elf', 'Orc', 'Dwarf']) {
      await win.click('button:has-text("+ New Ancestry")');
      await win.fill('.create-form .text-field:has-text("Name") input', name);
      await win.click('button:has-text("Create Ancestry")');
      await expect(win.locator('.create-form')).toHaveCount(0);
    }
    await win.click('.app-shell__nav-link:has-text("Campaigns")');
    await win.click('.campaign-row--hollow');
    await win.fill('.create-form input[type="text"]', 'The Wildwood');
    await win.click('button:has-text("Create Campaign")');
    await win.locator('.campaign-row', { hasText: 'The Wildwood' }).click();

    await win.click('.party-roster__add');
    await win.fill('.create-form input[type="text"]', 'Fenn');
    const ancestryChips = win.getByRole('group', { name: 'Ancestry', exact: true }).locator('.chip-select__chip');
    const first = (await ancestryChips.first().innerText()).trim();
    await ancestryChips.first().click();

    await win.click('.create-form__link:has-text("+ Mixed Ancestry")');
    const secondChips = win.getByRole('group', { name: 'Second Ancestry', exact: true }).locator('.chip-select__chip');
    // The one already chosen isn't offered again.
    await expect(secondChips.filter({ hasText: new RegExp(`^${first}$`) })).toHaveCount(0);
    const second = (await secondChips.first().innerText()).trim();
    await secondChips.first().click();
    await win.click('button:has-text("Add Party Member")');

    const heritage = win.locator('.content-card', { hasText: 'Fenn' }).locator('.party-roster__heritage');
    await expect(heritage).toHaveText(`${first}-${second}`);

    await win.reload();
    await win.waitForSelector('text=Daggerheart Brewery', { timeout: 15000 });
    await win.click('.app-shell__nav-link:has-text("Campaigns")');
    await win.locator('.campaign-row', { hasText: 'The Wildwood' }).click();
    await expect(heritage).toHaveText(`${first}-${second}`);

    // Editing shows both, and removing the mix leaves the first.
    await win.locator('.content-card', { hasText: 'Fenn' }).getByRole('button', { name: 'Edit' }).click();
    await expect(win.getByRole('group', { name: 'Second Ancestry', exact: true }).locator('.chip-select__chip--chosen')).toHaveText(second);
    await win.click('.create-form__link:has-text("Remove mixed ancestry")');
    await win.click('button:has-text("Save Changes")');
    await expect(heritage).toHaveText(first);
  });

  test("a portrait's framing can be dragged, and the tile shows the chosen part", async () => {
    await win.click('.campaign-row--hollow');
    await win.fill('.create-form input[type="text"]', 'The Wildwood');
    await win.click('button:has-text("Create Campaign")');
    await win.locator('.campaign-row', { hasText: 'The Wildwood' }).click();

    await win.click('.party-roster__add');
    await win.fill('.create-form input[type="text"]', 'Fenn');
    await expect(win.locator('.image-focus-field')).toHaveCount(0);
    await win.setInputFiles('.create-form .image-upload-field input[type="file"]', path.join(imageDir, 'landscape.png'));

    // A wide picture in a wider preview overhangs top and bottom only, so
    // it can be moved up and down. Dragging down pulls the top into view.
    const preview = win.locator('.image-focus-field__preview');
    await expect(preview.locator('.member-backdrop__image')).toBeVisible();
    await expect(preview).toHaveAttribute('data-focus', '50,50');
    await preview.scrollIntoViewIfNeeded();
    const box = (await preview.boundingBox())!;
    await win.mouse.move(box.x + box.width / 2, box.y + 10);
    await win.mouse.down();
    await win.mouse.move(box.x + box.width / 2 + 40, box.y + 110, { steps: 5 });
    await win.mouse.up();
    await expect(preview).toHaveAttribute('data-focus', '50,0');

    // The arrow keys nudge it.
    await preview.focus();
    await win.keyboard.press('ArrowDown');
    await win.keyboard.press('ArrowDown');
    await expect(preview).toHaveAttribute('data-focus', '50,10');
    await win.click('button:has-text("Add Party Member")');

    const tileImage = win.locator('.party-roster__member', { hasText: 'Fenn' }).locator('.member-backdrop__image');
    await expect(tileImage).toHaveCSS('background-position', '50% 10%');

    await win.reload();
    await win.waitForSelector('text=Daggerheart Brewery', { timeout: 15000 });
    await win.click('.app-shell__nav-link:has-text("Campaigns")');
    await win.locator('.campaign-row', { hasText: 'The Wildwood' }).click();
    await expect(tileImage).toHaveCSS('background-position', '50% 10%');

    await win.locator('.content-card', { hasText: 'Fenn' }).getByRole('button', { name: 'Edit' }).click();
    await win.click('.image-focus-field__reset');
    await win.click('button:has-text("Save Changes")');
    await expect(tileImage).toHaveCSS('background-position', '50% 50%');
  });

  test("a Session has the Campaign's image folder above its music: folded to begin with, with a thumbnail and a name per picture", async () => {
    await win.click('.campaign-row--hollow');
    await win.fill('.create-form input[type="text"]', 'The Wildwood');
    await win.click('button:has-text("Create Campaign")');

    // The file picker can't be driven from here, so the pictures go in the
    // way dropped ones do: by path.
    const fileNames = await win.evaluate(
      async ([map, notAPicture]) => {
        const bridge = (
          window as unknown as {
            daggerheart: {
              list: (c: string) => Promise<{ id: string }[]>;
              importCampaignImagePaths: (id: string, p: string[]) => Promise<{ images: { fileName: string }[] }>;
            };
          }
        ).daggerheart;
        const campaigns = await bridge.list('campaigns');
        const { images } = await bridge.importCampaignImagePaths(campaigns[0].id, [map, notAPicture]);
        return images.map((i) => i.fileName);
      },
      [path.join(imageDir, 'landscape.png'), path.join(imageDir, 'not-a-picture.txt')]
    );
    expect(fileNames).toHaveLength(1);
    const stored = path.join(tempDir, 'campaign-images', fileNames[0]);
    expect(fs.existsSync(stored)).toBe(true);

    await win.locator('.campaign-row', { hasText: 'The Wildwood' }).click();
    await win.click('.session-list__add');
    await win.fill('.create-form input[type="text"]', 'Session 1');
    await win.click('button:has-text("Start Session")');
    await win.locator('.content-card', { hasText: 'Session 1' }).getByRole('button', { name: 'Open' }).click();

    // Above the music, folded, with a count.
    const sidebar = win.locator('.session-view__sidebar');
    await expect(sidebar.locator('> *').first()).toHaveClass(/campaign-images/);
    const toggle = win.locator('.campaign-images__toggle');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toContainText('1');
    await expect(win.locator('.campaign-images__item')).toHaveCount(0);

    await toggle.click();
    const item = win.locator('.campaign-images__item');
    await expect(item).toHaveCount(1);
    await expect(item.locator('.campaign-images__name')).toHaveText('landscape');
    // The thumbnail really loaded.
    await expect.poll(() => item.locator('img').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(120);

    await item.locator('.campaign-images__name').dblclick();
    await win.fill('.campaign-images__rename', 'Wildwood map');
    await win.keyboard.press('Enter');
    await expect(item.locator('.campaign-images__name')).toHaveText('Wildwood map');

    // Opens large; Escape closes it.
    await item.locator('.campaign-images__thumb').click();
    await expect(win.getByRole('dialog', { name: 'Wildwood map' })).toBeVisible();
    await win.keyboard.press('Escape');
    await expect(win.locator('.campaign-images__viewer')).toHaveCount(0);

    await win.reload();
    await win.waitForSelector('text=Daggerheart Brewery', { timeout: 15000 });
    await win.click('.app-shell__nav-link:has-text("Campaigns")');
    await win.locator('.campaign-row', { hasText: 'The Wildwood' }).click();
    await win.locator('.content-card', { hasText: 'Session 1' }).getByRole('button', { name: 'Open' }).click();
    await toggle.click();
    await expect(item.locator('.campaign-images__name')).toHaveText('Wildwood map');

    // Removing it removes the app's copy of the file too.
    await item.locator('.campaign-images__remove').click();
    await expect(item).toHaveCount(0);
    await expect.poll(() => fs.existsSync(stored)).toBe(false);
  });

  test('deleting a Campaign also deletes its picture files, not just their records', async () => {
    await win.click('.campaign-row--hollow');
    await win.fill('.create-form input[type="text"]', 'Doomed Campaign');
    await win.click('button:has-text("Create Campaign")');

    const fileName = await win.evaluate(async (mapPath) => {
      const bridge = (
        window as unknown as {
          daggerheart: {
            list: (c: string) => Promise<{ id: string }[]>;
            importCampaignImagePaths: (id: string, p: string[]) => Promise<{ images: { fileName: string }[] }>;
          };
        }
      ).daggerheart;
      const campaigns = await bridge.list('campaigns');
      const { images } = await bridge.importCampaignImagePaths(campaigns[0].id, [mapPath]);
      return images[0].fileName;
    }, path.join(imageDir, 'landscape.png'));
    const stored = path.join(tempDir, 'campaign-images', fileName);
    expect(fs.existsSync(stored)).toBe(true);

    await win.locator('.campaign-row', { hasText: 'Doomed Campaign' }).click();
    await win.click('.campaign-detail__hero-action--danger');
    await expect(win.locator('.campaign-row', { hasText: 'Doomed Campaign' })).toHaveCount(0);

    expect(fs.existsSync(stored)).toBe(false);
  });

  test("a Campaign's pictures travel with Export Data and are restored on Import", async () => {
    await win.click('.campaign-row--hollow');
    await win.fill('.create-form input[type="text"]', 'The Wildwood');
    await win.click('button:has-text("Create Campaign")');

    const fileName = await win.evaluate(async (mapPath) => {
      const bridge = (
        window as unknown as {
          daggerheart: {
            list: (c: string) => Promise<{ id: string }[]>;
            importCampaignImagePaths: (id: string, p: string[]) => Promise<{ images: { fileName: string }[] }>;
          };
        }
      ).daggerheart;
      const campaigns = await bridge.list('campaigns');
      const { images } = await bridge.importCampaignImagePaths(campaigns[0].id, [mapPath]);
      return images[0].fileName;
    }, path.join(imageDir, 'landscape.png'));
    const stored = path.join(tempDir, 'campaign-images', fileName);
    const originalBytes = fs.readFileSync(stored);

    const exportPath = path.join(tempDir, 'export.json');
    await app.evaluate(
      ({ dialog }, filePath) => {
        dialog.showSaveDialog = async () => ({ canceled: false, filePath });
      },
      exportPath
    );
    await win.click('.app-shell__brand');
    await win.click('text=Export Data');
    await expect.poll(() => fs.existsSync(exportPath), { timeout: 5000 }).toBe(true);

    const exported = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));
    const exportedImage = exported.campaignImages.find((i: { fileName: string }) => i.fileName === fileName);
    expect(exportedImage.imageData).toMatch(/^data:image\/png;base64,/);

    // Simulate arriving on a machine that never had the file — only the
    // export JSON, with the picture's bytes embedded in it, exists now.
    fs.rmSync(stored);
    expect(fs.existsSync(stored)).toBe(false);

    await app.evaluate(
      ({ dialog }, filePath) => {
        dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [filePath] });
      },
      exportPath
    );
    await win.click('text=Import Data');
    await expect(win.locator('text=Imported')).toBeVisible();

    expect(fs.existsSync(stored)).toBe(true);
    expect(fs.readFileSync(stored)).toEqual(originalBytes);
    // The embedded copy never leaks into the live store itself.
    const storedRecord = await win.evaluate(async (id) => {
      const bridge = (window as unknown as { daggerheart: { list: (c: string) => Promise<Record<string, unknown>[]> } })
        .daggerheart;
      const images = await bridge.list('campaignImages');
      return images.find((i) => i.fileName === id);
    }, fileName);
    expect(storedRecord).not.toHaveProperty('imageData');
  });
});

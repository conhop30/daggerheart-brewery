# AI Memory

Continuity doc for AI-assisted work on this repo — not interviewer-facing
(see `README.md` for that), not a backlog (see `TODO.md` for that), not the
original frozen design (see `daggerheart-hub-spec.md` for that, mostly
locked except its Section 6). This file exists so a fresh AI agent, with
no memory of prior sessions and nothing but this repo (commits + code +
these docs), can pick up seamlessly — per Connor's standing "AI Project
Initiation Regulations." Keep it current: update it whenever architecture,
status, or the rules below actually change, not just when asked.

## Standing development rules (from Connor's AI Project Initiation Regulations)

These govern how AI-assisted work happens on this project. They're
condensed here from a PDF Connor supplied directly (not itself committed
to the repo) — ask him for the source document if finer detail is needed.

**Quality bar**, in the vocabulary to use when reviewing or designing code:
- **Redundancy** (duplicated operations across files/classes): aim for
  Distinct (none); Minor (duplication only in non-adjacent files) is an
  acceptable fallback; Critical (siblings duplicate) or worse should be
  flagged and fixed.
- **Coupling** (interface complexity between units): never go below
  Document (needs a rich contract to use correctly) — Trivial/
  Encapsulated/Simple are the targets.
- **Cohesion**: Strong (one module does one task completely) is the goal;
  Extraneous/Partial/Weak are the failure modes to name explicitly.
- Big-O efficiency matters less at this app's scale (a local desktop data
  tool, hundreds of records) — performance work here has mostly been
  real-world launch/startup latency (Electron/GPU behavior), not
  algorithmic complexity.

**Process:**
- A brand-new feature gets no code until Connor has been included in the
  design/goals conversation — mockups-before-code for genuinely new,
  creative work (not for bugfixes or applying an established pattern).
- Features/systems/components should be built detachable — removable
  without breaking the rest of the app.
- Commit on completion (tests green, typecheck clean) without waiting to
  be asked. **Do not push** — pushing to `origin/main` is Connor's own
  action, run by him first. (This reverses an earlier project convention
  of commit-and-push together; the newer rule wins as of 2026-10-02.)
- PC vs. Mobile: already resolved for this project specifically — see
  `daggerheart-hub-spec.md` Section 6. The original hosted-backend design
  was dropped for a local-first/no-server model specifically so the same
  content logic could serve both a desktop and a future mobile client.

## Architecture snapshot

- **Electron + Vite + React (TypeScript)**, desktop app at `apps/desktop`.
  No backend/server at all — `electron/main.js` runs a local JSON data
  store (`electron/store.js`), exposed to the renderer via
  `electron/preload.cjs` → `window.daggerheart` → `src/api/client.ts`'s
  `apiClient`. Every per-collection API file (`src/api/*.ts`) is a thin
  typed wrapper over that bridge.
- Dev loop: `npm run electron:dev` (Vite dev server + Electron pointed at
  it, see `vite.config.ts` for the `DAGGERHEART_DEV_PORT` override). CSS
  changes hot-reload live with no app restart.
- Styling: `src/styles/tokens.css` is the single source of CSS custom
  properties — surfaces, the Hope/Fear accent pair, spacing, motion. Two
  independent theme axes: Light/Dark (`ThemeContext`, `[data-theme]`) and
  Color Theme/palette (`PaletteContext`, `[data-palette]`, Settings >
  Color Theme) — palette only swaps the Hope/Fear-derived tokens, never
  the surface tokens, so every palette still reads as "this app."
- Shared form-field components (`src/components/TextField.tsx`,
  `TextAreaField.tsx`, `SelectField.tsx`, `TextFieldFrame.tsx`,
  `NumberInput.tsx`) are the canonical input pattern for the whole app —
  curved Hope/Fear-accented focus treatment, no native number-input
  spinners anywhere (see `src/lib/numberInput.ts` for why). New form
  fields should go through these, not raw `<input>`/`<textarea>`/
  `<select>`.
- Testing: Vitest for unit tests (`electron/*.test.js`, `src/lib/*.test.ts`),
  Playwright for e2e (`apps/desktop/e2e/*.spec.ts`). A change to a shared
  component (TextField family, ContentCard, etc.) gets the *full* e2e
  suite run, not a spot check — regressions in other consumers are easy
  to miss otherwise.

## Current status (as of 2026-10-02)

Recently landed: the Campaign/Party launch redesign, a Settings > Color
Theme system (4 aesthetic palettes + 2 colorblind-safe themes), the
Journal bubble (app-wide floating GM notes, scoped per-Campaign), and a
from-scratch text-field focus treatment (curved Hope/Fear bevel, pentagon
seam, askew growing focus lines) applied to every create/edit `*Form.tsx`
component, every inline numeric chip, and single-field Notes cards —
including a full number-input overhaul (no native spinners, no
scroll/arrow-key stepping anywhere). Deliberately not applied to the
dense list-editor rows or standalone pickers (`GameSetSelect`,
`StatGallery`, the music-panel selects) — see `TODO.md`'s "Text field
styling" entry for why each was left alone.

`AdventuringPanel`'s old Campaign/NPC/Party/Session Notes fields were
removed once the Journal bubble covered the same need (GM note-taking is
now per-Campaign there instead of split across four per-Session fields).
The `campaignNotes`/`npcNotes`/`generalNotes`/`pcNotes` fields are gone
from the Session data model entirely.

The Session page's Adventuring/Combat tabs are gone too — `ModeToggle`/
`ModeTransitionFX`/`AdventuringPanel` are all deleted, `CombatPanel`
(Adversaries/Environments) always renders, and `LootRoller` moved into
the sidebar next to `SessionMusicPanel`/`SessionCombatSidebar`.
`Session.mode` is gone from the data model entirely — nothing replaced
it; Music no longer depends on a session's combat state at all. A GM now
switches which Music folder (region) is playing by hand, the same way
they'd switch a playlist, rather than it auto-swapping with mode. Only
`fear` and `regionId` still carry forward as session-level scalars.

The **Music System Refactor** (editing reachable from inside a live
session, drag-and-drop import, per-track volume, compact track rows) has
landed, and Music folders (`musicRegion`) can now also be scoped to one
Campaign (`campaignId: null` = application-wide, as before; set = only
that Campaign's own Sessions see it) — `Campaign.defaultRegionId` gives
a Campaign its own "usual place" by pre-filling its first Session's
region. See `e2e/music.spec.ts` for the covered behavior.

The code-quality findings flagged 2026-10-02 have all since been acted
on: `createCrudApi`/`createSessionScopedCrudApi` factories now back every
`src/api/*.ts` file and a shared edit/delete list hook exists
(`a54f7eb`); `EquipmentPage.tsx` was split into one sub-component per
entity type (`b027dbc`); the four list-editor components were unified
behind a shared `useListEditor` hook (`befe7bb`). Treat this repo's own
`git log` as the source of truth for whether a future finding like this
has since been resolved, rather than trusting this note indefinitely.

The Adventuring/Combat merge and Music Campaign-scoping work above is
verified (`npx tsc --noEmit -p .` clean, `npm test` 238 tests green, full
Playwright suite 75 tests green) and shipped as v1.7.0.

A follow-up round of live-play feedback on that merge landed next: the
Journal bubble is now freely draggable and snaps to the nearest window
edge (`src/lib/usePointerDrag.ts`, Pointer Events — kept deliberately
separate from `useDragReorder`'s HTML5 DnD, a different interaction);
dragging an entry out of its list detaches it into its own floating note
(`JournalFloatingNote.tsx`, same underlying record); Sessions now have
real per-Session notes (`JournalEntryKind = 'SESSION'`, kept in sync with
a Session's own `name` by `electron/store.js`'s
`updateSessionAndSyncNotes`, surfaced both from the bubble's new
Campaign/Session toggle and from a live Session's own `SessionNotesPanel`
below Combat); and the Session page's Party/Adversaries/Notes blocks are
drag-reorderable the same way. Separately, an Adversary tile gained a
second, independent collapse (`bodyOpen`, orthogonal to the existing
Features toggle) and the Adversary picker gained a quantity stepper to
pull in several copies in one click. Verified (`npx tsc --noEmit -p .`
clean, `npm test` 242 tests green, full Playwright suite 86 tests green).
See `TODO.md`'s matching entry for the full file-by-file breakdown,
including four real bugs this round's e2e coverage (and, for the last
two, Connor's own live-play) caught and fixed — notably `DiceTray.css`
now needs `pointer-events: none` on its own container (re-enabled per
button) since it's a `position: fixed` overlay that can visually land on
top of real page content, which used to just eat the click.

One architecture note worth keeping here specifically: `electron/main.js`
now calls `app.setPath('userData', ...)` whenever `DAGGERHEART_STORE_DIR`
is set, so a renderer's `localStorage` (Theme/Palette/Text Size/Music
Volume, and now the Journal bubble's position + the Session section
order) is test-isolated the same way the JSON store already was — it
wasn't before, and a new e2e test asserting a specific default
`localStorage`-backed state is what surfaced it.

A further round, also from live play, added **Combat tabs**: the Session
page's Adversaries section now has a horizontal tab bar
(`CombatTabBar.tsx`), each tab scoping its own Adversary/Environment
roster so a GM can prep several encounters without disturbing the one
currently live. Backed by a new `combats` versioned collection
(`electron/store.js`) built on the same `makeVersionedCollection` factory
`sessionAdversaries`/`sessionEnvironments`/`partyMembers` already use, so
a tab carries forward across a Campaign's Sessions with zero new engine
code in `carry.js`. `SessionAdversary`/`SessionEnvironment` gained a
`combatId` field — optional; a `null` one (anything pulled in before
tabs existed) is adopted into the session's first tab by the renderer
the first time that session is opened, not shown in every tab (see
TODO.md's entry for why the original wildcard rule was dropped). Deleting a tab cascades to its own contents via a new
`removeCombatAndContents` helper, which needed `makeVersionedCollection`
to expose an unwrapped `applyRemove` the way `makeCollection` already
exposes `applyUpdate`. A Session never shows zero tabs — a renderer-side,
race-safe lazy-create in `SessionView.tsx` (a `useRef` guard, not
`useState`, re-armed after each create so it fires again when the last
tab is deleted) handles that, not the backend. See `TODO.md`'s "Combat tabs"
entry for the full file-by-file breakdown. Verified (`npx tsc --noEmit -p .`
clean, `npm test` 257 tests green, full Playwright suite 93 tests
green). Shipped as v1.7.1, together with the Journal/Session Notes round above.

v1.7.2 added two things to a Combat tab. **Battle Points**
(`src/lib/battlePoints.ts`, shown by `BattlePointsBar.tsx`) is the
corebook's encounter budget, `(3 x PCs) + 2` against a cost per Adversary
type, with the rulebook's adjustments; the tab stores the GM's own choices
(`partySizeOverride`, `easier`, `harder`, `bonusDamage`). **Minion
stacks** (`src/lib/minionGroups.ts`): a `SessionAdversary` now carries
`type`, `count` and `groupId`, a Minion is one record standing for `count`
of them, and stacks of different Minions sharing a `groupId` render as one
mixed group. Both libs are pure and unit-tested; the components only lay
the result out. Adversary type is now required on the form (not in
`store.js`). **This release shipped without the full Playwright suite
being run** (Connor's call) — see `TODO.md`'s entry, and run it before
building further on Session-page code.

Campaign Frames (2026-10-10, unreleased; 315 Vitest, 111 Playwright green):
a `campaignFrames` collection (plain `makeCollection`, in `COLLECTIONS`)
and its own nav page. Shape and section order live in two mirrored lists:
`FRAME_*` constants in `electron/store.js` and `lib/frameSections.ts`
(main and renderer share no modules) — add a section to both. Every
repeatable section is a list of `FrameEntry` (`heading`, `body`,
`questions[]`, `tables[]`); an entry with a blank heading reads as a
lead-in paragraph, which is how a section-level note is written. Text
markup is `lib/frameMarkup.ts` (each line a paragraph; `**`, `*`, `- `,
`### `), drawn by `FrameText` with no `dangerouslySetInnerHTML`.
`Campaign.campaignFrameId` is optional; `removeCampaignFrame` clears it.
`App.tsx` carries `jumpToFrame` (a Campaign's "Open frame") and
`framesRevision` (so a mounted Campaign page re-reads its frame after an
edit or delete elsewhere). The nav bar no longer wraps as a whole: only
`.app-shell__nav` wraps, so the Settings gear stays on the first row with
eight links. Official frames (6 Core, 4 Hope & Fear) and Connor's own
*Lost Legend of Hope* are loaded into his live store only, text only —
never into the repo, the seed or a release, same rule as book art. Not
built: frame maps, cover art from the books, rollable frame tables, and
frame mechanics inside a Session.

Campaign Frames, Advanced format (2026-10-10, unreleased; 339 Vitest, 117
Playwright green): a frame has `format` (`structured` | `advanced`),
`markdown` and `styleCss`; both formats' data is always kept. `lib/brew.ts`
splits on `\page`, renders with `marked-hbfm` (pages MUST be rendered in
order from index 0: the package keeps per-page variable state) and
sanitises with DOMPurify. `BrewPages` draws into a Shadow DOM root with
`lib/brewStyles.ts`'s CSS (`brew-base.css` mechanics adapted from
Homebrewery's Blank theme, generated `--wc` rules for the 74 mask images in
`src/assets/brew`, `brew-daggerheart.css` look), all inside `@layer brew`
so a frame's own unlayered CSS wins. `lib/brewPaginate.ts` measures a
hidden page to insert `\page` (Fit to pages, and the converter);
`lib/frameToMarkdown.ts` writes a structured frame as Markdown;
`lib/brewPrint.tsx` + `frames:exportPdf` print via `printToPDF`
(`DAGGERHEART_PDF_PATH` replaces the Save dialog under test). Pictures:
`frames:importImage`/`importImagePaths` copy into
`<store dir>/frame-images`, shown as `dhmedia://frame-image/<name>`; not
in Export Data, and never deleted automatically. Gotchas met: `main.js`
already had an `IMAGE_TYPES` (backdrops), a second `const` of that name
stops the app opening at all; the toggles here use `.frame-toggle*`, not
`.mode-toggle*`, because Equipment's tests count those; DOMPurify lets any
`data:` URI through on `<img>` unless hooked. Homebrewery's 5e theme is
deliberately not copied. The editor's Guide tab shows `lib/brewGuide.ts`'s
constant `BREW_GUIDE` read-only; keep each of its pages within a page (the
e2e test fails if one overflows), and note that a `\page` or `\column`
line is obeyed even inside a code fence, so the guide only ever names them
inline.

After v1.8.1 (2026-10-10): no `window.alert` or `window.confirm` is left
in `src` — errors go through `alertDialog` and questions through
`confirmDialog` (both `lib/confirm`, both drawn by `ConfirmHost`; a notice
is the same box with one OK button, which still carries
`.confirm-dialog__confirm` so the e2e locator handler dismisses it).
Equipment's view defaults to the table. The GitHub repo was renamed
`daggerheart-hub` -> `daggerheart-brewery`; the local folder, the
`~/.daggerheart-hub` data directory, `daggerheart-hub-spec.md` and the
portfolio's `/projects/daggerheart-hub/` address keep the old name on
purpose. The installer is self-signed (SmartScreen shows "unknown
publisher"); Connor considers code-signing important to remember but it is
deliberately not a TODO or roadmap item.

v1.8.1 (2026-10-08, full suites green: 295 Vitest, 105 Playwright) added
a Table mode to `StatGallery`, the default wherever `tableColumns` is
passed (Adversaries and Environments); the chosen mode is kept in
`localStorage` per item label, so an e2e test that needs tiles must pick
Standard itself and put Table back. Heritage and Optional Mechanics are
both built from `EntrySection` + `SetFilter`. CombatPanel has Collapse
All, and a collapsed tile shows roll results inline
(`.session-tile__roll-inline`) instead of on new lines.

A playtest round on 2026-10-07 reshaped the Session page and shipped as
v1.8.0 with both full suites green (295 Vitest, 99 Playwright; see
`TODO.md`'s "Playtest round" entry). Also in v1.8.0: every delete asks
through `lib/confirm` + `ConfirmHost`, not `window.confirm` (the e2e
specs agree to it with `addLocatorHandler`); the Campaign page is two
columns (Sessions, capped at seven rows and scrolling, beside the Party);
the Slain list pools identical Adversaries; and Subclass pictures are
read from `<store dir>/subclass-backdrops` and are NOT in the repo or the
installer (Connor's own copies are official art he chose to keep
private). The round itself: the Party section is gone from it (the roster lives on the
Campaign page only), Fear is a rail fixed to the window's left edge, the
Journal bubble is pinned bottom-left and no longer draggable, Adversaries
can be Killed onto a Slain list (`SessionAdversary.slain`), and Notes has
tabs. `TabBar.tsx` is the one tab-bar component for both Combat and Notes
tabs. Notes tabs are their own versioned collection (`noteTabs`), carried
forward exactly like Combat tabs; the older per-Session Journal note is a
separate thing that only seeds a Campaign's first tab. A Party member is
now name + Class + Subclass + Heritage (two Classes when multiclassed)
with no HP/Stress at all, and a Subclass carries a `backdropImage` used
automatically behind its members' tiles. Duplicate Adversaries can be
stacked by dragging one stat block across the others
(`lib/minionGroups.ts`): Minions merge into one counted record, anything
else keeps a record each under a shared `groupId` and is drawn as one
stat block with a row per member (`SessionAdversaryStackTile`). The whole
stat block is the drag handle; see `CombatPanel.boardCell` for the two
non-obvious parts (cancelling a drag that starts in an input, and ending a
drag whose `dragend` never arrives).

Four requests from 2026-10-11, built 2026-10-12. A
Party member has `secondAncestryId` (a mixed Ancestry; the tile reads
"Elf-Orc"). `Subclass.backdropFocus` and `PartyMember.portraitFocus` are
`{ x, y }` percentages used as CSS `background-position` by
`MemberBackdrop`; `ImageFocusField` is the drag-to-frame preview, and on a
Subclass it frames the folder picture too, not only an uploaded one.
Automatic face detection was looked at and not built: Electron has no
detector without bundling a model, and the pictures are paintings.
`ItemPicker` takes an optional `describe` (Tier + type) that turns on its
filters; Loot Tables don't pass it. `lib/adversaryRefs.ts` finds the
Adversaries a feature's text names. It is case-sensitive on the full name
on purpose (the books capitalise a stat block's name and write "merchant"
or "bear" in lower case for the plain word), takes the longest name, and
treats a short form of the owner's own name ("the Vampire" on Head
Vampire) as the owner unless it is plural or counted. `CombatPanel`
provides `CombatRefsContext`; `AdversaryRefButtons` renders the buttons in
Adversary and Environment tiles. Against the live library it finds every
summon whose target exists by its full name; it cannot find ones the book
abbreviates ("as many Lackeys as there are PCs") or that aren't in the
library ("Storm Giant").

Released as v1.8.5 on 2026-10-12. Session music is a
playlist now, not one looped default: `lib/music.resolvePlaylist` gives
the chosen region's own tracks, default track first, falling back to
Everywhere's when the region is empty. Before, a region with tracks but no
default played nothing of its own, which is what "I can't switch what's
playing" was. `MusicContext` keeps `currentId`, `next` and `previous`
(`backtrackTarget`: restart past 5 seconds, else the previous song); the
`<audio>` loops only when the playlist is one song and is tagged
`data-session-audio` (the editor's preview `<audio>` is also in the DOM).
Position and duration live in a second context, `useMusicProgress`,
because they change several times a second and `SessionView` consumes the
main one. `MusicTransport` is the buttons and play bar. Tracks and regions
rename by double-clicking the name; the Rename buttons are gone.

Released as v1.8.4 on 2026-10-12, with the two paragraphs around this
one. `campaignImages` is a hand-rolled collection (id, campaignId, name,
fileName), not `makeCollection`, because that dedupes by name and two maps
can share one. The files live in `<store dir>/campaign-images` and are
served as `dhmedia://campaign-image/<file>`; `campaignImages:import`,
`:importPaths` and `:remove` in `electron/main.js` keep record and file
together, so the generic `store:create`/`store:remove` are deliberately
not wired for it. `CampaignImagesPanel` is first in `SessionView`'s
sidebar and starts folded. Like music, the files are not in Export Data,
and deleting a Campaign drops the records but leaves the files.

Built 2026-10-12. Pages stay mounted, so a list
fetched once went stale when another page wrote to its collection: a
homebrew Environment made with a Session open never reached the Combat
panel's picker. `apiClient.create/update/remove` now dispatch
`COLLECTION_CHANGED` and `useApiList(fetcher, 'collection')` refetches on
it; pass the second argument for any list that some other page can change.
`SessionEnvironment.pinned` moves a tile out of the board grid into
`.combat-panel__pinned` (full width, features in CSS columns).
`NoteTab.parentId` nests one level; `SessionNotesPanel` draws a second
`TabBar` whose first, `fixed` tab ("Overview") is the outer tab's own text,
and deletes inner tabs before their outer one. The Adversaries &
Environments page's two section headings fold their sections
(localStorage).

Fixed 2026-10-24, closing the two loose ends the paragraph above once
flagged: `removeCampaign` (`electron/store.js`) now returns
`{ removedImages }` instead of silently dropping them, and `main.js`'s
`campaigns` entry in `REMOVE` deletes each one's file from
`campaign-images` after the records go — same split as `removeMusicTrack`
already used (store.js never touches disk itself; the caller does,
using what store.js hands back). Pictures also travel with Export Data
now: `store:export` reads each `campaignImages` file and embeds it as a
`data:` URL under `imageData` (same convention as Campaign's own
`coverImage`), and `store:import` writes those bytes back into
`campaign-images` before `importSnapshot` runs, stripping `imageData`
first so it never lands in `data.json` itself. Folders/ordering for the
picture list are still not built — nobody's asked for that yet.

See `TODO.md` for the live backlog. Its completed entries were cleared on 2026-10-07; wherever this file says "see `TODO.md`'s ... entry", that entry is now in git history (`TODO.md` as of commit `d1a8669`). (`QUESTIONS.md` — logged blockers
from unattended work — gets created on demand and deleted once empty; if
it's not present, there's nothing currently blocked on Connor's input.)

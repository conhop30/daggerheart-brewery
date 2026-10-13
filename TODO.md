# TO DO

Working backlog of feedback and small fixes not yet acted on. Not
interviewer-facing (see README's Feature Roadmap for that) — this is a
scratch list for planning the next pass of work.

Everything completed up to v1.8.0 was cleared out of this file on
2026-10-07. Those entries (with their file-by-file breakdowns, which
`AI_MEMORY.md` still points at by name) are in git history: see `TODO.md`
as of commit `d1a8669`.

## Open

- [ ] **Stat-block links, what's left.** The four requests of 2026-10-11
      are built (mixed Ancestry, art framing, Adversary search, a button
      on features that summon another Adversary). Not covered: a summon
      the book abbreviates ("as many Lackeys as there are PCs"), counts
      that depend on the table ("equal to the number of PCs" adds one),
      and an Environment's Potential Adversaries list, which could get the
      same buttons. Automatic face detection for art was not built; the
      framing is set by hand.
- [ ] **Campaign image folder, loose ends.** Deleting a Campaign removes
      its picture records but leaves the files in `campaign-images`.
      Pictures don't travel with Export Data. No folders or ordering yet;
      Connor asked for something small.
- [ ] **Advanced format, loose ends.** Pictures in `frame-images` are
      never cleaned up when no frame uses them, and don't travel with
      Export Data. Text does not flow between pages while typing (Fit to
      pages is a button). A block taller than a page can't be split.
      Homebrewery's stat-block and class-table snippets are not ported.
- [ ] **Campaign Frames, next steps (none asked for yet).** Frame maps;
      cover art for the official frames (Connor would have to supply
      it); rolling on a frame's tables; using a frame's mechanics inside
      a Session (e.g. a Pivoting Fate countdown on an Adversary tile).
- [ ] **A collapsed stack still lists every member's row.** Collapse All
      hides HP/Stress on single tiles, but a stack's rows are its trackers
      and stay. Connor wants to revisit how stacking behaves; keep this
      with that conversation.
- [ ] **Customised dialogs and messages.** Every pop-up now shares one
      style (`lib/confirm` + `ConfirmHost`: `confirmDialog` asks,
      `alertDialog` reports). That was step one. Next, per Connor: lean
      into purpose-built behaviour and displays (a quieter toast for a
      failed save, say) instead of one box for everything. The file
      pickers (export, import, add music) are still the operating
      system's own and can't be restyled.
- [ ] **Portfolio screenshots are v1.8.0.** They don't show the Table
      views, the Heritage layout or Collapse All.
- [ ] **Heritage and Optional Mechanics: a table too?** Equipment and
      Adversaries & Environments open as tables. These two are a card
      grid. Asked Connor on 2026-10-10 whether he wants a table view
      there as well; no answer yet.

## Waiting on Connor

- [ ] **Corebook Loot/Consumables and Hope & Fear Consumables.** Connor
      will supply the data himself. Don't attempt to extract it.

## Parked (Connor's call, don't raise again unprompted)

- Condense / Standard / Expand stay as options beside Table.
- Party tile colours stay as they are (not brightening yet).
- The one-off "Session 1-------" e2e flake: ignore unless it recurs.
- Faster verification runs: low priority.

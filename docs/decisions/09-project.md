# Project

### D27 — A throwaway spike, then two thin phases
**Status:** settled · reviewed 2026-10-13, revised · **"throwaway" revised by D34**
(2026-10-18): the spike evolves into phase 1

Each phase is **thin but end-to-end** rather than a layer (all the parsing, then
all the state, then all the UI), so something usable exists at the end of each.

| | What | Delivers |
|---|---|---|
| **Spike** | a throwaway mod drawing one hardcoded message with a gutter, fake mark symbols and a selected row | answers Q3, Q10, the highlight question and the entry key — and whether the look holds up |
| **Phase 1** | real segmentation, accept/reject/comment, tray, band preview, submit | a mod usable daily. **No threads.** |
| **Phase 2** | threads via `fork`, commit toggle, model-written summary | the discussion half |

**The spike is not phase 1** — it is throwaway code written to answer questions,
then deleted.

**Revision note:** the original first slice bundled rendering and state
together, which would have meant discovering a rendering problem *after*
building the machinery that depends on it. D21 is the one part of the design
that cannot be settled on paper, so it goes first and costs almost nothing:
`--plugin-dir`, one `register.ts`, reloads on save.

**Phase 1 is the real test.** If marking without threads does not change how the
work feels, phase 2 will not save it.

**Rationale:** the project's real risk is scope growth, not poor tracking.

---

### D34 — The spike evolves into phase 1
**Status:** settled · added 2026-10-18 · **revises D27** ("the spike is throwaway")

D27 called the spike throwaway: write it to answer questions, then delete it, and
build phase 1 fresh from `SPEC.md`. By the end of spike 0 the code had outgrown
that: tested against the bench's fixtures, the classic renderer and a second mod,
with real fixes in it — the whole turn as the reply, multi-paragraph items, the
shared band, focus handling, the suggestion's re-proposal.

**Phase 1 evolves it, deliberately:**
- **Keep** the hooks file's tested behaviour and the tested `src/` pieces
  (`lastTurnText`, the compile step), renamed out of `spike-*`.
- **Rewrite the segmenter** properly from SPEC §3 — the most naive part; tables,
  quotes, code and multi-paragraph items with tests from the bench's fixtures.
- **Add a tray module** for §5's state rules, with tests.
- **Split the hooks file** (~700 lines) into a few files by surface.

**Why not rewrite:** it would redo work that was tested against real use, and
D27's reason — finding out whether rendering could work before building state on
it — has been served. D27's other point stands: phases stay thin but end-to-end.

---

### D36 — Distribution: a release zip now, a marketplace at v0.1, npm held
**Status:** settled · added 2026-10-18

How people get Synaptik before and after phase 1.

**Now: a zip on every release.** Pushing a tag `v<version>` builds
`synaptik-<version>.zip` from git and drafts a GitHub release with it
(`release.yml`). It is unzipped into `~/.claude/skills/` (every session) or passed
to `--plugin-dir` (one session). A file is easier to hand over than a clone,
works while the repository is private, and works on machines with no network.
Releases are cut when something visible lands, not after every PR.

**Revised 2026-10-22: the marketplace comes with going public (#47), not v0.1** —
once the repository is public anyone can add it, so the README leads with it
and the zip stays for offline machines. Originally: **At v0.1 (#52): the
repository becomes its own marketplace** —
`.claude-plugin/marketplace.json` listing `./hosts/claude-code`, installed with
`claude plugin marketplace add synaptik-app/synaptik`. Tried and working in #54,
then held back: by-name install and `claude plugin update` are worth offering
once phase 1 is done, not for an alpha. The zip stays on each release.

**npm: the scope is reserved, nothing is published.** `@synaptik-app` exists on
npm (`synaptik` unscoped is taken). A marketplace entry can name an npm package,
fetched through the person's own npm setup — which is what makes a corporate
mirror work — but the marketplace file itself cannot come from npm, so npm adds a
moving part without removing one. `claude plugin install <package>@npm` appears
in the CLI's help (2.1.287) but not in the docs, and is untested. Revisit if
Claude Code installs plugins from npm directly.

**Why not npm or a marketplace first:** the zip covers every case seen so far —
colleagues, a private repository, air-gapped machines (a mirror can host the zip
as an `archive` source) — with one artifact and no account on anyone's side.

---

### D40 — Target surfaces: the terminal only
**Status:** settled · added 2026-10-21 · revised 2026-10-29 (non-interactive row)

**Synaptik draws only in Claude Code's terminal renderer** (`e.surface ===
'terminal'`): standalone terminals, IDE-integrated terminals (VS Code, Cursor,
JetBrains), the JetBrains plugin (it runs the CLI in the IDE terminal), tmux,
screen, SSH and WSL. Everywhere else every hook passes through with `next(e)`.

| Surface | Where | Synaptik |
|---|---|---|
| `terminal` | every terminal, IDE terminals, JetBrains plugin | **draws** — the target |
| `vscode` | the Claude Code VS Code extension panel | not yet — **the next surface** (#76) |
| `desktop` | the Claude app's Code tab | **stays out** |
| `mobile` | the Claude mobile app (e.g. steering via Remote Control) | **stays out** |
| — | `claude -p`, the Agent SDK, GitHub Actions, cloud sessions (`!e.isInteractive`) | no `/synaptik` command, nothing adopted; the other hooks still run and pass through silently (revised 2026-10-29, #127) |

**Revision (#127) — non-interactive sessions.** The row used to read "hooks run,
nothing draws: pass through silently". Now `session.start` checks
`!e.isInteractive` and, in such a session, skips registering the `/synaptik`
command and adopting the last reply (`adoptLastReply`, so `turn.complete`
stays out too). Only the command is skipped: the other hooks are still
registered and pass through, and find no reply to draw. Nobody is there to
review, so a command and a tray would be dead weight. The check is
`!e.isInteractive`, not `=== false`: 2.1.301 sends the field.

**Why the Desktop app and the mobile app are out:** they already ship review of
their own. Tried in the Desktop Code tab on 2026-10-21: a reply on a selected
passage (several can go as one prompt — Synaptik's comment and batching), a
side chat that can summarise into the main chat (D3's thread and summary), and
line comments on the diff that reach Claude anchored to file and line (E15).
Only accept/reject with one key, and nesting, are missing. A Synaptik pane there
would duplicate native features and leave people unsure which to use. The
mobile app offers similar features, and draws no `Input` or `Select` besides.

**Side note — the app's comments are agent-aware:** Claude receives a structured
anchor (file, line) plus an instruction, the opposite of P1 — evidence that an
agent-aware approach (E16) works well enough to ship.

**The VS Code panel is next (#76)**, per the docs (unverified on the installed
2.1.287, whose types already list the `vscode` surface without a `Client`): no
band, so the preview and send line move to the pane's footer; no hotkeys and no
`autoFocus`, so the actions are clicked or ⏎'d buttons; `$.prompt.suggest`
answers `isShown: false`, so sending is an explicit button; it draws only in a
session that fetches feature flags, which an offline machine may not. Whether
Cursor and Windsurf draw mods through the same extension is on #76.

**Offline:** the Desktop app can run against a self-hosted gateway ("Claude
Desktop on 3P"); whether its review features exist there is unverified. If they
don't, offline review in the terminal stays a clear Synaptik case.

**Testing:** the terminal varies by keys (IDE terminals grab shortcuts), mouse
support, glyph widths, renderer (fullscreen, classic) and width — the matrix on
#13. The glyphs are plain Unicode (`✓ ✗ ✎ 💬 ⏺ ▲ ▼ █ ┃ │ ⎿ ▸ ‹`), no Nerd Font
needed; emoji width (`💬`) is the one to watch.


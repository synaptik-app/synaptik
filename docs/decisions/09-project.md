# Project

### D27 — Build in thin, end-to-end slices
**Status:** settled · added by 2026-10-13

**Each slice is thin but end-to-end** rather than a layer (all the parsing, then
all the state, then all the UI), so something usable exists at the end of each.
**The riskiest part goes first**, as cheaply as possible: the part that can't be
settled on paper — how a marked-up reply looks in a terminal — was a spike
before any machinery depended on it.

**Evolve tested code; don't rewrite it.** Code that has been tested against real
use — the bench's fixtures, both renderers, other mods — is kept and refined, not
rebuilt from the spec. A rewrite redoes work that was proven.

**Rationale:** the project's real risk is scope growth, not poor tracking.

**Revisions**
- **2026-10-13** — the first slice no longer bundles rendering and state:
  rendering goes first, as the spike.
- **2026-10-18** — the spike is not thrown away; phase 1 evolves it (D34).
- **2026-11-10** — the spike, phase 1 (marking) and phase 2 (threads) are done;
  what stays is the rule. Takes in D34; retitled from "A throwaway spike, then
  two thin phases".

---

### D36 — Distribution: the repository is its own marketplace, a zip per release, npm held
**Status:** settled · added 2026-10-18

**The repository is its own marketplace** — `.claude-plugin/marketplace.json`
listing `./hosts/claude-code`, installed with `claude plugin marketplace add
synaptik-app/synaptik` — and the README leads with it. It gives by-name install
and `claude plugin update`.

**A zip on every release**, for machines with no network. Pushing a tag
`v<version>` builds `synaptik-<version>.zip` from git and drafts a GitHub release
with it (`release.yml`). It is unzipped into `~/.claude/skills/` (every session)
or passed to `--plugin-dir` (one session); a mirror can host it as an `archive`
source. Releases are cut when something visible lands, not after every PR.

**npm: the scope is reserved, nothing is published.** `@synaptik-app` exists on
npm (`synaptik` unscoped is taken). A marketplace entry can name an npm package,
fetched through the person's own npm setup — which is what makes a corporate
mirror work — but the marketplace file itself cannot come from npm, so npm adds a
moving part without removing one. `claude plugin install <package>@npm` appears
in the CLI's help (2.1.287) but not in the docs, and is untested. Revisit if
Claude Code installs plugins from npm directly.

**Why the zip came first:** it covered every case seen before going public —
colleagues, a private repository, air-gapped machines — with one artifact and no
account on anyone's side.

**Revisions**
- **2026-10-22** — the marketplace comes with going public (#47), not at v0.1
  (#52): once the repository is public anyone can add it. Tried and working in
  #54 before that, then held back as not worth offering for an alpha.

---

### D40 — Target surfaces: the terminal only
**Status:** settled · added 2026-10-21

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
| — | `claude -p`, the Agent SDK, GitHub Actions, cloud sessions (`!e.isInteractive`) | no `/synaptik` command, nothing adopted; the other hooks still run and pass through silently |

**Non-interactive sessions:** `session.start` checks `!e.isInteractive` and, in
such a session, skips registering the `/synaptik` command and adopting the last
reply (`adoptLastReply`, so `turn.complete` stays out too). The other hooks are
still registered and pass through, and find no reply to draw. Nobody is there to
review, so a command and a tray would be dead weight. The check is
`!e.isInteractive`, not `=== false`: 2.1.301 sends the field.

**Why the Desktop app and the mobile app are out:** they already ship review of
their own. Tried in the Desktop Code tab on 2026-10-21: a reply on a selected
passage (several can go as one prompt — Synaptik's comment and batching), a
side chat that can summarise into the main chat (D3's thread and summary), and
line comments on the diff that reach Claude anchored to file and line.
Only accept/reject with one key, and nesting, are missing. A Synaptik pane there
would duplicate native features and leave people unsure which to use. The
mobile app offers similar features, and draws no `Input` or `Select` besides.

**Side note — the app's comments are agent-aware:** Claude receives a structured
anchor (file, line) plus an instruction — the opposite of P1, and evidently good
enough to ship.

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

**Revisions**
- **2026-10-29** — non-interactive sessions (#127): the command and reply
  adoption are skipped there; before, the hooks ran and only drew nothing.
- **2026-11-10** — the side note no longer cites a proposal.

---

## Superseded

### D34 — The spike evolves into phase 1
**Status:** superseded → D27 · added 2026-10-18

Phase 1 evolves the spike's code rather than building fresh from the spec, as
D27 first had it. By the end of spike 0 the code had been tested against the
bench's fixtures, the classic renderer and a second mod, with real fixes in it —
the whole turn as the reply, multi-paragraph items, the shared band, focus
handling, the suggestion's re-proposal.

**Phase 1, deliberately:**
- **Keep** the hooks file's tested behaviour and the tested `src/` pieces
  (`lastTurnText`, the compile step), renamed out of `spike-*`.
- **Rewrite the segmenter** properly from `spec/01-review-model.md` §3 — the most naive part; tables,
  quotes, code and multi-paragraph items with tests from the bench's fixtures.
- **Add a tray module** for §5's state rules, with tests.
- **Split the hooks file** (~700 lines) into a few files by surface.

**Why not rewrite:** it would redo work that was tested against real use, and
D27's reason — finding out whether rendering could work before building state on
it — has been served. D27's other point stands: phases stay thin but end-to-end.

**Revisions**
- **2026-11-10** — superseded by D27: phase 1 is done, and its rule — evolve tested
  code, don't rewrite it — is D27's.

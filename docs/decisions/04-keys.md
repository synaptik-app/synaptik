# Keys

### D32 — Key bindings belong to the person
**Status:** settled · added 2026-10-15

A mod cannot declare key bindings or actions. So the mod **works with Claude
Code's defaults** (`ctrl+x tab`, ↑↓, Tab, ⏎, letter hotkeys, Esc), and better keys
are the person's own `keybindings.json`: documented, never read or written by the
mod (D42). The band names Claude Code's defaults.

Recommended: a single chord for `abovePrompt:focus` in `Chat`, and ←/→ for
`abovePrompt:previous/next` in `Pane`. Costs to state alongside: `ctrl+s` gives up
`chat:stash`; the `Pane` arrows apply to every mod's pane and swallow the second
key of `ctrl+x ←/→` (pane resize).

**Revisions**
- **2026-10-20** — the candidate `/synaptik configure`, which would merge the
  bindings into the file after confirmation, became D38.
- **2026-10-31** — the band no longer names the chord the person bound, read from
  the file: Synaptik reads no key bindings (D42).

---

### D39 — The `/synaptik` command
**Status:** settled · added 2026-10-20

One command, its subcommands as arguments:

| Command | Does |
|---|---|
| `/synaptik` | opens the navigator — also when Claude Code held it back on a narrow terminal (#20) |
| `/synaptik help` | lists the commands and what each does |
| `/synaptik on` / `off` | the kill switch (§12), **this session only**; disabling the mod for good is `/plugin` |
| `/synaptik log` | what the hooks observed, for debugging |

**Why a bare `/synaptik` opens rather than toggles:** a bare command that switches
the mod off is easy to hit by accident, and opening the navigator is what a
person typing the mod's name most likely wants. `on`/`off` are explicit.

**Revisions**
- **2026-10-31** — `/synaptik config` (the key setup, D38) removed with D42.

---

### D42 — No key setup: Synaptik reads and writes no key bindings
**Status:** settled · added 2026-10-31

There is no `/synaptik config`, and Synaptik never reads `keybindings.json`. This
supersedes D38 and D32's reading of the file. Since D41 only the classic renderer
used them, for one setting: ←/→ in place of Tab/⇧Tab, which work. That doesn't
justify a mod that reads the person's environment and writes one of their files,
least of all before a marketplace submission.

**Cost, accepted:** the band names Claude Code's defaults (`ctrl+x tab`, `tab/⇧tab`).
Someone who rebound those keys sees the default named; their keys still work.

---

## Extensions

### E10 — Config surface (was D26)
**Status:** proposed · added by 2026-10-14

The `userConfig` manifest field declares options and gives a `/config` surface
for free — rows rendered by Claude Code, with `config.set` and `config.describe`
hooks available if a row needs guarding or relabelling. One option exists today:
marks after review (D35).

**Its real purpose is hedging the unknowns.** Several decisions in this document
were made on reasoning rather than use, and the honest position is that some will
be wrong. Making those configurable converts a wrong guess from a rewrite into a
default change:

| Option | Hedges |
|---|---|
| Which verbs are enabled | D2 — maybe reject is never used, maybe comment is everything |
| Entry key | D20 — unresolved, and terminal-dependent |
| Gutter vs background highlight | D21 — depends on Q10's answer |
| Threads default excluded or included | D3 — flips to classifier-driven under E6 |
| Quote length in the compile format | §9 of the spec — 6–8 words is a guess |

**But config is not a substitute for deciding.** A mod with twenty options is a
mod nobody tuned. Add an option when use reveals a genuine split, not in
anticipation of one.

---

## Superseded

### D26 — Config surface
**Status:** superseded → E10 · added by 2026-10-14

Moved to E10 as an extension.

---

### D38 — `/synaptik config` writes the key bindings, after the person confirms
**Status:** superseded → D42 · added 2026-10-20

As it stood when D42 replaced it: **`/synaptik config` edited
`~/.claude/keybindings.json`**, the only place Claude Code takes keys from, in the
classic renderer only, with one setting, *Move between actions*: Tab / ⇧Tab
(default) or ← / →, in `Pane` → `abovePrompt:previous` / `:next`. It read what was
bound, showed exactly what it would add and which of Claude Code's own keys a
choice gave up, and **wrote only when the person confirmed** — never silently
(D32, P1 as revised). In fullscreen it opened nothing and said it was for the
default renderer.

- **The menu was a mode of the navigator pane** — one tab; Esc returned to the
  navigator. (A second pane showed as a second tab.)
- **Keys were not `userConfig` options.** Claude Code obeys only the file; a copy
  in `userConfig` would have to be written into the file on reload, unseen, and
  would drift from hand edits. One store: the file.
- **The key that opens Synaptik was not Synaptik's to set:** `ctrl+x tab` is
  Claude Code's, and a key the person bound stays theirs, untouched.

**`userConfig` holds behaviour options**, as `/config` rows: changing one reloads
the mod with the new value (`register(on, options)`), which closes its panes —
so the key menu, which wrote the file, did not edit them. Only one: **marks
after review**, keep (default) or only while reviewing (D35). Others wait for a
real need (E10). This still holds.

**Why it went (D42):** one setting, in one renderer, didn't justify reading the
person's environment and writing one of their files.

**Revisions**
- **2026-10-20** — settles D32's candidate; spike on #8. Settings: the entry key
  (`ctrl+x tab` · `ctrl+s` · custom) and the verb keys.
- **2026-10-21** — custom keys, captured by clicking a `Client` region and pressing
  the key, removed: built in #71, but a mouse click to capture a key is poor UX
  for a keyboard tool. Presets only; custom keys are #80.
- **2026-10-27** — classic only (D41, #113): fullscreen needs none. The `ctrl+s`
  entry option goes (it gives up the prompt stash).
- **2026-10-28** — one setting, *Move between actions*; the entry key is no longer
  Synaptik's to set (#113).
- **2026-10-31** — superseded by D42.

# Keys

### D32 — Key bindings belong to the person
**Status:** settled · added 2026-10-15

A mod cannot declare key bindings or actions. So the mod **works with Claude
Code's defaults** (`ctrl+x tab`, ↑↓, Tab, ⏎, letter hotkeys, Esc), and better keys
are the person's own `keybindings.json` — documented, never written silently.
The band names whatever chord the person bound to `abovePrompt:focus`, read from
that file.

Recommended: a single chord for `abovePrompt:focus` in `Chat`, and ←/→ for
`abovePrompt:previous/next` in `Pane`. Costs to state alongside: `ctrl+s` gives up
`chat:stash`; the `Pane` arrows apply to every mod's pane and swallow the second
key of `ctrl+x ←/→` (pane resize).

**Candidate:** a `/synaptik configure` that shows the bindings it would add, asks
for confirmation, and merges them into the file (§11, item 10). Allowed under P1
as revised. **Settled by D38** (`/synaptik config`).

---

### D39 — The `/synaptik` command
**Status:** settled · added 2026-10-20

One command, its subcommands as arguments:

| Command | Does |
|---|---|
| `/synaptik` | opens the navigator — also when Claude Code held it back on a narrow terminal (#20) |
| `/synaptik help` | lists the commands and what each does |
| `/synaptik on` / `off` | the kill switch (§12), **this session only**; disabling the mod for good is `/plugin` |
| `/synaptik config` | the key setup (D38) |
| `/synaptik log` | what the hooks observed, for debugging |

**Why a bare `/synaptik` opens rather than toggles:** a bare command that switches
the mod off is easy to hit by accident, and opening the navigator is what a
person typing the mod's name most likely wants. `on`/`off` are explicit.

---

### D42 — No key setup: Synaptik reads and writes no key bindings
**Status:** settled · added 2026-10-31 · supersedes D38 and D32's reading of the file

`/synaptik config`, and the reading of `keybindings.json` behind it, are gone. Since
D41 only the classic renderer used them, for one setting: ←/→ in place of Tab/⇧Tab,
which work. That doesn't justify a mod that reads the person's environment and
writes one of their files, least of all before a marketplace submission.

**Cost, accepted:** the band names Claude Code's defaults (`ctrl+x tab`, `tab/⇧tab`).
Someone who rebound those keys sees the default named; their keys still work.

---

## Extensions

### E10 — Config surface (was D26)
**Status:** proposed
The `userConfig` manifest field declares options and gives a `/config` surface
for free — rows rendered by Claude Code, with `config.set` and `config.describe`
hooks available if a row needs guarding or relabelling.

**Its real purpose is hedging the unknowns.** Several decisions in this document
were made on reasoning rather than use, and the honest position is that some will
be wrong. Making those configurable converts a wrong guess from a rewrite into a
default change:

| Option | Hedges |
|---|---|
| Which verbs are enabled | D2 — maybe reject is never used, maybe comment is everything |
| Entry key | D20 — unresolved, and terminal-dependent |
| Gutter vs background highlight | D21 — depends on Q10's answer |
| Submit directly vs copy to box | D29 — the "natural UX" question left to feel |
| Threads default excluded or included | D3 — flips to classifier-driven under E6 |
| Quote length in the compile format | §9 of the spec — 6–8 words is a guess |

**But config is not a substitute for deciding.** A mod with twenty options is a
mod nobody tuned. Add an option when use reveals a genuine split, not in
anticipation of one.

## Superseded

### D26 — Config surface
**Status:** superseded → E10

---

### D38 — `/synaptik config` writes the key bindings, after the person confirms
**Status:** superseded → D42 · added 2026-10-20 · settles D32's candidate · spike on #8

The keys that matter most for adapting are the entry key and the verb keys, and
they live in `~/.claude/keybindings.json` — the only place Claude Code takes them
from. **`/synaptik config` edits that file**: it reads what is bound, offers
presets and a custom key, shows exactly what it will add and which of Claude
Code's own keys a choice gives up, and **writes only when the person confirms**.
Never silently (D32, P1 as revised).

| Setting | Context → action | Choices |
|---|---|---|
| Entering the navigator | `Chat` → `abovePrompt:focus` | `ctrl+x tab` (default) · `ctrl+s` · custom |
| Choosing a verb | `Pane` → `abovePrompt:previous` / `:next` | Tab / ⇧Tab (default) · ← / → · custom |

- **Custom** is captured by a `Client` region: click it, press the key. That
  needs the mouse, so **fullscreen only**; classic offers the presets. Keys
  Claude Code handles itself never reach a plugin (`ctrl+c`, `ctrl+x` — the first
  half of its chords), so `ctrl+x tab` is a preset, never a capture. One press,
  not a sequence. **Revised 2026-10-21: removed — presets only.** Built in #71,
  then taken out: a mouse click to capture a key is poor UX for a keyboard tool.
  A key bound by hand still shows as its own option. Custom keys are a feature
  request (#80), with the findings and keyboard-only alternatives (a typed key
  name, a longer preset list).
- **The menu is a mode of the navigator pane** — one tab; Esc returns to the
  navigator. (A second pane showed as a second tab.)
- **Keys are not `userConfig` options.** Claude Code obeys only the file; a copy
  in `userConfig` would have to be written into the file on reload, unseen, and
  would drift from hand edits. One store: the file.

**`userConfig` holds behaviour options**, as `/config` rows: changing one reloads
the mod with the new value (`register(on, options)`), which closes its panes —
so the key menu, which writes the file, does not edit them. Only one now: **marks
after review**, keep (default) or only while reviewing (D35). Others wait for a
real need (E10). No colours for now.

**Consequence:** `SECURITY.md` must say the mod can write `keybindings.json`, and
only after confirmation — updated with the change that builds the menu.

**Revised 2026-10-27 (D41, #113):** the key setup is **classic's**. Fullscreen
needs none: a click, or `ctrl+x tab` into the band, where ←/→ are bound by
default. The `ctrl+s` entry option goes (it gives up the prompt stash); the
←/→ preset for the pane stays.
**Done 2026-10-28 (#113):** the key setup is the default renderer's, with one
setting, *Move between actions*. The key that opens Synaptik is no longer
Synaptik's to set: `ctrl+x tab` is Claude Code's, and a key the person bound —
`ctrl+s` from the earlier menu included — stays theirs, untouched. In fullscreen,
`/synaptik config` opens nothing and says it is for the default renderer, using
Claude Code's own name for the non-fullscreen renderer.

---

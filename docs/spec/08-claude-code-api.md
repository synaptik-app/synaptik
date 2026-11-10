# The Claude Code mods API

What Synaptik relies on from the mods API, the limits found, and what is still
open. **The installed version's types are the authority**
(`.claude-plugin/types/claude-code/index.d.ts`, written when a session loads the
mod) — over this file and over the published docs, which lag.

Requires Claude Code **v2.1.301+**, in the terminal (D40): the fullscreen review watches the prompt box with `prompt.change` (2.1.300), and multi-line comments use `Input`'s `rows` (2.1.301, #16). `Raster` and `Image`
are terminal-only and unused; the mod draws with `Box`, `Text`, `Button`,
`Input` and `Markdown`.

---

## Hooks and calls in use

**Hooks:** the README's table, *The hooks it registers*, is the complete list, with
what each does. `ui.render` draws on `AssistantMessage` (the reply), `AbovePrompt`
(the band), `Pane` (the navigator and thread panes) and `TurnDuration` (to reveal
the end of a tall reply). No tool hooks (P3).

**Calls:**

| Call | For |
|---|---|
| `$.prompt.suggest` | the compiled prompt, as a suggestion in the empty box (D30) |
| `$.prompt.fill` | the full text, when a shortened suggestion is taken (D30) |
| `$.prompt.read` | whether the box holds text, for the discard warning (D24) |
| `$.session.messages`, `$.session.id` | the last reply, on start, resume and clear |
| `$.model.fork` | a thread's answers, summary and verdict (D14) |
| `$.ui.open`, `$.ui.close`, `$.ui.focus` | the navigator and thread panes |
| `$.ui.scroll` | bringing the reply into view, from the person's own keys |
| `$.ui.invalidate` | redrawing the reply, band and panes after a change |
| `$.ui.resolve` | the engine's own drawing, wrapped whole |
| `$.ui.toast` | short notices |
| `$.command.register` | `/synaptik` (D39) |
| `$.state` | the tray and review state, typed in `types/index.d.ts` |
| `$.clock.sleep` | the band hint's timer |

**Security note (relevant to corporate use):** mods are not sandboxed and run
with the user's full permissions. Administrators can set `allowManagedModsOnly`
to block user-installed mods.

---

## Known limits

| | |
|---|---|
| Hook execution | 10 s (time inside a mods API call does not count) |
| `Markdown` / `Text` text | 10,000 characters per element before Claude Code 2.1.304 (a longer one fails the whole render) — so a block is drawn in pieces (`chunk()`, each code piece fenced again). From 2.1.304, any length. One drawing holds 100,000 characters in all: a reply piece over 90,000 is left to Claude Code and reviewed from the navigator (`MAX_DRAWN`). The test kit doesn't enforce that bound, so the terminal's behaviour past it is unverified ⚠️ |
| `$.store` | 4 MiB of JSON, shared machine-wide |
| `ui.render` redraws | throttled to ~10–30/s, coalesced |
| Render hooks | may not write `$.state`; may call `$.ui.invalidate` |
| Docked pane | ~23 columns in practice; a request for 4 was not honoured |
| Unasked `$.ui.open` | waits undrawn below 144 columns (110 once opened by the person) |
| Module reload | closes the mod's panes (`ui.close`, origin `unload`) |
| `onScreen` | fullscreen only; per reply piece, not per element |
| `$.session.messages()` | the newest 4,096 entries |
| `autoFocus` | accepts only `true`, so focus is managed per render rather than by flipping a prop off |

---

## Answered questions

Answered by the spike on 2026-10-15, against the installed types, unless dated.

| # | Question | Answer |
|---|---|---|
| Q3 | Does `ui.press` see raw arrow keys? | **No.** Keys reach a mod only through a linear focus ring, or a `Client` that was clicked; ↑/↓ apart from ←/→ needs a pane's scroll (D20, D31). |
| Q6 | `$.model.fork` signature and context | One tool-less question over the session's own transcript, same model and system prompt, cached. Forks run in parallel; a thread costs about its own text (2.1.309, D45). |
| Q8 | The hook framework in depth | `on(event, matcher, hook)`, `.catch` for fail-to-vanilla, render hooks may not write state but may `$.ui.invalidate`, `$.state` contracts in `types/`. Chain order among mods follows load order (tested, D33). |
| Q10 | Can the `AssistantMessage` hook match Claude Code's markdown? | **Yes.** Compared on and off construct by construct (lists, nesting, table, code, blockquote): identical once the mod draws no column of its own and keeps the top margin. A `Box` background around `Markdown` paints behind the text. |
| Q11 | Is `prompt.suggest` a separate layer beside typed text? | **No** — it shows only in an empty box. Turned out not to matter (D30). |
| Q12 | Do mouse clicks work in the terminal? | **Yes**, on `Button`s and `Client`s drawn in a reply, in the fullscreen terminal. |

The full list, with the questions not numbered here, is the spike checklist
below.

---

## Spike findings — open items

Recorded 2026-10-15 from the spike (`spike/rendering`). Numbered for reference;
the numbers are not decision numbers.

### Design decisions to make

1. **Navigation model — decided: A, a pane in both renderers** (#19, D20). Classic
   design settled (#31); fullscreen design to finish (#39).
2. **The pane is shared space.** With other mods, panes become tabs; check how
   the navigator reads as one tab among several.
3. **Navigator not on screen** (narrow terminal, closed, after a reload): the band
   offers `ctrl+s, then ⏎`. Edge case, design deferred; below 110 columns the
   pane opens inline, where a vertical map does not fit.
4. **Surfaces where `$.prompt.suggest` always returns `isShown: false`** (from the
   published docs; surface unconfirmed). Needs a fallback — `s` to send, or a
   copy into the box — and the band should switch to it automatically.
5. **Placeholder wording** for an emptied suggestion, and the band wording overall
   ("respond in place"), are provisional.
6. **What the band says once a taken suggestion is edited.** Today: the discard
   warning, which is no longer accurate. Escalated.
7. **Whether to veto Claude Code's own suggestions** (a `prompt.suggest` hook
   answering `{ isShown: false }`) while feedback is staged. Would be interference
   with Claude Code's behaviour — decide deliberately. Seen in use 2026-10-17: a
   one-line suggestion stood where the multi-line compiled prompt was expected,
   most likely Claude Code's own after-turn suggestion replacing ours.

### Limits found

8. **The docked pane is ~23 columns**; a request for 4 was not honoured, and no
   way to go narrower was found. **Kept pane sizes are global**: Claude Code keeps
   one dock width and one inline height for all mods' panes, across sessions
   (`pluginPanes.dockColumns` / `inlineRows` in `~/.claude.json`), set by any
   resize; they override a mod's request. Clearing those keys resets them.
9. **The transcript scrolls to whole rows, never to a block**:
   `$.ui.scroll({ to: { key } })` does not find elements inside a transcript
   message, and a reply taller than the window always lands on its top. Worked
   around 2026-10-17: review starts on the last block; the reply's top is
   revealed on entering the first third, its end on entering the last third (by
   scrolling the turn-duration row after it to the window's bottom); the middle
   is scrolled by hand.
10. **Key bindings cannot ship with the mod** (D32). Candidate: `/synaptik
    configure` — settled by D38.
11. **Engine-written rows are recognised by text** (`No response requested.`).
12. **A reply split around tool calls** arrives as several `AssistantMessage`
    pieces, and the transcript holds them as separate messages. Adopting only the
    last message left text before a tool call unmarkable (confirmed 2026-10-17).
    **Fixed 2026-10-17:** the spike adopts the whole turn — every assistant row
    with text since the last prompt, tool results skipped (`src/spike-turn.ts`,
    tested) — and numbers blocks across its pieces. Phase 1 keeps both.
13. **The mod cannot see how Claude Code wraps Markdown**, so nothing it draws can
    be guaranteed to line up with the reply's on-screen lines. Nor can it adjust
    Claude Code's drawing: a render hook's `next(e)` returns an **opaque handle**
    (`{ type: 'engine', ref }`), to place or wrap whole, never to edit. Changing
    part of a reply means redrawing all of it, Claude Code's frame (left margin,
    `⏺` bullet) included — copied by the mod, so it can drift if Claude Code
    changes it. Upstream request: #23.
14. **Esc raises no `ui.focus`**; the navigator's own `isFocused` prop is the
    reliable signal. **An `Input` keeps typed text** across redraws under the
    same key and value — each opening needs a fresh key.

### To test

15. **Coexistence with other mods** — tested 2026-10-17 with the bench's
    `neighbour-mod` (#12). Panes: tabs, both work. **Band:** now composed with
    `next(e)` outside review, alone while reviewing; Synaptik's lines sit under a
    `Synaptik ·` header. An engine node under a `Box` with `width` is refused
    (undocumented). Another mod's band button adds a stop before the navigator for
    the entry key. **Reply: one mod redraws it** — whichever is higher in the chain
    wins; a mod beneath Synaptik keeps its drawing only on replies Synaptik passes
    through. **Suggestion:** the last proposed wins; Synaptik re-proposes when the
    navigator takes the keyboard (its `ui.focus` with origin `plugin` — the
    pane's own redraws miss a round trip through another mod's tab, since a
    hidden pane is not redrawn) and when it is left. **Chain order follows
    `--plugin-dir` order**; a greedy mod above Synaptik takes its in-place view
    but not the navigator. Decisions in D33.
16. **Following terminal scrolling — dropped for now** (2026-10-15). Estimating
    on-screen blocks from `onScreen` was never steady. If it returns: an honest
    coarse indicator (reply above / below / in view, or a thumb from
    `first`/`last`/`of`), a navigator that scrolls with the terminal, or the
    upstream request below. **Superseded by D37** (2026-10-20): measured again,
    the estimate was exact and `onScreen` updates per wheel tick, but following
    the scrolling was decided against. The tall-reply middle is #64.

### Extension points noted

- **Navigation inside tables** — rows, possibly cells, as blocks of their own. Rows
  done by stepping in (D44); cells not.

### To ask upstream

- Plugin-declared actions with default chords, as `userConfig` declares options
  (removes D32's gap).
- `$.ui.scroll` to an element inside a transcript message, by key.
- A way for a plugin to withdraw its own prompt suggestion.
- `onScreen`, or a row measurement, per element rather than per message.
- A narrower floor for a docked pane, or a reason it is ~23 columns.
- A flag on `SessionMessage` for engine-written rows.

---

## 15. Spike checklist

Answered by the spike on Claude Code 2.1.287 (macOS, fullscreen terminal).

- [x] **Markdown fidelity.** Compared on and off on a reply with a numbered
      list, nested items, a table, a code block and a blockquote (2026-10-17):
      identical, numbering kept (`1. 2. 3.`). The only differences were the
      mod's own column and a lost top margin, both fixed.
- [x] **Background behind block text.** `Box` takes `backgroundColor`;
      `Markdown` does not. A 1-cell `Box` with a background beside the block
      stretches to its height — the accent bar.
- [x] **Raw arrow keys.** No. `ui.press` fires only for `Button`s; keys reach a
      mod only through a focus ring (band, panes), which is linear. ↑/↓ apart
      from ←/→ needs a pane's scroll (§10).
- [x] **Mouse.** Buttons drawn in a reply are clickable in the fullscreen
      terminal.
- [x] **`$.prompt.read()`** returns the box's text and cursor.
- [x] **`$.model.fork`** — from the types: one tool-less question over the
      session's transcript, cached; concurrency unknown. Not exercised. ⚠️
- [x] **Entry key.** `abovePrompt:focus` (`ctrl+x tab` by default); a person can
      bind a single chord. Tested on macOS only; Linux unchecked. ⚠️
- [x] **Sibling `src/` imports** resolve from a hooks module inside the plugin
      root.
- [x] **`claude plugin test`** runs `src/*.test.ts` with no session and no mock
      `$`.

Found along the way, not on the original list:

- `AssistantMessage` fires per text block of a reply, not per reply.
- Esc raises no `ui.focus`; a pane's `isFocused` prop is the reliable signal.
- An `Input` keeps typed text across redraws under the same key and value.
- `$.prompt.suggest` shows multi-line text; its first cell sits under the
  cursor; it cannot be withdrawn.
- `$.ui.scroll` cannot target a transcript element by key.
- Resuming appends a synthetic `No response requested.` assistant row.

Read the types Claude Code writes for your build —
`.claude-plugin/types/claude-code/index.d.ts` after loading any mod with
`--plugin-dir`. **Trust those over the published docs.**

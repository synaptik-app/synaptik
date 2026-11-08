# The Claude Code mods API

## 6. Open questions

To verify against the build's own TypeScript declarations
(`.claude-plugin/types/claude-code/index.d.ts`, written per installed version)
rather than the published docs.

| # | Question | Answer (spike, 2026-10-15) |
|---|---|---|
| Q3 | Does `ui.press` see raw arrow keys? | **No.** Keys reach a mod only through a linear focus ring; ↑/↓ apart from ←/→ needs a pane's scroll. See D20's revision. |
| Q6 | `$.model.fork` signature and context | From the types: one tool-less question over the session's own transcript, same model and system prompt, cached. Concurrency unknown. Not exercised. |
| Q8 | The hook framework in depth | Learned in use: `on(event, matcher, hook)`, `.catch` for fail-to-vanilla, render hooks may not write state but may `$.ui.invalidate`, `$.state` contracts in `types/`. Chain order among several mods untested (§11, item 15). |
| Q9 | Is `$.model.classify` cheap enough per thread turn? | Open — E6 only. |
| Q10 | Can the `AssistantMessage` hook match Claude Code's markdown? | **Yes.** Compared on and off construct by construct (lists, nesting, table, code, blockquote): identical once the mod draws no column of its own and keeps the top margin. A `Box` background around `Markdown` paints behind the text. |
| Q11 | Is `prompt.suggest` a separate layer beside typed text? | **No** — it shows only in an empty box. Turned out not to matter: D30. |
| Q12 | Do mouse clicks work in the terminal? | **Yes**, on `Button`s drawn in a reply, in the fullscreen terminal. |

*Q1, Q2, Q4, Q5 retired or moved into §5 with their features. Q7 resolved —
discard with warning, see D24.*

**`SPEC.md` §15** holds the full spike checklist, with the questions not numbered
here. New open questions are in §11.

---

## 7. Framework primitives in use

| Primitive | Role | MVP? |
|---|---|---|
| `ui.render` on `AssistantMessage` | Redraw the reply with the accent bar, marks, menu and comments | Yes |
| `ui.render` on `AbovePrompt` | Band: summary, discard warning, action line | Yes |
| `ui.render` on `Pane` | The navigator (D31), later threads | Yes |
| `ui.scroll` on the pane | ↑/↓ as block moves (D20 revision) | Yes |
| `ui.focus` on the pane | Keep the ring on the verbs | Yes |
| `ui.close` | Know whether the navigator is on screen | Yes |
| `Button.onPress`, `Input.onInput/onSubmit` | Verbs, comments — closures, no `ui.press`/`ui.input` hooks needed | Yes |
| `$.prompt.read()` | Tell whether the box has text, for the discard warning (D24) | Yes |
| `turn.start` / `turn.complete` | Marking off during a turn; adopt the new reply | Yes |
| `session.start` + `$.session.messages()` | Adopt the last reply on resume | Yes |
| `$.prompt.suggest` | Send by suggestion (D30) | Yes |
| `$.prompt.submit({ asUser: true })` | Direct send, `s` in the navigator | Yes |
| `$.env.get` + `$.fs.read` | Read the person's entry-key binding (D32) | Yes |
| `$.ui.scroll` | Bring the reply into view (whole reply only) | Yes |
| `$.model.fork` | Thread conversations and the commit summary | Phase 2 |
| `$.prompt.fill` | Puts the full text in the box when a shortened suggestion is taken (D30, revision 2026-10-31) | Yes |
| `$.store` | Thread persistence within the session | Phase 2 |
| `tool.call` | E5, E12 | No |
| `session.append` | E13 | No |
| `$.model.classify` | E6 | No |
| `$.tool.register` | E14 | No |
| `$.session.send` / `session.receive` | E4 | No |
| `prompt.compose` | E9 | No |

**Known limits:** `Markdown` and `Code` elements cap at 10,000 characters — long
responses need chunking regardless, which suits per-block rendering. Hook
execution: 10s. `$.model.complete`: 1024 max tokens by default, raisable to
64,000. `$.session.messages()`: newest 4,096 entries.

**Security note (relevant to corporate use):** mods are not sandboxed and run
with the user's full permissions. Administrators can set `allowManagedModsOnly`
to block user-installed mods.

## 11. Spike findings — open items

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

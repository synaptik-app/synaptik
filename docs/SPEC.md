# Synaptik — Build Spec

**What it is:** mark up an agent's last response in place — accept, reject,
comment, discuss — and turn those marks into one prompt.

**This spec covers the Claude Code host**, the only one that exists. Sections
2–5 and 9 describe host-neutral behaviour; 6, 7, 10 and 11 are Claude Code
specifics. See §14 for how a second host would fit.

**Status:** spike done (branch `spike/rendering`, Claude Code 2.1.287). §15 holds
its answers; §6, §7, §10 and §11 describe what it showed works. Anything still
marked ⚠️ is unverified. Open design questions are listed in `DECISIONS.md` §11.

> **For the rationale** behind anything here — why Run was cut, why there are no
> block IDs, what was parked — see `DECISIONS.md`. This file says only what to
> build. If the two disagree, this file is wrong; fix it.

---

## 1. The loop

```
Claude replies
  → ctrl+s, then ↑↓ to a block, ←→ and ⏎ to accept / reject / comment / discuss
  → marks accumulate in a tray
  → the prompt box shows the prompt they compile into, as a dim suggestion
  → tab takes it, ⏎ sends it
```

Nothing reaches the agent until you send, and what it receives is text you saw
first. The mod never interferes with the prompt/response flow: it adds no
markers or IDs, and never writes the box, submits, or holds a turn on its own.

---

## 2. Scope

**Only the last assistant message is interactive, and only after its turn
completes.** Marking is off from `turn.start` until `turn.complete`: the reply
and the band draw as vanilla Claude Code while a turn runs, since the reply that
is coming will replace the tray anyway (§5).

**A resumed session is markable at once.** On `session.start` the mod reads the
transcript (`$.session.messages()`) and adopts its last assistant reply. A
resume ends the transcript with an engine-written `No response requested.`
row, which is skipped.

⚠️ That row is recognised by its text: `SessionMessage` carries no flag for rows
the engine writes itself.

Older messages are inert. Nothing is persisted across sessions.

---

## 3. Blocks

The message text is split into blocks at render time. Marks are keyed by
**position** — no IDs are stored or shown.

| Element | A block? |
|---|---|
| Paragraph | yes |
| List item, including nested | yes — **flat**, each item separately |
| Fenced code block | yes |
| Table | yes |
| Blockquote | yes |
| Heading | **no** |
| List item spanning several paragraphs | yes, as **one** block |

**Every block accepts every verb.** No per-type restrictions.

Each block records its **parent index** (or none). Navigation is flat, but the
compiled prompt uses the parent to show nesting.

### Example

Given this response:

```markdown
Here's what I'd suggest:

1. Use Redis for the session cache
   - per-user key prefix
   - 5 minute TTL
2. Add a rate limiter

Run the migration before deploying.
```

Blocks:

| # | Text | Parent |
|---|---|---|
| 0 | `Here's what I'd suggest:` | — |
| 1 | `Use Redis for the session cache` | — |
| 2 | `per-user key prefix` | 1 |
| 3 | `5 minute TTL` | 1 |
| 4 | `Add a rate limiter` | — |
| 5 | `Run the migration before deploying.` | — |

---

## 4. Verbs

| Verb | Symbol | What it does |
|---|---|---|
| Accept | `✓` | stages a mark |
| Reject | `✗` | stages a mark |
| Comment | `✎` | opens an inline input; stages mark + text |
| Discuss | `💬` | opens a thread pane (see §8) |

**Verbs are idempotent entry points.** Pressing one again resumes rather than
duplicating:

- Accept on an already-accepted block → **unmarks** it
- Comment on a commented block → reopens the input **pre-filled**
- Discuss on a threaded block → reopens **that** thread with its history

**One mark and one thread per block, maximum.**

---

## 5. Tray state

The mod's own state. The prompt is generated from it; nothing is accumulated as
text along the way.

```ts
type Mark = 'accept' | 'reject' | 'comment'

type BlockState = {
  mark?: Mark
  commentText?: string        // kept even when the mark is cleared
  thread?: {
    messages: { role: 'user' | 'assistant'; text: string }[]
    included: boolean         // false = will not be sent
    summary?: string          // written by the model on include; editable
  }
}

// keyed by block index within the current message
type Tray = Map<number, BlockState>
```

### Rules

| Action | Effect |
|---|---|
| New mark on a marked block | **overwrites.** One slot, last write wins. |
| Same verb twice | unmarks |
| `Backspace` on a block | clears it: mark removed, thread set to `included: false` |
| Clear-all | empties the tray |
| Mark **and** included thread on one block | both are sent; the agent reconciles |

**Clearing unstages, it never destroys.** A cleared thread keeps its `messages`
and can be re-included. A cleared comment keeps its `commentText`.

**The tray clears after sending.**

**The tray is discarded when a new assistant message arrives** (see §7 for the
warning).

---

## 6. Rendering the message

Hook: `ui.render` with `{ component: 'AssistantMessage' }`. It fires **once per
text block of a reply** — a reply interleaved with tool calls arrives as several
pieces. `e.props.text` is the piece's markdown; `e.requestId` is its message id.
A rewrite changes the drawing only; the stored message is untouched.

Each piece works out where its blocks start in the whole reply, so block
numbering runs across pieces.

Each block renders as a row: a 1-cell column, the mark glyph, then the block as
`Markdown`.

- **Selected block:** the column is a `Box` of width 1 with an accent
  `backgroundColor`. It stretches to the block's full height, so the whole block
  carries a solid bar.
- **Other blocks:** the column is empty. Only their mark glyph, if any, shows.
- **Under the selected block:** the verb menu, tied to the bar with an accent
  `└`. The verb under the keyboard cursor (§10) draws as the primary button, the
  others dim. With the navigator unfocused, nothing is highlighted.
- **Under a commented block:** `→ comment text`, dim. While the comment is being
  typed, the text appears here live with a `▏` cursor.

### Example render

```
  Here's what I'd suggest:

▌ ✓ Use Redis for the session cache
 └ [✓ accept] [✗ reject] [✎ comment] [💬 discuss]
      per-user key prefix
  ✗   5 minute TTL
  ✎ Add a rate limiter
    → make it 5 req/sec
    Run the migration before deploying.
```

Menu buttons are **mouse-clickable** in the fullscreen terminal. The reply
itself **never takes keyboard focus** — a transcript message has no focus ring —
so every keyboard path goes through the navigator (§10).

The mod cannot measure how Claude Code wraps Markdown, so nothing it draws
elsewhere can be guaranteed to line up with the reply's on-screen lines.

---

## 7. The band

Hook: `ui.render` with `{ component: 'AbovePrompt' }`. One instance, drawn to
`e.props.bodyColumns`. **Read-only**: it holds no focusable element, so the
entry key goes past it to the navigator (§10).

The band never names a component ("pane", "band") or uses jargon ("marks"). It
says what you can do now. Up to two lines, the last one sitting just above the
prompt:

| Line | Shows |
|---|---|
| Summary *(only when something is staged)* | `2 accepted · 1 rejected · 1 comment` |
| Action *(always)* | what the keys do right now |

The action line:

| State | Text |
|---|---|
| Not in the navigator, nothing staged | `Synaptik · ctrl+s to respond in place` |
| Not in the navigator, something staged | `Synaptik · ctrl+s to continue responding` |
| Suggestion showing in the prompt box | `Synaptik · tab to take it into the prompt · ctrl+s to continue responding` |
| In the navigator | `Block 3 of 12 · ↑↓ move · ←→ choose · ⏎ apply · esc done` |

The key named is the person's own binding for `abovePrompt:focus` in the `Chat`
context, read from `~/.claude/keybindings.json` (a plain read; the mod never
writes it), or `ctrl+x tab` when there is none.

### Sending: a live suggestion

The compiled prompt (§9) is proposed in the **empty prompt box** with
`$.prompt.suggest`, the same dim text Claude Code uses for its own suggestions.
It is re-proposed after every change to the tray (a mark, an unmark, a comment
finishing). `→` or `Tab` takes it into the box, where it can be edited; `⏎`
sends it as the person's own message; `ctrl+c` clears it.

- The text is proposed with **a leading space**: the box draws its cursor over a
  suggestion's first cell, which would hide the first mark glyph.
- **A suggestion cannot be withdrawn**: there is no call for it, a blank one
  cannot show, and writing to the box does not dismiss it. When the last mark is
  cleared, the mod proposes a harmless placeholder instead — currently `Give me a
  sec to read through this.` (wording provisional).
- `s` in the navigator sends the compiled prompt directly, via
  `$.prompt.submit({ text, asUser: true })`. It is not advertised in the legend.

⚠️ On at least one surface `$.prompt.suggest` always resolves `isShown: false`,
keeping the box for Claude's own suggestions (from the published docs; which
surface is unconfirmed). There the band offers `s` instead.

**The tray clears after sending.**

### The discard warning

When something is staged **and** the prompt box holds text other than the taken
suggestion, the summary line turns yellow:

```
2 accepted · 1 comment staged · ⏎ sends only what you typed and drops them
```

When the box holds exactly the taken suggestion, the summary reads
`… · ⏎ sends your feedback` instead.

⚠️ Open: what to say when the person has taken the suggestion and edited it.

**The mod does not hook `prompt.submit`.** The box is read with
`$.prompt.read()` from the band's render hook, which redraws anyway.

---

## 8. Threads

A thread is a side conversation about one block. **It never touches the main
conversation.**

- Each message calls `$.model.fork`. `fork` is single-shot, so the mod re-sends
  the accumulated thread history on every call.
- A thread **never** calls `$.prompt.submit` — that is the only call that would
  write into the main conversation.
- Threads are flat. A thread cannot spawn a thread.
- `?` opens a thread pre-seeded with "explain this"; the discuss key opens an
  empty one.

### The pane

`$.ui.open`, then `ui.render` with `{ component: 'Pane' }`. Placement is the
surface's: docked beside a fullscreen transcript, inline above the prompt
otherwise.

```
┌─ Thread: "Use Redis for the session cache" ──┐
│ <anchor text, pinned>                         │
│                                               │
│ <exchange scrolls here>                       │
│                                               │
│ > <Input>                                     │
│ ○ excluded — <key> to include                 │
│ ⏎ send · Esc close                            │
└───────────────────────────────────────────────┘
```

**One pane at a time**, switching between threads. The band shows
`3 threads · 1 unread`.

### Include / exclude

**Threads are excluded by default** — most are read-only understanding with
nothing worth sending.

The include control is a **toggle showing state**, not a one-way button. On
include, the mod makes one more `fork` call:

> summarize what was decided here as an instruction to the main agent

The summary lands in the tray, **editable**. The mod never decides what matters;
the model summarizes and you approve.

Thread history persists within the session in `$.store` (4 MiB, shared by every
session on the machine — namespace your keys).

`$.model.fork({ prompt })` asks one tool-less question over the session's own
transcript as the main thread last sent it — same model, same system prompt,
served from the prompt cache. So a thread sees the main conversation for free and
re-sends only its own side exchange. It resolves `isAnswered: false` with a
`reason` rather than rejecting (`nothing-to-fork` before a session's first turn).

⚠️ Read from the types, not yet exercised. Whether two calls can be in flight at
once is still unknown; one focused pane sidesteps it.

The navigator (§10) is the natural home for the thread pane: same pane, a
different body while a thread is open.

---

## 9. Compile format

Walk blocks in **document order**. Emit a line for each block that has a mark, a
comment, or an included thread. Nest by parent. Quote roughly the first 6–8
words, ending in `...` (three plain dots) when cut.

**No header and no prose scaffolding.** Not "Re your last message", not "the
user approved step 3", not "the user asked to explain". The agent wrote this
message one turn ago; a short quote locates anything.

```
✓ "Use Redis for the session cache"
    ✓ "per-user key prefix"
    ✗ "5 minute TTL"
✎ "Add a rate limiter" → make it 5 req/sec
💬 "Run the migration" → do it after the backfill, not before
```

A comment with no text is never emitted.

Marks and thread summaries **interleave by position**, never grouped by type —
document order is the order you read it in and the order the agent wrote it.

A thread contributes **only its summary**. No mention that a discussion
happened, no transcript.

Accepting a parent while rejecting a child is normal refinement — the nesting
makes it readable. Rejecting a parent while accepting a child is contradictory;
send it anyway and let the agent sort it out.

---

## 10. Navigation

### Why a pane

Keyboard input reaches a mod only through a **focus ring**, and only two sites
have one: the band and panes. The reply never takes focus.

A focus ring is **linear**: Tab, ←/→ and ↑/↓ all mean "previous" or "next", and
`ui.focus` names only the element focus moves to, never the key. So inside the
band ↑ cannot be told from ←.

A pane can: there ↑/↓ are bound to **scrolling**, and `ui.scroll` carries a
signed direction (`by`). That is the only way to get ↑/↓ apart from ←/→.

### The navigator

A pane (id `synaptik-map`), opened when a reply is adopted. Its body:

```
▲ Your notes · ✓2 ✗1 ✎1
│
█ ✓ Use Redis for the se...
█   → keyed per user
┃
┃ ✗ 5 minute TTL
│
▼ Block 3 of 12
```

- One bar per block, its height proportional to the block's length.
- Bar glyph: `█` selected (accent), `┃` staged, `│` everything else (dim).
- Staged blocks show one row of their mark and opening words, sized to the
  pane's width less a 2-cell margin; a comment sits right under its block.
- Top row: `Your notes · <counts>` or `Nothing marked yet`. Bottom row: the
  position.

**The scroll trick.** The tree is always `bodyRows + 2` rows and its window is
pinned at offset 1, so ↑ and ↓ always have a row to scroll to. Each person scroll
moves the selection by its sign and the window back to offset 1.

**The verb ring.** The four verbs and `send` are drawn in the pane hidden
(`display: none`); they still take focus and arm their hotkeys. A `ui.focus` hook
lets the ring stop on verbs and the comment field only. The menu under the
selected block in the reply shows which verb holds the ring.

**Comments** are typed into a hidden `Input` in the pane; the text shows under
the block in the reply as it is typed. Each opening of the field gets a fresh
`key` — a field redrawn under the same key and value keeps what was typed last
time. Leaving the field finishes the comment: with text it is staged, empty it is
dropped. `⏎` or backspace on an empty line cancels it.

### Keys

| Key | Default (no setup) | With the recommended bindings |
|---|---|---|
| Enter the navigator | `ctrl+x tab` (`abovePrompt:focus`) | a single chord, e.g. `ctrl+s` |
| Move between blocks | ↑ / ↓ | same |
| Walk the verbs | Tab / ⇧Tab | ← / → |
| Apply the verb under the cursor | ⏎ | same |
| Apply a verb directly | `a` `x` `c` `d` | same |
| Leave | Esc | same |
| Resize the docked pane | `ctrl+x ←` / `ctrl+x →` | conflicts with ←/→ above |

**A mod cannot ship key bindings.** Every improvement on the default column is
the person's own `~/.claude/keybindings.json`:

```json
{ "context": "Chat", "bindings": { "ctrl+s": "abovePrompt:focus" } },
{ "context": "Pane", "bindings": { "left": "abovePrompt:previous", "right": "abovePrompt:next" } }
```

`ctrl+s` is Claude Code's default for `chat:stash`; binding it gives that up. The
`Pane` arrows apply to every mod's pane.

Esc raises no `ui.focus` event, so whether the navigator holds the keyboard is
read from its own drawing (`e.props.isFocused`) and passed to the band and reply
with a redraw.

### Following the selection in the transcript

`$.ui.scroll({ to: { key } })` does not find elements drawn inside a transcript
message, so the transcript can only be scrolled to the **whole reply**
(`to: { requestId }`), which counts as the person's input when a navigator key
caused it.

The navigator does not follow the terminal's own scrolling. Estimating which
blocks are on screen from `e.props.onScreen` was tried and dropped: the mod
cannot measure how the reply wraps, and the estimate was never steady.

### Opening the navigator

A pane opened unasked waits undrawn below 144 terminal columns (110 for an id the
person has opened before), and a module reload closes it. When it is not on
screen, the band's action line becomes a button — `ctrl+s, then ⏎ to respond in
place` — since an open answering the person's press is placed at any width.

⚠️ This case is an edge case with its design deferred, as is the navigator's
inline layout below 110 columns, where a vertical map does not fit.

---

## 11. Hooks registered

**No tool hooks.** The mod cannot interfere with the agent's operation — it
draws, and it proposes text for the prompt box.

| Hook | Matcher | Purpose |
|---|---|---|
| `session.start` | — | register the kill switch, read the entry key, adopt the last reply |
| `turn.start` | — | marking off while a turn runs |
| `turn.complete` | — | adopt the new reply, marking on |
| `ui.render` | `{ component: 'AssistantMessage' }` | bar, marks, menu, comments |
| `ui.render` | `{ component: 'AbovePrompt' }` | summary and action line |
| `ui.render` | `{ component: 'Pane', requestId }` | the navigator |
| `ui.scroll` | `{ component: 'Pane', requestId }` | ↑/↓ → block moves |
| `ui.focus` | `{ component: 'Pane', requestId }` | keep the ring on the verbs |
| `ui.close` | `{ id }` | track whether the navigator is on screen |

`ui.press` and `ui.input` need no hooks: a Button's `onPress` and an Input's
`onInput` / `onSubmit` run as closures.

API calls used: `$.session.messages`, `$.ui.resolve`, `$.ui.invalidate`,
`$.ui.open`, `$.ui.scroll`, `$.ui.focus`, `$.ui.toast`, `$.prompt.read`,
`$.prompt.suggest`, `$.prompt.submit`, `$.command.register`, `$.env.get`,
`$.fs.read`, `$.state`; phase 2 adds `$.model.fork` and `$.store`.

Elements used: `Box`, `Text`, `Button`, `Input`, `Markdown`.

**State** a drawing reads lives in `$.state` (declared in the plugin's
`types/index.d.ts` contract). A render hook may not write state; facts only a
drawing learns (`isFocused`, `onScreen`) go into module variables and a
`$.ui.invalidate('ui.render')`, which a render hook may call.

⚠️ The band hook answers without calling `next(e)`, so a mod beneath it in the
chain may lose its band. Untested with other mods enabled.

---

## 12. Must-hold properties

**Fail to vanilla.** A hook that throws or exceeds its 10-second budget is
skipped. Give every registration `.catch(handler)` returning `next(e)`, so a
failure leaves **plain Claude Code rendering** — never a half-drawn transcript.

**Hold no state the conversation depends on.** Blocks are derived at render time;
nothing is stored in the conversation. Disabling mid-flow costs only the tray.
Check every future feature against this.

**Ship a kill switch.** A key or `/command` that makes the render hooks pass
through while the session continues. The failure you will actually hit while
developing is rendering being *wrong*, not throwing — and restarting a session to
escape it is painful mid-task. The spike's is `/synaptik`; a slash command's
output row is read by the model, which P1 (as revised) allows.

**Never interfere with the prompt/response flow.** The mod proposes and draws; it
never writes the prompt box behind the person's back, never submits on its own,
and never blocks or rewrites a turn.

**Keep the logic free of `$.` calls.** Segmentation, tray state and the compile
step are plain functions over text and data, living in `src/` with the hooks as a
thin shell over them. No `$`, no event objects, no element trees in any `src/`
signature. See §14 — this is what makes the logic testable without a session,
and what a second host would build on.

---

## 13. Build order

| | What | Done when |
|---|---|---|
| **Spike** ✅ | throwaway mod on the real last reply: marks, navigator, band, suggestion | §15 answered; branch `spike/rendering` |
| **Phase 1** | real segmentation, accept / reject / comment, tray, band, submit. **No threads.** | usable daily |
| **Phase 2** | threads, commit toggle, summary | §8 works |

**The spike is throwaway code.** Write it to answer questions, then delete it.
Rendering comes first because §6's uncertainty is the only thing that could
still change the design — discovering it after building the state machinery
would be expensive.

**Phase 1 is the real test.** If marking without threads does not change how the
work feels, phase 2 will not save it.

---

## 14. Repo layout

```
synaptik/
├── docs/
│   ├── SPEC.md                    this file
│   └── DECISIONS.md               rationale and history
├── hosts/
│   └── claude-code/
│       ├── .claude-plugin/
│       │   └── plugin.json        manifest
│       ├── hooks/
│       │   ├── hooks.json         { "modules": ["./register.tsx"] }
│       │   └── register.tsx       exports register(on, options); JSX against h
│       ├── types/
│       │   └── index.d.ts         $.state contract, named in plugin.json
│       └── src/
│           ├── blocks.ts          text → Block[]
│           ├── tray.ts            state + transitions
│           ├── compile.ts         Tray + Block[] → string
│           └── *.test.ts
└── CLAUDE.md
```

### Extensibility, without the abstraction

Another terminal agent may one day offer a UI-extension framework. **Do not
build for it yet** — an abstraction designed against an unknown API is usually
the wrong one. Two things make a second host cheap, and both are free today:

**1. `docs/SPEC.md` is the portable artifact, not the code.** Other agents are
written in other languages (Codex's CLI is Rust), so a shared TypeScript core
would be worth nothing to them. A second host reimplements this spec in its own
language. Sections 2–5 and 9 are host-neutral behaviour; 6, 7, 10 and 11 are
Claude Code specifics.

**2. `src/` never mentions a host type.** Its functions take and return plain
data — strings, arrays, the `Tray` map. No `$`, no event objects, no element
trees in any signature. `register.ts` depends on `src/`; never the reverse.

**The test for whether this has held:** `claude plugin test` runs everything in
`src/` with no session. **If a test needs a mock `$`, the separation has
leaked.**

Deliberately **not** done now: interfaces with one implementor, an abstract
renderer, a host-adapter layer. When `hosts/codex/` exists, lift the shared part
out then — by which point the real boundary will be known rather than guessed.

### Commands

```bash
claude --plugin-dir ./hosts/claude-code    # load for one session; reloads on save
claude plugin validate ./hosts/claude-code # list hooks and API calls without running
claude plugin test ./hosts/claude-code     # run *.test.ts with no session
```

⚠️ `--plugin-dir` makes `hosts/claude-code/` the plugin root, so `register.ts`
importing from `./src/` stays inside it. Keep it that way — imports *above* the
plugin root may not resolve, which is the reason `src/` lives under the host
rather than at the top level.

Requires Claude Code **v2.1.287+** in the terminal, **v2.1.286+** in the Desktop
Code tab. The mod draws in both; `Raster` and `Image` are terminal-only and
`Svg` is Desktop-only, so neither is used here.

### Known limits

| | |
|---|---|
| Hook execution | 10 s (time inside a mods API call does not count) |
| `Markdown` / `Code` text | 10,000 characters — chunk per block |
| `$.store` | 4 MiB of JSON, shared machine-wide |
| `ui.render` redraws | throttled to ~10–30/s, coalesced |
| Render hooks | may not write `$.state`; may call `$.ui.invalidate` |
| Docked pane | ~23 columns in practice; a request for 4 was not honoured |
| Unasked `$.ui.open` | waits undrawn below 144 columns (110 once opened by the person) |
| Module reload | closes the mod's panes (`ui.close`, origin `unload`) |
| `onScreen` | fullscreen only; per reply piece, not per element |

---

## 15. Spike checklist

Answered by the spike on Claude Code 2.1.287 (macOS, fullscreen terminal).

- [x] **Markdown fidelity.** Per-block `Markdown` was used throughout testing
      with no regression reported. Not compared side by side for every
      construct; list numbering restarting per item is unchecked. ⚠️
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

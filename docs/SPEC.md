# Synaptik — Build Spec

**What it is:** mark up an agent's last response in place — accept, reject,
comment, discuss — and turn those marks into one prompt.

**This spec covers the Claude Code host**, the only one that exists. Sections
2–5 and 9 describe host-neutral behaviour; 6, 7, 10 and 11 are Claude Code
specifics. See §14 for how a second host would fit.

**Status:** pre-implementation. Everything marked ⚠️ is unverified against the
mods API and must be checked in the spike before it is relied on.

> **For the rationale** behind anything here — why Run was cut, why there are no
> block IDs, what was parked — see `DECISIONS.md`. This file says only what to
> build. If the two disagree, this file is wrong; fix it.

---

## 1. The loop

```
Claude replies
  → you arrow to a block, press accept / reject / comment / discuss
  → marks accumulate in a tray
  → the band above the prompt shows the prompt they compile into
  → one key sends it
```

Nothing reaches the agent until you send. The agent never learns the mod exists:
no markers, no IDs, no attribution.

---

## 2. Scope

**Only the last assistant message is interactive, and only after its turn
completes.** Marking is off while text is streaming.

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

Hook: `ui.render` with `{ component: 'AssistantMessage' }`. `e.props` carries
the reply's text; `e.requestId` is the message id.

Each block renders as a `Box` with a one-character gutter column, then the text.

- Selected block: bright `▎`
- Other blocks: dim `▏`
- Mark symbol sits beside the gutter when present

**The selected block also shows a row of `Button` elements.** This is the
primary interaction — hotkeys are secondary, for whoever learns them. `Button`
takes both `label` and `hotkey`.

### Example render

```
  Here's what I'd suggest:

▏ ✓ Use Redis for the session cache
▏     per-user key prefix
▎ ✗   5 minute TTL
      [✓ accept] [✗ reject] [✎ comment] [💬 discuss]
▏   Add a rate limiter
▏ ✎ Run the migration before deploying.
```

The control row moves with the selection, so **only one block's controls are on
screen at a time.**

Comment renders as an `Input` **in place under the block**, so the text being
commented on stays visible while typing.

Call `$.ui.invalidate('ui.render')` after any state change so the message
redraws.

⚠️ **Unverified and critical:** how much control this hook has over message text
— whether markdown renders as well as Claude Code's own, and whether a
background colour can paint behind it. `Markdown` has no background prop. **The
gutter works regardless** (it is the mod's own column); background highlighting
is a nice-to-have. Resolve in the spike.

---

## 7. The band

Hook: `ui.render` with `{ component: 'AbovePrompt' }`. One instance. Draw to
`e.props.bodyColumns`.

The band is **the source of truth for the outgoing prompt.** It shows the
compiled text, dim, regenerating as the tray changes.

### Two keys

| Key | Action |
|---|---|
| submit | sends the compiled prompt via `$.prompt.submit({ text, asUser: true })` |
| copy | writes it into the prompt box via `$.prompt.fill`, **overwriting** whatever is there |

`asUser: true` is **required** — the plain form prepends a sentence naming the
mod as sender.

**Overwrite on copy is correct.** Copying is an explicit keypress; the box is a
scratch copy, the band is authoritative. Edits in the box survive until you copy
again. There is no merge logic anywhere.

### The discard warning

When the tray is non-empty **and** the prompt box has text, the band says so —
loudly, in a different colour from its usual dim:

```
5 marks staged · ⏎ sends your text only — marks discarded · <key> to use marks instead
```

This is the only place in the mod where work can be lost; everything else is
reversible.

**The mod does not hook `prompt.submit`.** No interception, no double-Enter, no
dialog. Read the box with `$.prompt.read()` from the band's render hook — the
band redraws anyway, so this needs no extra registration.

⚠️ If `$.prompt.read()` does not serve, fall back to the `prompt.edit` event
(observe only; return `next(e)`).

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

`$.ui.open` with `placement: 'dock'`, then `ui.render` with
`{ component: 'Pane' }`.

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

⚠️ Unverified: `$.model.fork`'s exact signature, how much context it carries,
and whether two calls can be in flight at once. One focused pane sidesteps the
concurrency question.

---

## 9. Compile format

Walk blocks in **document order**. Emit a line for each block that has a mark, a
comment, or an included thread. Nest by parent. Quote roughly the first 6–8
words.

**No prose scaffolding.** Not "the user approved step 3", not "the user asked to
explain". The agent wrote this message one turn ago; a short quote locates
anything.

```
Re your last message:
✓ "Use Redis for the session cache"
    ✓ "per-user key prefix"
    ✗ "5 minute TTL"
✎ "Add a rate limiter" → make it 5 req/sec
💬 "Run the migration" → do it after the backfill, not before
```

Marks and thread summaries **interleave by position**, never grouped by type —
document order is the order you read it in and the order the agent wrote it.

A thread contributes **only its summary**. No mention that a discussion
happened, no transcript.

Accepting a parent while rejecting a child is normal refinement — the nesting
makes it readable. Rejecting a parent while accepting a child is contradictory;
send it anyway and let the agent sort it out.

---

## 10. Navigation

Modal. Enter navigation → arrows move between blocks → Esc backs out one level
per nesting depth (pane → selection → off).

**Entry key: undecided.**

- ❌ `Cmd+S` — macOS terminals usually swallow Cmd before it reaches the TUI, and
  Cmd does not exist in Linux or Windows terminals
- ❌ `Ctrl+S` — classic terminal XOFF; some terminals still freeze output
- ✅ candidates: a plain unmodified key while the prompt box is empty; `Ctrl+G`;
  Esc-prefixed; or `Button`'s `action` prop, which fires on one of Claude Code's
  own keybindings

Visible controls make the mode self-evident once entered, so this matters less
than it first appears. Settle it in the spike.

⚠️ Unverified: whether `ui.press` receives raw arrow keys or only bound
keybinding actions. Also whether `Box`'s `hover` prop means **mouse clicks work
in the terminal** — if so, discoverability comes free.

---

## 11. Hooks registered

Four. **No tool hooks.** The mod cannot interfere with the agent's operation.

| Hook | Matcher | Purpose |
|---|---|---|
| `ui.render` | `{ component: 'AssistantMessage' }` | gutter, marks, controls |
| `ui.render` | `{ component: 'AbovePrompt' }` | band: preview, status, warning |
| `ui.render` | `{ component: 'Pane' }` | thread pane |
| `ui.press` / `ui.input` | — | buttons, comment input, navigation |
| `turn.complete` | — | open marking once the message is final |

API calls used: `$.ui.resolve`, `$.ui.invalidate`, `$.ui.open`, `$.ui.close`,
`$.model.fork`, `$.prompt.read`, `$.prompt.fill`, `$.prompt.submit`, `$.store`.

Elements used: `Box`, `Text`, `Button`, `Input`, `Markdown`.

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
escape it is painful mid-task.

**Keep the logic free of `$.` calls.** Segmentation, tray state and the compile
step are plain functions over text and data, living in `src/` with the hooks as a
thin shell over them. No `$`, no event objects, no element trees in any `src/`
signature. See §14 — this is what makes the logic testable without a session,
and what a second host would build on.

---

## 13. Build order

| | What | Done when |
|---|---|---|
| **Spike** | throwaway mod drawing one hardcoded message with a gutter, fake marks and a selected row | the ⚠️ questions are answered and the look is judged |
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
│       │   ├── hooks.json         { "modules": ["./register.ts"] }
│       │   └── register.ts        exports register(on, options)
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

---

## 15. Spike checklist

Answer all of these before phase 1:

- [ ] Can a `ui.render` hook on `AssistantMessage` render markdown as well as
      Claude Code does? (**Highest risk** — a worse transcript on *every*
      response is a regression the gutter does not pay for.)
- [ ] Can a background colour paint behind block text?
- [ ] Does `ui.press` receive raw arrow keys, or only bound keybinding actions?
- [ ] Does `Box`'s `hover` prop mean mouse clicks work in the terminal?
- [ ] Does `$.prompt.read()` return the box's current text?
- [ ] `$.model.fork` signature: context carried, concurrency allowed?
- [ ] Does the chosen entry key reach the TUI on macOS **and** Linux?
- [ ] Does a hooks module resolve imports from a sibling `src/` directory inside
      the plugin root? (If not: bundle step, or move the modules next to
      `register.ts`.)
- [ ] Does `claude plugin test` run `src/*.test.ts` without a session?

Read the types Claude Code writes for your build —
`.claude-plugin/types/claude-code/index.d.ts` after loading any mod with
`--plugin-dir`. **Trust those over the published docs.**

Worth reading first: the built-in [`diff`
mod](https://github.com/anthropics/claude-code/tree/main/mods/diff) (a pane with
buttons bound to keyboard actions and scrolling it handles itself) and the
[`token-weather`
sample](https://github.com/anthropics/claude-code-playground/tree/main/claude-code/mods/token-weather)
(draws in the band).

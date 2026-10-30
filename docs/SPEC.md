# Synaptik — Build Spec

**What it is:** review an agent's last reply in place — accept, reject,
comment, discuss — and turn that review into one prompt.

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
  → ctrl+x tab, then ↑↓ to a block, tab and ⏎ to accept / reject / comment / discuss
    (←→ in classic with the recommended binding, §10)
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

**The reply is the whole last turn**: every assistant message with text since
the last prompt, joined in order. A reply that runs a tool mid-way is stored as
several messages; all of them are markable. Tool results (stored as user rows)
and rows recorded after the turn (a slash command) are skipped.

**A resumed session is markable at once.** On `session.start` the mod reads the
transcript (`$.session.messages()`) and adopts its last turn. A resume ends the
transcript with an engine-written `No response requested.` row, which is
skipped.

⚠️ That row is recognised by its text: `SessionMessage` carries no flag for rows
the engine writes itself.

Older messages are inert. Nothing is persisted across sessions.

**Only Claude Code's terminal renderer** (`e.surface === 'terminal'`): any
terminal, IDE-integrated terminals, the JetBrains plugin, tmux, SSH. On the
Desktop app's Code tab and the mobile app — which have review features of their
own — and on every other surface, every hook passes through with `next(e)`
(D40). The VS Code panel is the next surface (#76).

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
| Horizontal rule (`---`) | **no** |
| List item spanning several paragraphs | yes, as **one** block |

**Every block accepts every verb.** No per-type restrictions.

Each block records its **parent index** (or none). Navigation is flat, but the
compiled prompt uses the parent to show nesting.

What belongs to a list item is what is indented past its marker:

- **Code, a table or a quote is always a block of its own**, wherever it sits.
  Inside a list item, it is a block under that item, so it can be marked
  separately and the compiled prompt sends the item as context above it.
- **A paragraph inside an item** is part of the item's block, when it follows
  the item directly. Back at the item's indent after a nested item or a code
  block, it is a block of its own under that item: it can't join the item's
  block without breaking reading order.
- **Nesting is by structure, not by spaces:** an item indented by 2, 3 or 4
  spaces under its parent is one level down. A nested block is drawn as Claude
  Code draws it, in by the parent marker's width plus a space: 2 under `-`, 3
  under `1.`.

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
| `Backspace` on a block ⚠️ | clears it: mark removed, thread set to `included: false`. **No key yet:** a mod's hotkey is one letter or digit, so Backspace can't be bound (#23); `clear` exists in `src/tray.ts` for when it can (#100). |
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

The mod draws the whole reply, so it redraws **Claude Code's frame** too: the
top margin, a 2-cell left margin, and the `⏺` bullet on the reply's first line
(first piece only). Each block is its `Markdown` beside that margin, lined up
exactly with the vanilla drawing. A marked block's glyph sits **in the margin**
(replacing the bullet on a marked first block), so marking moves nothing. Nested
items indent 3 cells per level.

Tried and dropped: a 4-cell gutter of the mod's own (a reply after a tool call
read as that tool's output); a glyph placed absolutely left of the reply (clipped);
no margin at all (text shifted 2 cells left of vanilla); and **wrapping Claude
Code's own drawing per block** — `next(e)` returns an opaque handle
(`{ type: 'engine', ref }`) with its spacing and margin baked in, so blocks drawn
one by one gained gaps and lost the margin. A mod that changes part of a reply
redraws all of it.

- **Selected block:** the `Box` around its `Markdown` gets the theme key
  `selectionBg` as `backgroundColor` — Claude Code's own text-selection colour,
  so it follows `/config`'s light or dark theme. It paints behind the text.
- **Other blocks:** no background. Only their mark glyph, if any, shows.
- **Under the selected block:** the verb menu after a dim `└`. The verb under the
  keyboard cursor (§10) draws as the primary button, the others dim. With the
  navigator unfocused, nothing is highlighted.

The reply carries no accent colour. ⚠️ `selectionBg` was found in the Claude Code
binary, not the documented API; an unknown key would make the reply fall back to
Claude Code's own drawing. Making it configurable: issue #8.
- **Under a commented block:** `→ comment text`, dim. While the comment is being
  typed it shows here live; the field itself, with its cursor, is in the
  navigator (§10).

**The selection shows only while the navigator holds the keyboard.** After Esc
the background and the menu go, and the reply reads as a plain reply with its
mark glyphs and comments.

**The reply is redrawn only when needed** (D33): while the navigator holds the
keyboard, or when a block in that piece of the reply is marked or being
commented. Otherwise the hook passes it through with `next(e)`, so Claude Code
and other mods draw it as usual. Redrawing takes the reply from every mod beneath
Synaptik in the chain, and draws the transcript's text — bypassing any mod beneath
that changes it.

**After review, marks stay by default** (D35): a marked piece keeps its glyphs and
comment lines after Esc. A configuration option (#8) shows them only while
reviewing, leaving every reply to Claude Code and other mods outside review — the
setting to suggest when another mod's drawing on replies conflicts.

### Example render

```
  Here's what I'd suggest:

  ✓ Use Redis for the session cache          ← on the selection background
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
`e.props.bodyColumns`. In classic it holds no focusable element, so the entry key
goes past it to the navigator (§10); in fullscreen it holds the review's hidden
controls and its hint line (§10, *Fullscreen*).

The band never names a component ("pane", "band") or uses jargon ("marks"). It
says what you can do now, under a header — each line led by `⎿`, as Claude Code
nests its own output — so with several mods in the band it is clear which lines
are Synaptik's:

```
Synaptik
⎿  ✓2 ✗1 ✎1 · tab, then ⏎ to send
⎿  ctrl+x tab to continue reviewing
```

| Line | Shows |
|---|---|
| Header *(always)* | `Synaptik` |
| Staged *(only when something is staged)* | the counts, as the margins mark them, and what the prompt box will do with them (below) |
| Action *(always, last, just above the prompt)* | what the keys do right now |

The staged line. **During a review ⏎ applies an action, so it says nothing
about the prompt box**; outside one it does:

| State | Text |
|---|---|
| Reviewing | `⎿  ✓2 ✗1 ✎1` |
| The suggestion showing in an empty box | `⎿  ✓2 ✗1 ✎1 · tab, then ⏎ to send` |
| The box holds exactly the suggestion | `⎿  ✓2 ✗1 ✎1 · ⏎ sends your feedback` |
| The box holds anything else *(yellow)* | `⎿  ✓2 ✗1 ✎1 · ⏎ sends what you typed` |
| Otherwise | `⎿  ✓2 ✗1 ✎1` |

The action line, in **fullscreen**: outside a review, `ctrl+x tab to review the
reply` and `click here to review the reply` in turn (`…to continue reviewing`
once something is staged); while reviewing, `Block 3 of 12 · ↑↓ blocks · ←→
actions · ⏎ apply · q done` (`j/k blocks` from the band). In **classic**:

| State | Text |
|---|---|
| Not in the navigator, nothing staged | `⎿  ctrl+x tab to review the reply` |
| Not in the navigator, something staged | `⎿  ctrl+x tab to continue reviewing` |
| In the navigator | `⎿  Block 3 of 12 · ↑↓ blocks · tab/⇧tab actions · ⏎ apply · esc done` |

The same words as fullscreen; how to send is the staged line's (above). `q` is
done too, as in fullscreen, though only Esc is shown: the pane sees Esc, and `q`
draws its actions under new keys so the one holding the keyboard disappears.

The keys shown are Claude Code's defaults. With the recommended bindings (§10)
the classic legend reads `↑↓ blocks · ←→ actions`.

**The band is shared with every mod.** A hook that answers without `next(e)`
hides every mod beneath it. Outside review, Synaptik draws what `next(e)` returns
and adds its lines below it; while the navigator holds the keyboard, Synaptik's
band stands alone as the key legend for that mode. Claude Code's own drawing
(an engine node) may sit in what `next(e)` returns, and **an engine node under a
`Box` with `width` is refused** — the whole band falls back to Claude Code's own —
so `width` is set only on the box around Synaptik's own lines.

The keys named are the person's own, read from `~/.claude/keybindings.json`.
The mod writes that file only through `/synaptik config`, after the person
confirms (D38):

- **Entering:** the binding for `abovePrompt:focus` in the `Chat` context, or
  `ctrl+x tab` when there is none.
- **Choosing a verb:** the bindings for `abovePrompt:previous` / `abovePrompt:next`
  in the `Pane` context — `←→` for the arrows, otherwise `previous/next` as bound
  (`h/l`), or `tab/⇧tab` when neither is bound. One direction bound alone keeps
  the other's default (`⇧tab/→`).

Bindings apply in file order: a later binding of a key replaces an earlier one,
`null` unbinds it, and of several keys for one action the last counts. Claude
Code applies an edited file at once, so the band reads it again whenever its
modification time changes.

### Sending: a live suggestion

The compiled prompt (§9) is proposed in the **empty prompt box** with
`$.prompt.suggest`, the same dim text Claude Code uses for its own suggestions.
It is re-proposed after every change to the tray (a mark, an unmark, a comment
finishing). `→` or `Tab` takes it into the box, where it can be edited, and
`⏎` then sends it as the person's own message — `⏎` on the empty box with the
suggestion showing sends nothing (checked 2026-10-28); `ctrl+c` clears it.

- The text is proposed **as compiled**, with no leading space. The box draws its
  cursor over a suggestion's first cell, so the first mark glyph hides under it
  until the suggestion is taken; a leading space to avoid that looked worse.
- **Once taken, the feedback's glyphs are coloured** in the box — ✓ green, ✗
  red, ✎ in the suggestion colour — as prompt decorations, which never change the
  draft. From the first keystroke only: taking the suggestion is a
  `prompt.change`, which carries no decorations, and Synaptik never writes the
  box to add them. A line not led by a glyph, and any prompt of the person's own,
  is left alone.
- **A suggestion cannot be withdrawn**: there is no call for it, a blank one
  cannot show, and writing to the box does not dismiss it. When the last mark is
  cleared, the mod proposes a harmless placeholder instead — currently `Give me a
  sec to read through this.` (wording provisional).
- **The mod never sends.** Taking the suggestion and pressing `⏎` is the only
  way the compiled prompt goes (D30). There is no send key.

⚠️ On at least one surface `$.prompt.suggest` always resolves `isShown: false`,
keeping the box for Claude's own suggestions (from the published docs; the VS
Code panel, #76). Synaptik draws only in the terminal (D40); a surface without
suggestions needs a sending design of its own.

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
words, ending in `...` (three plain dots) when cut. A numbered item's quote
keeps its number (`"3. Top level, numbered"`), so items that open alike stay
apart.

**An unmarked parent of a marked block is sent as context**: its quote alone, no
glyph, so a nested mark arrives under the item it belongs to.

```
"3. Top level, numbered"
    ✗ "1. Second level, numbered"
    ✎ "2. Second level, numbered" → merge with the one above
```

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

**A comment of several lines** keeps them, the rest lined up under its first
character, so every line stays with its block in the nesting (#16):

```
✓ "1. Cache sessions in Redis"
    ✎ "expire after 5 minutes" → too short
                                 and per user, not global
```

Where only one row fits — under a block, in classic's viewer — a comment shows
its first line and how many more: `→ too short (+1 line)`.

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
signed direction (`by`). That was the only way to get ↑/↓ apart from ←/→ —
until the review moved into the reply in fullscreen (below): a `Client` takes
every key once clicked. **The pane is classic's** (D41).

### Fullscreen: the review in the reply (D41)

There is **no navigator pane** in fullscreen. **A review starts two ways**, which
the band's hint line names in turn (`ctrl+x tab to review the reply` ↔ `click
here to review the reply`, every 3 s, on the hint `Client`'s own timer): `ctrl+x tab` (the
band's keyboard lands on Synaptik's actions — as a click elsewhere in the band
does, since Claude Code reports both alike), or a click on the hint itself, which
hands that `Client` the raw keys, ↑/↓ included. It lasts until the person types in
the prompt, or the band's focus leaves Synaptik's controls (Esc from the band).
**During a review** each block of the reply is drawn by its own `Client`
(`hooks/client/block.tsx`), so a click on one selects it; headings and rules are
drawn as plain Markdown between them. **Outside a review** the reply is drawn as
in classic — passed through, or with its marks in place (D33, D35) — so its text
can be selected and copied: a `Client` holds the pointer, and the transcript
selects nothing inside one.

```
⏺ Two separate problems, so two fixes:

  1. Cache sessions in Redis
✓    - key each entry by user
     - expire after 5 minutes          ← selected (selection background)
     └ [✓ accept] [✗ reject] [✎ comment] [💬 discuss]
✎ 2. Rate-limit the login endpoint
    → make it 5 per minute per account
```

**With the mouse**, during a review:
- **A click on a block selects it** and hands the reply the keyboard. The click
  lands on that block's own `Client`, so it is exact.
- ↑/↓ move between blocks, Home/End (and PgUp/PgDn) jump to the first or last.
  They run over the whole reply, across its tool calls.
- ←/→ (and Tab) walk the menu under the selected block; ⏎ applies the action
  under the cursor; a click on an action applies it; `a` `x` `c` `d` act
  directly.
- **A comment is typed in place**, under its block, dim, with a cursor (an
  inverse cell): characters, Space, ←/→, Home/End, Backspace, Delete. `⏎`
  stages it; `\` then `⏎` starts a new line, in every terminal, and the hint
  after the text says so (`⏎ ok · \⏎ new line`); ↑/↓ move between its lines and
  nothing more — past the first or last they leave it open, unstaged; Backspace
  on an empty comment cancels it; `c` on a commented block reopens its text.
- **A paste** while a comment is open goes into the comment: Claude Code hands
  every paste to the prompt box, and a `prompt.edit` hook moves it.

**With the keyboard:** only a click can focus a `Client`, so the review stays in
the **band**, where `ctrl+x tab` put it. Its ring stops on the four actions (hidden; the menu in the
reply shows the cursor), with `j` / `k` as hotkeys between blocks — ↑/↓ scroll
the band, and Claude Code's own lists use J/K. ←/→ walk the actions (Claude Code
binds them in the band by default), `⏎` applies, `a` `x` `c` `d` act; a comment
opened from the band is typed in a field in the band and shows under its block.

The band's ring is shared. Another mod's button there is a stop like Synaptik's,
so ←/→ past the actions land on it, and the review ends. Synaptik does not refuse
those stops (D41, revision 2026-10-30).

**Status in the band:** the hint line above, or, while reviewing (the hint stays
drawn, showing the legend — removing the `Client` the person clicked would take
the keyboard with it), `Block N of M · ↑↓ blocks · ←→ actions · ⏎ apply ·
q done` (`j/k blocks` from the band). The staged counts sit above it.

**How the blocks hold together** (`src/review.ts`):
- The block clicked keeps the keyboard and steers every block: its keys become
  steps, posted to the hooks (`ui.message`), which hold the review and hand it
  back to every block as props. A block draws its own newer step at once, until
  the hooks echo it.
- A later post in the same frame replaces an undelivered one, so every post
  carries the whole review and every action not yet confirmed; the hooks apply
  each action once, by id.
- A `Client`'s props are plain data: a missing value is refused and the whole
  reply falls back to Claude Code's own drawing, so a closed comment is left out,
  never `undefined`.
- Each adopted reply gets fresh `Client` instances (`block-<reply>-<index>`).

**Ending a review: `q`**, from the reply, the band or its hint (in a comment, `q`
types a `q`); the legend says `q done`. **Esc does not end it:** a mod never sees
Esc — a `Client` is never told it lost the keyboard, and the band raises nothing
when its focus goes back to the prompt (#23). If Claude Code ever reports it, Esc
joins `q` and `q` stays, unadvertised. Typing in the prompt (any edit but a paste
into an open comment) also ends the review, and the band's focus moving off
Synaptik's controls does, after a short grace (300 ms) in which a click into a
block — which also takes the focus from the band — keeps it going.

**The suggestion** is proposed after every action, and again whenever the prompt
box becomes empty (`prompt.edit`, `prompt.change`): it cannot show while the box
holds text.

**Revealing the reply** as the selection moves works as for the pane (below):
entering the first or last third of the blocks scrolls the reply's top or end
into view, best effort. **Only from `j` / `k`:** Claude Code scrolls a transcript
row only in answer to the person's own input, and a key a `Client` posts does not
count (`not person-initiated`). After a click, ↑/↓ move the selection and the
person scrolls with the wheel (#64).

### The navigator (classic)

A pane (id `synaptik-map`), opened when a reply is adopted — in classic only;
in fullscreen a pane opened before the mod knew is closed on its first drawing.
Its body is the block viewer (*The classic renderer*, below); while a turn runs,
`Waiting for the reply...`; before any reply, one line saying so (#73).

**The scroll trick.** The tree is always `bodyRows + 2` rows and its window is
pinned at offset 1, so ↑ and ↓ always have a row to scroll to. Each scroll key
moves the selection by its sign and the window back to offset 1. The keys are told
apart by `by`: an arrow scrolls a row, a page key `bodyRows`, Home and End
`contentRows` — so Home and End jump to the first and last block (#63).

**The wheel moves nothing in the navigator.** A wheel or trackpad over the pane
raises the same `ui.scroll`, told apart by its `pointer` (absent for the scroll
keys). It is passed back pinned at offset 1: blocks are moved by the keys, and
the wheel is for scrolling the reply, over the transcript (#62).

**The verb ring.** The four verbs are drawn in the pane hidden
(`display: none`); they still take focus and arm their hotkeys. A `ui.focus` hook
lets the ring stop on verbs and the comment field only. The menu under the
selected block in the reply shows which verb holds the ring.

**Comments** are typed into an `Input` shown in the pane — of several lines
(`rows`, #16: ⏎ stages, `\` then ⏎ starts a new line; the field says
`⏎ ok · \⏎ new line`), growing with
them to 3 rows and then scrolling with its cursor; the block viewer gives up the
rows. Visible, because only the field knows where its cursor is: its events carry the text, never the cursor,
and moving the cursor raises none. The text also shows under the block in the
reply as it is typed. Each opening of the field gets a fresh
`key` — a field redrawn under the same key and value keeps what was typed last
time. Leaving the field finishes the comment: with text it is staged, empty it is
dropped. `⏎` or backspace on an empty line cancels it.

### Keys

**Fullscreen** needs no setup:

| | With the mouse | With the keyboard |
|---|---|---|
| Start | click the band's hint (↑/↓ from there), then a block | `ctrl+x tab` |
| Move between blocks | ↑ / ↓, Home / End | `j` / `k` |
| Walk the actions | ← / → | ← / → |
| Apply the action under the cursor | ⏎, or click it | ⏎ |
| Apply an action directly | `a` `x` `c` `d` | `a` `x` `c` `d` |
| Leave | `q` (Esc is not seen, #23) | `q` |

**The default renderer** (the pane):

| Key | Default (no setup) | With the recommended bindings |
|---|---|---|
| Enter the navigator | `ctrl+x tab` (`abovePrompt:focus`) | same |
| Move between blocks | ↑ / ↓ | same |
| First / last block | Home / End (`Fn+←` / `Fn+→` on a MacBook) | same |
| Walk the verbs | Tab / ⇧Tab | ← / → |
| Apply the verb under the cursor | ⏎ | same |
| Apply a verb directly | `a` `x` `c` `d` | same |
| Leave | Esc | same |

**A mod cannot ship key bindings.** Every improvement on the default column is
the person's own `~/.claude/keybindings.json` — set by hand, or by `/synaptik
config` (below), which writes it after the person confirms:

```json
{ "context": "Pane", "bindings": { "left": "abovePrompt:previous", "right": "abovePrompt:next" } }
```

The `Pane` arrows apply to every mod's pane. Fullscreen needs none of this: the
band binds ←/→ by default, and `/synaptik config` there says so (#113).

Esc raises no `ui.focus` event, so whether the navigator holds the keyboard is
read from its own drawing (`e.props.isFocused`) and passed to the band and reply
with a redraw.

### Following the selection in the transcript

`$.ui.scroll({ to: { key } })` does not find elements drawn inside a transcript
message, so the transcript scrolls only to **whole rows** (`to: { requestId }`),
which counts as the person's input when a navigator key caused it. A reply
taller than the window always lands on its **top**, whatever the alignment. So:

- **Review starts on the last block.** A long reply leaves the terminal at its
  end, so the last block is the one already on screen; review runs upwards.
- **Into the first third** of the blocks: the reply is scrolled to its top.
- **Into the last third:** the row Claude Code draws after the turn
  (`TurnDuration`, `✻ … for Ns`) is scrolled to the window's bottom, which shows
  the reply's end just above it. Its id is remembered from its own render hook,
  which passes it through unchanged.
- **The middle third** is the person's to scroll (wheel, PgUp/PgDn).

⚠️ The newest turn row seen is used; a turn drawn without one would scroll to an
older turn's row.

The navigator does not follow the terminal's own scrolling: blocks move by the
keys only, and the wheel scrolls the reply (D37). In a reply taller than about
two screens the middle cannot be brought into view by the mod; the person scrolls
there, and Home/End give the two ends (#64).

### The classic renderer: the navigator as a block viewer

In the classic (non-fullscreen) renderer the pane opens **inline**, full width,
above the band. Text scrolled into the terminal's scrollback cannot be redrawn,
and the mod cannot scroll the terminal, so the reply above is reliable only while
the block is on screen. The navigator therefore shows **the selected block
itself** (#31):

```
▲ Your notes · ✎1  § Section two
│
│ ↑ 1. Choose a cache for sessions
│ ✎ 2. Decide the key format, and how it is versioned across deploys
│ [ ✓ accept ][ ✗ reject ][ ✎ comment ][ 💬 discuss ]
│ → keep it short
│ ↓ 3. Set an expiry policy
│
▼ Block 2 of 14
```

- **Header:** your notes and counts, and a breadcrumb — the nearest heading above
  the selected block (`§ Section two`).
- **Between header and footer**, beside a dim `│` edge: the previous block's
  opening words (dim), the **selected block in full** as Markdown with its mark,
  the menu as real buttons (←/→ or Tab walk them), the comment line (`→ …`, or the
  comment field while typing), the next block's opening words (dim). Spare rows
  sit after the header and before the footer, so the menu is right under the block.
- **Height, decided once per reply:** the tallest block's estimated rows (a table
  as drawn, a code block without its fences) plus six, between 7 rows and a third
  of the screen — so the pane does not change height while navigating. A block
  taller than that is trimmed; **PgUp/PgDn** scroll within it (a page-sized `by`
  on `ui.scroll`, where ↑/↓ give 1), and the footer says `PgUp/PgDn to read on`.
- **Claude Code's kept pane size wins over the request.** It keeps one inline
  height and one dock width for all mods' panes, across sessions
  (`pluginPanes.inlineRows` / `dockColumns` in `~/.claude.json`), set whenever the
  person resizes any pane. The layout must stay usable at whatever height it gets.

Fullscreen has no pane: the review happens in the reply itself (above, D41).

### Opening the navigator

A pane opened unasked waits undrawn below 144 terminal columns (110 for an id the
person has opened before), and a module reload closes it. When it is not on
screen, the band's action line becomes a button — `ctrl+x tab, then ⏎ to review
the reply` — since an open answering the person's press is placed at any width.

⚠️ This case is an edge case with its design deferred, as is the navigator's
inline layout below 110 columns, where a vertical map does not fit.

---

### The `/synaptik` command (D39)

| Command | Does |
|---|---|
| `/synaptik` | opens the navigator — also when Claude Code held it back (§10, *Opening the navigator*) |
| `/synaptik help` | lists the commands and what each does |
| `/synaptik on` / `off` | the kill switch (§12), this session only; `/plugin` disables the mod for good |
| `/synaptik config` | the key setup, below |
| `/synaptik log` | what the hooks observed |

### Key setup: `/synaptik config` (D38)

The default renderer's (in fullscreen it opens nothing and says: `nothing to set
in fullscreen: /synaptik config is for the default renderer`). A mode of the
navigator pane (one tab). It moves as the navigator does: the tree is pinned for
the scroll trick, so **↑/↓ move a cursor over its rows** — the setting, then
Save and Cancel — and **⏎ on a setting opens its
options**, where ↑/↓ choose and ⏎ takes one and returns to the rows; the first
option, `‹ back`, returns unchanged. ⏎ on Save writes; on Cancel, or Esc
anywhere, nothing is written. Esc cannot mean "back": it gives the keyboard to
the prompt, and a mod cannot take it back (`$.ui.focus` only moves it within a
site that holds it). For the same reason, after Save or Cancel the navigator
keeps the keyboard — a mod cannot hand it to the prompt; Esc does. (`Select` lists were
tried: they keep ↑/↓ for their own options, so moving between settings took
Tab.)

```
Synaptik keys · default renderer
↑↓ move · ⏎ change · esc: discard changes

▸ Move between actions · ← / →

  Save
  Cancel
```

| Setting | Writes | Choices |
|---|---|---|
| Move between actions | `Pane`: `"<prev>": "abovePrompt:previous"`, `"<next>": "abovePrompt:next"` | Tab / ⇧Tab (default) · ← / → |

- **The file** is `keybindings.json` in Claude Code's config folder:
  `CLAUDE_CONFIG_DIR` when set, else `.claude` in the home folder — `HOME`, or
  `USERPROFILE` on Windows, where PowerShell and cmd set no `HOME` (#74). With
  none of them set there is no path, and the setup says so. The menu shows the
  path it writes, with the home folder as `~`.
- **The key that opens Synaptik is not set here** (#113): `ctrl+x tab` is Claude
  Code's, and a key the person bound themselves — `ctrl+s` from an earlier
  version of this menu included — stays as it is; the setup never touches it.
- The current bindings are read from the file and shown first.
- **A failed write is never silent:** the menu stays open with the choice, and
  says where it couldn't write and why.
- **Presets only.** A key bound by hand in the file shows as its own option, so
  opening the menu never loses it. Choosing any other key is a feature request
  (#80): capturing one needed a mouse click, which is not good UX for a keyboard
  tool; what was learned is recorded there.
- **Before writing**, the exact entries to add or remove, and one short line for
  each thing given up — `← → will also move between buttons in other mods' panes` — plus a dim tip where one
  helps (← on an empty prompt opens agent view: `leftArrowOpensAgents`).
- The write merges into the file: other contexts and bindings are left as they
  are. The band picks the new keys up at once (§7).

**Behaviour options are `/config` rows** (`userConfig`), not part of this menu:
for now only *marks after review* — keep, or only while reviewing (D35).

## 11. Hooks registered

**No tool hooks.** The mod cannot interfere with the agent's operation — it
draws, and it proposes text for the prompt box.

| Hook | Matcher | Purpose |
|---|---|---|
| `session.start` | — | register `/synaptik`, adopt the last reply |
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

**Sharing with other mods** (D33, tested with the bench's `neighbour-mod`):
chain order follows load order (`--plugin-dir` order). The band composes with
`next(e)` except while the navigator or the band holds a review; a review started
by a click leaves other mods' lines drawn, and a mod above Synaptik always keeps
its own. The band's ring is shared with other mods' buttons, and their hotkeys
work while the band has the keyboard. The reply is redrawn only when needed; the
navigator, a pane of Synaptik's own, works whatever other mods do.

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
escape it is painful mid-task. It is `/synaptik off`, for the session (D39); a
slash command's output row is read by the model, which P1 (as revised) allows.

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
| **Phase 1** | evolves the spike (D34): real segmentation (§3), tray (§5), compile (§9), the reply in place, navigator, shared band, sending by suggestion; minimal navigator-off-screen and classic-mode handling; packaging. **No threads.** | usable daily, installable |
| **Phase 2** | threads, commit toggle, summary | §8 works |

**The spike answered its questions and evolves into phase 1** (D34, revising
D27's "throwaway"): its tested behaviour is kept, the segmenter is rewritten
properly, and the hooks file is split. Rendering came first because §6's
uncertainty was the only thing that could still change the design.

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
│       │   ├── register.tsx       every hook; the only file that touches $
│       │   ├── ui.ts              constants shared with the views
│       │   └── views/             reply, navigator, band, key menu: data in, elements out
│       ├── types/
│       │   └── index.d.ts         $.state contract, named in plugin.json
│       └── src/
│           ├── blocks.ts          text → Block[]
│           ├── tray.ts            state + transitions (#51)
│           ├── compile.ts         Tray + Block[] → string
│           ├── turn.ts            transcript rows → the last reply
│           ├── keys.ts, keysetup.ts, configpath.ts   the key bindings
│           ├── layout.ts, tally.ts, counter.ts       sizes and counts
│           └── *.test.ts

**`$` never crosses an import:** the mod loader follows it only into functions
in the same file, so every hook and every `$` call is in `register.tsx`; views
take elements, plain data and callbacks (#49).
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

Requires Claude Code **v2.1.301+**, in the terminal (D40): the fullscreen review watches the prompt box with `prompt.change` (2.1.300), and multi-line comments use `Input`'s `rows` (2.1.301, #16). `Raster` and `Image`
are terminal-only and unused; the mod draws with `Box`, `Text`, `Button`,
`Input` and `Markdown`.

### Known limits

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

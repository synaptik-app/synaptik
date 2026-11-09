# Review model

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
// src/tray.ts — keyed by part: a block's index, or a line's or row's key
// ("3.4", the line from 0)
type Tray = {
  marks: Record<string, 'accept' | 'reject' | 'comment'>
  comments: Record<string, string>   // kept when the mark is cleared or overwritten
}

// src/threads.ts — one per block, line or row, kept apart from the tray
type Thread = {
  messages: { role: 'person' | 'agent'; text: string }[]
  included: boolean                  // false = will not be sent
  isIncludeSet: boolean              // the person set the switch; no verdict asked
  summary?: string                   // written by the thread's fork with each answer
  // …and bookkeeping: pending answers, what the summary was written over
}
```

### Rules

| Action | Effect |
|---|---|
| New mark on a marked block | **overwrites.** One slot, last write wins. |
| Accept or reject twice | unmarks |
| `Backspace` on a block | clears it in steps: first the block's own mark and included thread, then everything on its lines or rows; a block with nothing of its own is cleared inside at once. A comment's text is kept for `c`; a thread is set to `included: false`. **In fullscreen after a click only:** the keys are a `Client`'s there. From the band or the pane a hotkey is one letter or digit, so Backspace can't be bound (#23, #100). |
| Mark **and** included thread on one block | both are sent; the agent reconciles |

**Clearing unstages, it never destroys.** A cleared thread keeps its `messages`
and can be re-included. A cleared comment keeps its text in `comments`.

**The tray clears after sending.**

**The tray is discarded when a new assistant message arrives** (see §7 for the
warning).

---

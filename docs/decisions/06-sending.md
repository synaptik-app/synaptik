# Sending

### D30 — Send by live suggestion in the prompt box
**Status:** settled · added 2026-10-15

The compiled prompt is proposed with `$.prompt.suggest` into the **empty** prompt
box after every tray change. It is the only way to send: there is no send key,
and the mod never submits. `→`/`Tab` takes it, the box is where it is edited,
`⏎` sends it, `ctrl+c` clears it — all Claude Code's own gestures for its own
suggestions.

The suggestion is **shortened**: its first 3 lines and `… (+N lines)`, in either
renderer. Taking it gives the whole review: `prompt.change` sees the box holding
the short text and fills in the full text. That writes the box, but only at the
person's own `Tab` or `→`, and they see all of it before their `⏎`, so it keeps
to "never behind their back". `⏎` on the empty box sends nothing, so taking is
the only way out.

**Why:** the person sees the prompt where they will send it, and the edit step
comes free. A suggestion cannot sit beside typed text, but it need not — it is
only proposed into an empty box, and the discard warning covers the other case.
A key that sends from a pane is easy to hit by accident, and the prompt would
leave before it had been looked at in the box. Shortened, because a long review
grew the box with every mark; and always, because every way out of a review left
the box holding the whole text, so a clear brought a long suggestion back.

**Mechanics:**
- No leading space: the box's cursor sits on the suggestion's first cell, over
  the first mark glyph, until it is taken.
- Comments re-propose when they finish (⏎, or focus leaving the field), not per
  keystroke.
- A suggestion **cannot be withdrawn**. When the last mark is cleared, a harmless
  placeholder replaces it (`Give me a sec to read through this.`) — something a
  person might type and safe to send by accident, guessing nothing about intent.
- When the box holds exactly the taken suggestion the band says `⏎ sends your
  feedback`; any other text brings back the discard warning.
- Relies on `prompt.change`, which isn't in the published event list; without it,
  the full text needs another way in.

**Open:** what the band says once the taken suggestion is edited; whether to veto
Claude Code's own suggestions while feedback is staged.

**Revisions**
- **2026-10-24** — `s` (send from the navigator, `$.prompt.submit`) removed: the
  suggestion does the job, and the mod never submits.
- **2026-10-28** — no leading space: the indented first line looked worse than a
  glyph under the cursor.
- **2026-10-31** — shortened during a fullscreen review, filled in on take with
  `prompt.change`.
- **2026-11-06** — whole again, `prompt.change` dropped, to get into the plugin
  directory (#178).
- **2026-11-08** — shortened again, and always, with `prompt.change` back: the
  directory refused Synaptik for another reason (#93, #178).

---

### D47 — Compile format: a marked-up outline of the reply
**Status:** settled · added 2026-11-08

What is sent is a marked-up outline of what Claude wrote. No header and no prose
scaffolding: no "the user approved step 3", no "the user asked to explain…".

```
✓ "Use Redis for the session cache"
    ✓ "per-user key prefix"
    ✗ "write-through on logout"
✎ "Add a rate limiter" → make it 5 req/sec
💬 "Shard by tenant id" → defer sharding until >10k tenants
```

Symbol, short quote, optional text, nesting preserved (D4). Quotes run to roughly
the first 6–8 words — long enough to locate, short enough to stay readable in a
stack of marks — and a cut quote ends in three plain dots (`...`), not the single
`…` character. **Threads contribute only their included summary**, with no
mention that a discussion happened or what was asked. The full format is SPEC §9.

**Why:** the agent wrote this message one turn ago, so a six-word quote locates
anything — the user is annotating, not re-explaining. No header is the closest
thing to text a person would type (P1).

**Revisions**
- **2026-10-15** — the `Re your last message:` header is dropped: it read like an
  email reply, and the quotes alone locate everything. Cut quotes end in `...`.
- **2026-11-08** — a DR of its own; it was the part of D6 that survived.

---

## Superseded

### D29 — The band is the source of truth; the prompt box is a scratch copy
**Status:** superseded → D30 · added 2026-10-12

**Replaced by D30**, which holds the mechanism; the principle carries over to P1
and D30 unchanged. As it stood: the person sees the exact text before it is sent, and the mod never merges its
text into what they typed. The compiled prompt is shown in the prompt box, as a
suggestion (D30); the band above the box (`AbovePrompt`) holds a one-line summary
and an action line (SPEC §7), never the prompt itself.

**Why:** the band is the mod's own surface and the box is the person's. Keeping
the mod's text out of what they typed removes all merge logic — there is no case
where mod text and user text must be combined, and no divergence state to
explain or display.

#### Rejected alternatives

| | Why rejected |
|---|---|
| Regenerate into the box, overwriting user edits automatically | data loss as a side effect of marking |
| Live preview in the box until the user edits it, then detach | needs a divergence state and a destructive re-sync key |
| Merge mod text with typed text on submit via `prompt.submit` | the agent would receive text the user never saw |

**Revisions**
- **2026-10-15** — the compiled prompt moves from a dim preview in the band to a
  suggestion in the box (D30). The band keeps a summary and an action line; the
  submit and copy-to-box keys go with the preview.
- **2026-10-24** — no direct submission at all: the mod never submits (D30).
- **2026-11-08** — superseded by D30: what was left of it was the principle, which
  P1 and D30 already state.

---

### D6 — Reference expansion by truncated quote
**Status:** dead · added by 2026-10-14

Existed only because the user was assumed to type block references. They never
do. Nothing to expand (D5, P1).

What survived of it, the compile format, is D47.

**Revisions**
- **2026-11-08** — the compile format moves out to D47.

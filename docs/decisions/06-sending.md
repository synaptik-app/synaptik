# Sending

### D29 — The band is the source of truth; the prompt box is a scratch copy
**Status:** settled · added and resolved 2026-10-12

**The whole decision:**

1. The generated prompt appears as a **dim preview in the band above the prompt
   box** (`AbovePrompt`), regenerating live as marks change.
2. **One key submits it** — straight to the agent via
   `$.prompt.submit({ asUser: true })`.
3. **One key copies it into the box**, overwriting whatever is there, for when
   the user wants to edit before sending.

Default path is one keypress. The edit path exists and is never touched unless
wanted.

#### Why the band, not the box

The box is where the user types; the band is the mod's own surface. Putting the
preview there means the user's typing is never disturbed, the preview
regenerates freely, and there is no divergence state to explain or display.
`AbovePrompt` is a documented render site and the `token-weather` sample already
draws there, so this needs no verification.

#### Band is authoritative, box is scratch

| | Behaviour |
|---|---|
| Band | always reflects current marks. Never edited, never stale. |
| Copy to box | **overwrites** the box every time. |
| Edits in the box | the user's, until they copy again — which discards them. |

**Overwrite-on-copy is correct** because copying is an explicit keypress, not a
side effect. The data-loss objection applies to *automatic* overwriting; an
explicit "give me a fresh copy" replacing the box is ordinary behaviour.

It also removes all merge logic: copy replaces, so there is no case where mod
text and user text must be combined.

**Possible mitigation, only if it stings in use:** show `box has edits — copy
will replace` in the band. Not worth building until felt.

#### `asUser: true` is required

The plain form of `$.prompt.submit` prepends a sentence naming the mod as
sender, which would tell the agent the mod exists. `asUser: true` sends the text
as the user's own words. See P1.

**P1 is not violated by direct submission.** The band already showed the user
the exact text; submitting it is not sending something behind their back. An
earlier draft of this decision routed everything through the box to preserve
P1 — that round trip bought only an edit the user did not want.

#### Rejected alternatives

| | Why rejected |
|---|---|
| Regenerate into the box, overwriting user edits automatically | data loss as a side effect of marking |
| Live preview in the box until the user edits it, then detach | needs a divergence state and a destructive re-sync key; the band makes it unnecessary |
| Merge mod text with typed text on submit via `prompt.submit` | the agent would receive text the user never saw |

#### Still open

- **The accept gesture** — which key submits, which copies. A candidate worth
  trying: `Tab` or Enter-on-empty-box to accept the band's preview, so it reads
  as accepting a suggestion rather than invoking a command. Settle by feel in
  slice 1.
- **`prompt.suggest`** (Q11) might allow the preview to live in the box as a
  true separate layer, skipping the copy step. **Not a dependency** — the band
  works. If `suggest` turns out nicer, it swaps in without redesigning anything.
- ~~**After sending, the tray clears**~~ — **resolved** together with Q7 (D24):
  the tray clears after sending, since the marks were consumed, and is
  discarded with a warning when a new message arrives by any other route.

#### Revision 2026-10-15 — the box, not the band, shows the prompt

The band preview worked, but the spike found a better place: **the prompt box
itself, as a dim suggestion** (D30). The band keeps a one-line summary and an
action line (SPEC §7) and no longer holds the compiled text. The principle of
this decision — the person sees the exact text, and the mod never merges into
what they typed — carries over unchanged.

---

### D30 — Send by live suggestion in the prompt box
**Status:** settled · added 2026-10-15 · **settled 2026-10-24: the suggestion is
the only way to send; the `s` key is removed** (revision below)

The compiled prompt is proposed with `$.prompt.suggest` into the **empty** prompt
box after every tray change. `→`/`Tab` takes it, the box is where it is edited,
`⏎` sends it, `ctrl+c` clears it — all Claude Code's own gestures for its own
suggestions. A multi-line suggestion renders fine.

**Why:** the person sees the prompt where they will send it, and the edit step
comes free. It answers Q11: a suggestion cannot sit beside typed text, but it
need not — it is only proposed into an empty box, and the discard warning covers
the other case.

**Mechanics the spike settled:**
- A leading space: the box's cursor sits on a suggestion's first cell and would
  hide the first mark glyph. **Revised 2026-10-28: no leading space** — the
  indented first line looked worse than a glyph under the cursor until taken.
- Comments re-propose when they finish (⏎, or focus leaving the field), not per
  keystroke.
- A suggestion **cannot be withdrawn**. When the last mark is cleared, a harmless
  placeholder replaces it (`Give me a sec to read through this.`) — something a
  person might type and safe to send by accident, guessing nothing about intent.
- When the box holds exactly the taken suggestion the band says `⏎ sends your
  feedback`; any other text brings back the discard warning.

**Open:** what the band says once the taken suggestion is edited (§11, item 6);
whether to veto Claude Code's own suggestions while feedback is staged (item 7);
surfaces where plugin suggestions never show (item 4) — there `s` in the
navigator sends directly.

#### Revision 2026-10-24 — no send key

`s` in the navigator sent the compiled prompt with `$.prompt.submit({ asUser:
true })`, unadvertised. It is removed. The suggestion does the job better: the
person sees the prompt where it goes, takes it with `Tab`, and sends with their
own `⏎`, so the mod never submits anything itself. A key that sends from a
pane is easy to hit by accident, and the prompt would leave before it had been
looked at in the box. The surfaces where suggestions don't show (item 4) are
outside the terminal (D40); a send button belongs to their design (#76).

#### Revision 2026-10-31 — shortened during a fullscreen review

A long review grew the prompt box with every mark. During a fullscreen review the
suggestion is now its first 3 lines and `… (+N lines)`; the end of the review
proposes the full text again. Classic is unchanged.

Esc raises nothing, so the short text can outlive the review, and taking it as it
stands would send most of the review missing. So `prompt.change` compares the box
with the short text and, on a match, fills in the full text. This writes the box,
but only at the person's own Tab or →, and they see all of it before their `⏎`, so
it keeps to "never behind their back". `⏎` on the empty box sends nothing (checked
2026-10-28), so taking is the only way out. This leans on `prompt.change`, which
the plugin directory doesn't list yet: dropping that hook means finding another
way to do this repair.

#### Revision 2026-11-06 — whole again, without `prompt.change`

The plugin directory flags `prompt.change` (its list of events lacks it), and
mods will soon be accepted from Verified organizations only, keeping a version
already live. To get one live, Synaptik drops the hook: the suggestion is whole
during a review again, so nothing can be taken shortened, and an emptied box gets
it back at the next keystroke or action rather than at once. First on a
`directory` branch, then on `main` too (2026-11-07), so one branch serves both.
The hook and the shortened suggestion come back once the directory lists the
event (#178).

#### Revision 2026-11-08 — shortened again, with `prompt.change`

The directory refused Synaptik on 2026-11-07 for another reason: it takes mods
only from Verified organizations, and there is no way to apply (#93). Nothing
left to keep `main` in its shape for, so the hook and the shortened suggestion
are back (#178). And now **always** shortened, not only during a review: every
way out of a review (typing, taking the suggestion) left the box with the whole
text again, so a clear brought back a long suggestion. A suggestion shows only
while the box is empty, so a short one never sits beside a draft; taken, it is
the whole review, in either renderer.

---

## Superseded

### D6 — Reference expansion by truncated quote
**Status:** dead · killed by D5 + P1

Existed only because the user was assumed to type block references. They never
do. Nothing to expand.

What survives is a formatting detail of the compile step, not a decision:
quotes run to roughly the first 6–8 words — long enough to locate, short enough
to stay readable in a stack of marks.

#### Compile format

No prose scaffolding. No "the user approved step 3", no "the user asked to
explain…". A marked-up outline of what Claude wrote:

```
✓ "Use Redis for the session cache"
    ✓ "per-user key prefix"
    ✗ "write-through on logout"
✎ "Add a rate limiter" → make it 5 req/sec
💬 "Shard by tenant id" → defer sharding until >10k tenants
```

**Revision 2026-10-15:** the `Re your last message:` header is dropped. It read
like an email reply; the quotes alone locate everything, and no header is the
closest thing to text a person would type. Cut quotes end in three plain dots
(`...`), not the single `…` character.

Symbol, short quote, optional text, nesting preserved. The agent wrote this
message one turn ago, so a six-word quote locates anything — the user is
annotating, not re-explaining. **Threads contribute only their committed
summary**, with no mention that a discussion happened or what was asked.


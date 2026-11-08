# Rendering

### D21 — Selection highlighting is a gutter column
**Status:** settled · reviewed 2026-10-13

A single gutter column to the left of the text — bright `▎` on the selected
block, dim `▏` on the others — also carrying mark state (`✓ ✗ ✎ 💬`):

```
  Here's what I'd suggest:

▎ ✓ Use Redis for the session cache
▏   Add a rate limiter
▏   Shard by tenant id
```

One `Box` per block with a narrow left column, then the text.

**Rationale:** per-block borders are noisy and cost two rows each. One column
means no layout shift. **And the gutter cannot fail** — it is the mod's own
column, not a restyling of Claude's text.

#### Background highlighting is a nice-to-have, not the design

`Box` takes `backgroundColor`; `Text` takes `backgroundColor` and `inverse`
(the closest thing to a selection highlight in a terminal). But **`Markdown`
lists no background prop** — only `text`, `dimColor` and the link props. So
highlighting a block means either wrapping it in a `Box` with a background and
hoping that paints behind the child text, or rendering the block as `Text` and
giving up markdown formatting inside it. Neither is certain from the docs.

**This is the same uncertainty as Q10** — how much control a `ui.render` hook
has over message text. One question, two outcomes: good control means
highlighting is available; poor control still leaves the gutter working.

**This is the one part of the design that cannot be settled on paper.**
Everything else was decided by reasoning; how a marked-up transcript actually
*looks* in a terminal is only learned by drawing it. The
[interface gallery](https://code.claude.com/docs/en/plugins/mods/gallery) has
screenshots of most elements — the fastest way to judge a background behind
markdown before building it.

#### Revision 2026-10-15 — an accent bar on the selected block only

In use, a dim `▏` on every block was noise, and a single `▎` on the selected
block was too faint: the selection and its menu blended into the reply.

**Now:** unselected blocks carry no gutter, only their mark glyph. The selected
block gets a **solid accent bar down its full height** — a 1-cell `Box` with a
`backgroundColor` beside the text, which stretches to the block's height
(`Markdown` itself still takes no background). The menu hangs off it with an
accent `└`; the verb under the cursor is the primary button, the rest dim. A
comment shows under its block as `→ text`, not a second ✎.

The original gutter's promise survives: it is the mod's own column, so it cannot
fail by restyling Claude's text.

**Revision 2026-10-17 — the selection colour instead of a bar.** A `Box`
background wrapped around a block's `Markdown` does paint behind the text (Q10's
open half, answered). The selected block now takes Claude Code's text-selection
colour, theme key `selectionBg`, and the cyan bar goes: the reply carries no
accent colour, and the theme key follows light and dark themes. Tried: `gray`
(too strong), `blackBright` (close, still bright), a raw hex (too faint), a
background for staged blocks (too much colour in the reply). `selectionBg` comes
from the binary, not the documented API.

---

### D33 — Share Claude Code's surfaces with other mods; redraw only when needed
**Status:** settled · added 2026-10-17 · tested with the bench's `neighbour-mod` (#12)

Every surface Synaptik draws on except its own pane is shared with other mods,
and each is a **chain**: a hook that answers without `next(e)` hides every mod
beneath it. Found with the test bench's neighbour mod and its greedy toggle:

- **Chain order follows load order** — the order of `--plugin-dir` flags. The
  first loaded sits highest.
- **One mod redraws a reply.** Synaptik's in-place marks redraw the whole reply
  (`next(e)` returns an opaque handle that cannot be edited), so it cannot add to
  what a mod beneath draws. Whichever mod is higher wins that reply; a mod above
  that wraps with `next(e)` coexists.
- **The navigator cannot be taken away.** A pane belongs to one mod; with several,
  they become tabs. A greedy mod above Synaptik removed its in-place marks and
  band lines — and the navigator kept working: ↑/↓, verbs, comments, the
  suggestion.

**Decisions:**
1. **The band composes** with `next(e)`, Synaptik's lines last under a header —
   ~~except **while reviewing**, when its band stands alone as the key legend for
   that mode. Brief, bounded, and the one deliberate exception.~~ **Revised
   2026-11-07 (#171): no exception.** Standing alone during a review dropped every
   mod loaded after Synaptik from the band, buttons and hotkeys too, and
   `ctrl+x tab` (the band's ring, every mod's) only ever reached Synaptik's
   actions. The band composes during a review as well, Synaptik's legend still
   last, so another mod's button is a stop in the ring, as D41 says.
2. **The reply is redrawn only when needed:** while the navigator holds the
   keyboard, or when a block in that piece of the reply is marked or being
   commented. Otherwise it is passed through with `next(e)`. Most replies are
   never marked, so for most of a session Synaptik is invisible in the chain.
3. **Everything essential lives in the navigator.** The in-place view is a bonus
   another mod can take; the function must survive any neighbour (bears on #19).

**Rejected:** calling `next(e)` for the reply and discarding the result — other
mods would run, nothing of theirs would show, and the reply would be drawn twice.

**Known risk, accepted for now:** while Synaptik redraws a reply it draws the
**transcript's** text. A mod beneath it that changes a reply's text — hiding
secrets, translating — is bypassed for that reply. Decision 2 narrows the window
to reviewing and marked pieces; it does not close it. Revisit if such a mod
appears; the upstream fix is a way to share one reply drawing (#23).

**Revised 2026-10-27 (fullscreen review in the reply, #39):** during a fullscreen
review the reply is drawn by Synaptik, each block a `Client`, and another mod that
changes how replies are drawn is bypassed. Outside a review this decision holds
as written, in both renderers: the `Client`s are drawn only between `ctrl+x tab`
and the end of the review, since a `Client` holds the pointer and blocks text
selection.

---

### D35 — In-place marks after review: a configuration option, on by default
**Status:** settled · added 2026-10-18 · decided on #36

While the navigator holds the keyboard the reply always shows the selection,
menu, glyphs and comments. The question was what stays after Esc.

**Decision:** glyphs and comment lines **stay on marked pieces** of the reply by
default — the reply reads as the form you filled (D1). An option turns that off,
so the reply shows marks **only while reviewing** and is otherwise left to Claude
Code and other mods (D33). Tracked on #8.

**Why both:** for someone using Synaptik alone, persistent marks are the better
view. With other mods drawing on replies, or a mod that changes a reply's text,
Synaptik's redraw of a marked piece takes that piece from them (D33). The option
is the advice to give then: "switch off in-place marks after review".

**Unaffected either way:** the navigator's overview, the band summary and the
compiled prompt in the prompt box show everything staged.

---

### D41 — Fullscreen reviews in the reply itself; classic keeps its pane
**Status:** settled · added 2026-10-27 · decided on a spike (`spike/client-reply`,
Claude Code 2.1.308) · built on #39 · revises D20, D31, D38 · **revised
2026-10-28: review mode; 2026-10-30: the shared ring, revealing, Backspace** (below)

**In fullscreen there is no navigator pane.** Each block of the reply is drawn by
its own `Client` (a region the mod's own module draws). **A click on a block
selects it** and hands the reply the keyboard:
- ↑/↓ and Home/End move between blocks;
- ←/→ walk the menu of actions under the selected block, and ⏎ applies;
- `a` / `x` / `c` / `d` act directly;
- a comment is typed in place under its block: dim, with a cursor, `\` + Enter
  for a new line, and a paste moved into it from the prompt box.

The band carries the status (`✓2 ✗1`, `Block N of M`) and the keys.

**The keyboard path goes through the band.** Only a click focuses a `Client`, so
`ctrl+x tab` focuses the band instead. There, `j` / `k` move between blocks
(↑/↓ are taken by scrolling the band, Shift+↑/↓ by extending the text selection;
Claude Code's own lists use J/K too). ←/→ walk the actions, since Claude Code
binds them in the band by default, and a comment is typed in a field in the band.
The selection and the menu still show in the reply. Both paths are always on,
with no setting.

**Classic keeps its pane** above the band, as it is. It cannot redraw a reply
that has scrolled off, so its block viewer is how those blocks are reviewed, and
it has no clicks. Its pane takes Tab/⇧Tab for the actions (D42).

**Why:** the pane existed to turn ↑/↓ into blocks (the scroll trick, D20) and to
hold the comment field. A `Client` receives every key once clicked, arrows and
typed text included, so the review can happen where the reply is. The ~24 columns
beside the transcript, which #39 never found a good use for, go back to the
reply.

**How it holds together:**
- **One `Client` per block,** so a click is exact. Estimating each block's rows
  from its text missed on wrapped paragraphs, tables and code. The block clicked
  keeps the keyboard and steers the others through the hooks, which hold the
  review and hand it back to every block as props.
- **Posts can be lost:** a later post in the same frame replaces an undelivered
  one. So each post carries the whole review and every action not yet
  confirmed, and the hooks apply each action once, by id.
- **A `Client`'s props are plain data:** a missing value is refused, and the
  whole reply falls back to Claude Code's own drawing.
- **The suggestion** is proposed after every action, and again whenever the
  prompt box becomes empty. It cannot show while the box holds text.

**Known limits, asked of Claude Code (#23):**
- **Esc is invisible.** A `Client` is never told it lost the keyboard, and Esc
  raises no event or redraw. The menu stays drawn until the person types in the
  prompt or focuses the band; then the reply lets go.
- **The keyboard cannot focus a `Client`.** Hence the band path.

#### Revision 2026-10-28 — review mode, the band's hint, q

Tried on the terminal, three things changed what is above:

- **A `Client` blocks text selection.** It holds the pointer from down to up, and
  the transcript selects nothing inside it, so a reply drawn entirely as
  `Client`s could not be selected or copied. **The block `Client`s are now drawn
  only during a review.** Outside one, the reply is drawn as in classic —
  passed through, or with its marks in place — and selects as usual. So a click
  on a block no longer *starts* a review; it selects a block within one.
- **Two ways in, named by the band's hint line.** The hint is a `Client` that
  alternates `ctrl+x tab to review the reply` and `click here to review the
  reply` on its own timer. **A click on it** starts the review and hands it the
  raw keys: ↑/↓ and everything a clicked block does, through the same steps.
  **`ctrl+x tab`** keeps the band path, with `j` / `k`. The hint stays drawn
  during the review as the legend, because removing the element that holds the
  keyboard gives it back to the prompt. Claude Code reports a click elsewhere in
  the band exactly as `ctrl+x tab`, so that click starts a `j` / `k` review.
- **`q` ends a review**, from the reply, the band or the hint (in a comment, `q`
  types a `q`). Esc is invisible from the band as from a `Client`: the band
  raises nothing when its focus returns to the prompt. If Claude Code ever
  reports Esc, it joins `q`, and `q` stays unadvertised. Ending a review draws
  the band's controls under new keys: the one holding the keyboard disappears,
  and Claude Code hands the keyboard back to the prompt, which a mod cannot do
  directly.

**The band** became: the header `Synaptik`; the staged line in glyph counts
(`✓2 ✗1 ✎1`) with a note on the prompt box **only outside a review** (during one
⏎ applies an action) — `tab, then ⏎ to send`, `⏎ sends your feedback`, or in
yellow `⏎ sends what you typed`; and the hint line. Prompt edits and changes
redraw it, so the note follows the box. During a review, D33 yields: the reply
is Synaptik's to draw.

#### Revision 2026-10-30 — the shared ring, revealing, Backspace

Found on the test bench, Claude Code 2.1.308.

- **The band's ring stays shared.** Before D41 Synaptik had nothing focusable in
  the band, so `ctrl+x tab` stopped on another mod's button and then moved on to
  the pane. Now Synaptik's hidden actions are in the band, the first takes the
  ring, and a neighbour's button is a stop among them. ←/→ past the actions land
  on it, and the review ends. Its hotkey works while the band has the keyboard;
  after a click on a block the keys are the `Client`'s, and it does not.
- **Rejected: refusing other mods' stops during a review** (`ui.focus`,
  `{ deny }`). It worked, and a click on the button still fired, but a button with
  no hotkey could then not be reached from the keyboard at all: `ctrl+x tab` always
  lands on Synaptik, and `q` hands the keyboard back to the prompt. Those stops are
  not Synaptik's to take away. No "next mod" key can replace them: `ctrl+x tab`
  moves between sites (the band, a pane), mods share the one band, and a hotkey
  is a single letter or digit.
- **Revealing the reply works only from `j` / `k`.** `$.ui.scroll` moves a
  transcript row only in answer to the person's own input. `j` / `k` are presses;
  a key in a `Client` reaches the hooks as a post, which is refused (`not
  person-initiated`). So after a click ↑/↓ never scroll the reply, at its top and
  end as well as in the middle. There is no workaround in the mod: handing the keys
  back to the band would lose ↑/↓ and comments typed in place. The fix is Claude
  Code's (#64).
- **Backspace takes a mark off, after a click only (#100).** A `Client` gets the
  key; the band and the pane can't bind it (#23). The legend names it `⌫ unmark`:
  "clear" reads as deleting the text, which stays for `c` (#122 is the key that
  deletes it). It is a key, not a fifth action in the menu, and from the band a ✎
  still goes only by overwriting it.
- **`ctrl+u` empties the comment being typed in place (#122).** `ctrl+c`, the
  prompt box's clear, never reaches a mod, and Esc reaches no `Client`. There is no
  undo; that is what a clear is for. The `Input` on the band path and in the pane
  is Claude Code's: there `ctrl+u` empties only the current line, and a mod can't
  change that, since `ui.input` reports the text and not the key.


## Extensions

### E5 — Edit and resend a denied command
**Status:** proposed
**Rebuilt additively 2026-10-13 under P3. The gating design below is abandoned.**

The case: Claude proposes a Bash command, you deny it — but you did not want to
refuse the *command*, only to change a flag. Today that means denying, then
retyping the whole thing as a prompt.

#### The additive design

Deny normally, through Claude Code's own prompt, untouched. **The mod then sees
the denied call in the transcript** (`$.session.messages()`) and offers *"edit
and resend"*: an `Input` pre-filled with the command. Edit it, and it compiles to

```
run this instead: npm test -- --verbose
```

No tool hooks. No interception. The permission prompt is never touched, so its
hard constraint is simply irrelevant.

**It is also better UX than gating.** At a permission prompt you want to say no
quickly; composing a modified command is a separate activity. Denying first and
editing after matches what the user is actually doing at each moment.

#### The abandoned gating design, and why

Originally: intercept the approval and let the user answer it with an
instruction. **A mod can restyle most of the interface but not the permission
prompt** — the docs are unambiguous that "it can't change what a prompt shows
you."

The workaround was to compose two hooks: `tool.call` can return
`{ deny: reason }` and the reason reaches Claude (that *is*
reject-with-a-comment), while `tool.check` fires afterwards and reveals the
decision the rules and permission mode reached, which would let the mod act only
on calls that *would* have been asked about.

**The blocker:** `tool.check` returns only a decision, with no documented reason
field — and the reason lives on `tool.call`, which fires *earlier*, before the
mod knows whether approval will be asked for at all. The design is ordered
wrong, with no clean fix visible from the docs.

**Kept as a record of why not to try it again.** The additive version needs none
of it.

### E8 — Other built-in tools
**Status:** proposed
**Largely superseded by P3.** Most of what this entry wanted is reached by
*reading* the transcript rather than hooking the tool:

| Tool | Reached by | Entry |
|---|---|---|
| `Edit` / `Write` | reading the diff after the fact | **E15** |
| `Bash` (denied) | reading the denied call | **E5** |
| `TodoWrite` | reading the list | P3 source table |
| `ExitPlanMode` | possibly already text in the transcript | P3 source table — may come free in phase 1 |

**What is left that genuinely needs a hook:**

| Tool | Why | Gate or enrich |
|---|---|---|
| `Task` (subagents) | a *live* status pane needs to follow the run, not read it afterwards | Enrich |
| `WebSearch` / `WebFetch` | results as a pickable list, if picking should feed back into the same turn | Enrich |

**The principle worth keeping from the original entry:** `AskUserQuestion` is the
only built-in tool whose *purpose* is a human decision. Every other tool is
Claude doing work — so intercepting those adds interruptions rather than
decisions. Confusing the two produces a mod that interrupts constantly.

# Rendering

### D21 — The selected block takes the selection colour
**Status:** settled · added by 2026-10-13

**The selected block takes Claude Code's text-selection colour as its
background** (theme key `selectionBg`). Unselected blocks carry no highlight,
only their mark glyph (`✓ ✗ ✎ 💬`). The menu hangs under the selected block from
a dim `└`; the verb under the cursor is the primary button, the rest dim. A
comment shows under its block as `→ text`, not a second ✎.

**Why:** the reply carries no accent colour, and the theme key follows light and
dark themes. A `Box` background around a block's `Markdown` paints behind the
text, though `Markdown` itself takes no background. `selectionBg` comes from the
binary, not the documented API.

**Tried and dropped:**
- **A gutter column** — bright `▎` on the selected block, dim `▏` on the others.
  The dim bar on every block was noise, and the single `▎` too faint: the
  selection and its menu blended into the reply.
- **A solid accent bar** down the selected block's full height.
- **Other backgrounds:** `gray` (too strong), `blackBright` (close, still bright),
  a raw hex (too faint), a background for staged blocks (too much colour in the
  reply).
- **Per-block borders** — noisy, and two rows each.

**Revisions**
- **2026-10-15** — an accent bar on the selected block only, in place of the
  gutter on every block.
- **2026-10-17** — the selection colour in place of the bar.
- **2026-11-10** — retitled from "Selection highlighting is a gutter column".

---

### D33 — Share Claude Code's surfaces with other mods; redraw only when needed
**Status:** settled · added 2026-10-17

Every surface Synaptik draws on except its own panes is shared with other mods,
and each is a **chain**: a hook that answers without `next(e)` hides every mod
beneath it. Found with the test bench's `neighbour-mod` and its greedy toggle
(#12):

- **Chain order follows load order** — the order of `--plugin-dir` flags. The
  first loaded sits highest.
- **One mod redraws a reply.** Synaptik's in-place marks redraw the whole reply
  (`next(e)` returns an opaque handle that cannot be edited), so it cannot add to
  what a mod beneath draws. Whichever mod is higher wins that reply; a mod above
  that wraps with `next(e)` coexists.
- **A pane belongs to one mod;** with several, they become tabs.

**Decisions:**
1. **The band composes** with `next(e)`, Synaptik's lines last under a header,
   during a review as well — so another mod's button is a stop in the ring.
2. **The reply is redrawn only when needed:** during a review, or when a block in
   that piece of the reply is marked or being commented. Otherwise it is passed
   through with `next(e)`. Most replies are never marked, so for most of a
   session Synaptik is invisible in the chain. During a fullscreen review the
   reply is Synaptik's, block by block (D41).
3. **In classic, everything essential lives in the navigator,** which no other
   mod can take: a greedy mod above Synaptik removed its in-place marks and band
   lines, and the navigator kept working — ↑/↓, verbs, comments, the suggestion.
   **Fullscreen has no navigator, so a greedy mod above Synaptik can block the
   review:** it takes the reply, and with it the blocks' focus and keys. Tested.

**Rejected:** calling `next(e)` for the reply and discarding the result — other
mods would run, nothing of theirs would show, and the reply would be drawn twice.

**Known risk, accepted for now:** while Synaptik redraws a reply it draws the
**transcript's** text. A mod beneath it that changes a reply's text — hiding
secrets, translating — is bypassed for that reply. Decision 2 narrows the window
to reviewing and marked pieces; it does not close it. Revisit if such a mod
appears; the upstream fix is a way to share one reply drawing (#23).

**Revisions**
- **2026-10-27** — during a fullscreen review the reply is Synaptik's, block by
  block (D41, #39).
- **2026-11-07** — the band composes during a review too (#171). Standing alone as
  the review's key legend dropped every mod loaded after Synaptik from the band,
  buttons and hotkeys too, and `ctrl+x tab` (the band's ring, every mod's) only
  ever reached Synaptik's actions.
- **2026-11-10** — the navigator finding and decision 3 merged; classic only.

---

### D35 — In-place marks stay after the review
**Status:** settled · added 2026-10-18

During a review the reply shows the selection, menu, glyphs and comments. **After
the review, glyphs and comment lines stay on marked pieces of the reply** — it
reads as the form you filled (D1). Decided on #36.

**Why:** for someone using Synaptik alone, persistent marks are the better view.
**The cost:** a marked piece is redrawn by Synaptik, so a mod that draws on
replies, or changes their text, loses that piece (D33). Unmarked pieces stay
theirs.

The band summary and the compiled prompt in the prompt box show everything
staged, whatever the reply shows.

**Revisions**
- **2026-11-10** — the option to show marks only while reviewing was never built;
  it is a proposal (E17), no longer part of this decision. Retitled from
  "In-place marks after review: a configuration option, on by default".

---

### D41 — Fullscreen reviews in the reply itself; classic keeps its pane
**Status:** settled · added 2026-10-27

**In fullscreen there is no navigator pane: the review happens in the reply.**
During a review each block is drawn by its own `Client` (a region the mod's own
module draws), so **a click on a block selects it** and hands the reply the
keyboard: the arrows, the action keys, and typing a comment in place under its
block. The full keymap and the band's wording are SPEC §10.

**Why:** the pane existed to turn ↑/↓ into blocks (the scroll trick, D20) and to
hold the comment field. A `Client` receives every key once clicked, arrows and
typed text included, so the review can happen where the reply is. The ~24 columns
beside the transcript, which #39 never found a good use for, go back to the
reply.

**Block `Client`s exist only during a review.** A `Client` holds the pointer from
down to up, and the transcript selects nothing inside one, so a reply drawn as
`Client`s could not be selected or copied. Outside a review the reply is drawn as
in classic — passed through, or with its marks in place — and selects as usual.
So a click on a block selects within a review; it doesn't start one.

**A review starts two ways**, both named by the band's hint line, a `Client` that
alternates them on its own timer:
- **A click on the hint** starts the review and hands it the raw keys.
- **`ctrl+x tab`** focuses the band, and the review runs from there. Only a click
  can focus a `Client`, so the keyboard path goes through the band: `j` / `k`
  move between blocks (↑/↓ scroll the band there), ←/→ walk the actions, and a
  comment is typed in a field in the band. The selection and the menu still show
  in the reply. Claude Code reports a click elsewhere in the band exactly as
  `ctrl+x tab`, so that click starts a band review too.

Both paths are always on, with no setting. The hint stays drawn during the review
as its legend, because removing the element that holds the keyboard gives the
keyboard back to the prompt.

**`q` ends a review**, from the reply, the band or the hint (in a comment, `q`
types a `q`). Ending a review draws the band's controls under new keys: the one
holding the keyboard disappears, and Claude Code hands the keyboard back to the
prompt, which a mod cannot do directly. **Esc is the natural key, but no mod sees
it.** If Claude Code ever reports Esc, Esc ends the review and is what the legend
names; `q` keeps working, unadvertised.

**The band's ring stays shared.** Synaptik's hidden actions are in the band, the
first takes the ring, and another mod's button is a stop among them. ←/→ past the
actions land on it, and the review ends. Its hotkey works while the band has the
keyboard; after a click on a block the keys are the `Client`'s, and it does not.
**Rejected:** refusing other mods' stops during a review (`ui.focus`,
`{ deny }`). It worked, but a button with no hotkey could then not be reached from
the keyboard at all. Those stops are not Synaptik's to take away, and no "next
mod" key can replace them: mods share the one band, and a hotkey is a single
letter or digit.

**Classic keeps its pane** above the band, as it is. It cannot redraw a reply
that has scrolled off, so its block viewer is how those blocks are reviewed, and
it has no clicks. Its pane takes Tab/⇧Tab for the actions (D42).

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

**Known limits, asked of Claude Code (#23, #64):**
- **Esc is invisible**, from a `Client` and from the band alike. Hence `q`.
- **The keyboard cannot focus a `Client`.** Hence the band path.
- **Revealing the reply works only from `j` / `k`.** `$.ui.scroll` moves a
  transcript row only in answer to the person's own input; a key in a `Client`
  reaches the hooks as a post, which is refused (`not person-initiated`). So
  after a click ↑/↓ never scroll the reply.
- **Backspace and `ctrl+u` work after a click only.** The band and the pane can't
  bind Backspace, so from the band a ✎ goes only by overwriting it; there `ctrl+u`
  empties only the current line of Claude Code's own `Input`.

**Revisions**
- **2026-10-27** — decided on a spike (`spike/client-reply`, Claude Code 2.1.308),
  built on #39. It revises D20 (navigation), D31 (the pane, now classic only) and
  D38 (the key setup, now classic only).
- **2026-10-28** — review mode: the block `Client`s are drawn only during a review,
  since they block text selection, so a click on a block selects within a review
  rather than starting one. The band's hint names the two ways in; `q` ends a
  review.
- **2026-10-30** — found on the test bench (2.1.308): the band's ring stays
  shared; revealing works only from `j` / `k`; Backspace unmarks and `ctrl+u`
  empties a comment, after a click.
- **2026-11-10** — condensed to the decisions and their reasons; the keymap and
  the band's wording are the spec's.

---

## Extensions

### E5 — Edit and resend a denied command
**Status:** proposed · added by 2026-10-13

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

#### Tried and dropped: gating the approval

Intercept the approval and let the user answer it with an
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

**Revisions**
- **2026-10-13** — rebuilt additively under P3; the gating design is abandoned.

---

### E8 — Other built-in tools
**Status:** proposed · added by 2026-10-14

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

---

### E17 — Marks only while reviewing
**Status:** proposed · added 2026-11-10

A switch that leaves the reply entirely to Claude Code outside a review: no glyphs
or comment lines on marked pieces, the reply passed through with `next(e)` until
the next review starts. The band and the suggestion still show what is staged.

**Why:** with other mods drawing on replies, or a mod that changes a reply's text,
Synaptik's redraw of a marked piece takes that piece from them (D33). Switching
marks off outside a review hands every reply back.

**Needs:** a configuration surface (E10). Considered on #36 alongside D35, and
left out until someone needs it.

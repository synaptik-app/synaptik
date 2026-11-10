# Sending

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
actions · ⏎ apply · ⌫ unmark · q done` (from the band, `j/k blocks` and no `⌫`). In **classic**:

| State | Text |
|---|---|
| Not in the navigator, nothing staged | `⎿  ctrl+x tab to review the reply` |
| Not in the navigator, something staged | `⎿  ctrl+x tab to continue reviewing` |
| In the navigator | `⎿  Block 3 of 12 · ↑↓ blocks · tab/⇧tab actions · ⏎ apply · esc done` |

The same words as fullscreen; how to send is the staged line's (above). `q` is
done too, as in fullscreen, though only Esc is shown: the pane sees Esc, and `q`
draws its actions under new keys so the one holding the keyboard disappears.

**The band is shared with every mod.** A hook that answers without `next(e)`
hides every mod beneath it. Synaptik draws what `next(e)` returns and adds its
lines below it, during a review too: `ctrl+x tab` is the band's ring, every mod's,
so another mod's buttons stay stops in it and its hotkeys work while the band has
the keyboard (#171). Synaptik's own band controls carry their hotkeys (`a x c d j k
s q`) only while its review holds the band: a clashing key otherwise reached
Synaptik's, whichever mod had the ring and whatever the load order. Claude Code's own drawing
(an engine node) may sit in what `next(e)` returns, and **an engine node under a
`Box` with `width` is refused** — the whole band falls back to Claude Code's own —
so `width` is set only on the box around Synaptik's own lines.

The keys named are Claude Code's defaults: `ctrl+x tab` to enter, `tab/⇧tab` for the verbs. Synaptik reads no bindings (D32).

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
  box to add them (it writes the box only to expand a shortened suggestion the
  person took, below). A line not led by a glyph, and any prompt of the person's own,
  is left alone.
- **A suggestion cannot be withdrawn**: there is no call for it, a blank one
  cannot show, and writing to the box does not dismiss it. When the last mark is
  cleared, the mod proposes a harmless placeholder instead — currently `Give me a
  sec to read through this.` (wording provisional).
- **Shortened, always**: the first 3 lines, then `… (+9 lines)`, so the box
  doesn't grow with every mark — in a review and out of one, in either renderer.
  Taking it (`→`/`Tab`) puts the full text in the box. A suggestion shows only
  while the box is empty, so the short one is never seen beside a draft.
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

**A marked code line** nests under its block, with its number from 1, counted from
the block's first line of code, and the line trimmed to 60 characters. A blank line
has only its number. The block goes first, for context, even when it has no mark:

```
"const routes = [ { path: '/api/v1/users'," (code block)
    ✗ line 4: "{ path: '/api/v1/resource/004', method: 'GET' }," → drop this route
    ✓ line 5 (blank)
```

**A marked table row** nests the same way, with its number from 1, counted from the
first data row, and its cells joined and trimmed to 60 characters:

```
"table: Option · Latency · Cost"
    ✗ row 2: "Memcached · low · $" → too little durability
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
happened, no transcript. Its lines nest under the block's quote, after the 💬:

```
💬 "Use Redis for the session cache"
    Actions:
    - Add a 5-minute TTL to each entry.
    - Drop the memcached fallback.
    Decisions: Keep Redis; durability isn't needed.
```

A block with a mark and an included thread gets both lines, the mark first.

A line's or row's thread nests under its block as a marked line does, the block
quoted first for context:

```
"const routes = [ { path: '/api/v1/users'," (code block)
    💬 line 4: "{ path: '/api/v1/resource/004', method: 'GET' },"
        Actions: Drop this route; nothing calls it.
```

Accepting a parent while rejecting a child is normal refinement — the nesting
makes it readable. Rejecting a parent while accepting a child is contradictory;
send it anyway and let the agent sort it out.

---

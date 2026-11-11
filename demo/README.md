# Demo

The set for the README's hero GIF (#190): a session whose agent gives two fixed
replies (`CLAUDE.md`), and a [VHS](https://github.com/charmbracelet/vhs) tape
(`demo.tape`) that types every key. Every take is the same; re-recording is one
command.

## Record

```bash
brew install vhs          # once; brings ttyd, uses ffmpeg
vhs demo/demo.tape        # from the repository root
```

It writes `.github/assets/demo.gif` directly.

**Before the first run**, in a terminal of your own:

- **Log in** to Claude Code. VHS runs `claude` in its own headless terminal, as
  you, so it uses your login.
- **Fullscreen** is forced by the tape (`CLAUDE_CODE_NO_FLICKER=1`): in VHS's
  headless terminal Claude Code can fall back to the classic renderer, whatever
  `/tui` says.
- **Nothing of your own setup shows:** the tape starts Claude Code with
  `settings.json` (a blank status line), the default permission mode, and Haiku.
- **Trust the folder:** run `cd demo && claude --plugin-dir ../hosts/claude-code`
  once and accept, so no prompt appears during the take.

## What it shows

About 15 seconds, looping. It opens on Claude Code's welcome header. Off camera the tape starts the session, sends the
prompt, gets Reply 1, and marks two blocks from the band (`ctrl+x tab`). Then:

| | Keys | On screen |
|---|---|---|
| 1 | — | Reply 1 under review: ✓ on *1. Cache sessions in Redis*, ✗ on *Expire entries after 5 minutes* |
| 2 | `j` `j` | the selection moves down to *2. Rate-limit `/login`…* |
| 3 | `c`, `per account, not per IP`, `⏎` | ✎ on it, the comment under it |
| 4 | `q`, `Esc` | the review ends; the prompt box shows it as a dim suggestion. `Esc` gives the keyboard back to the prompt — on the band path `q` alone doesn't yet (#203) |
| 5 | `Tab`, `⏎` | the prompt is sent, as your own message, and Reply 2 answers it — held a few seconds |

Ending on the sent prompt is the point: one prompt, in your own words. The
README's caption under the GIF names the keys:
*`j` move · `c` comment · `q` done · `Tab` take · `⏎` send*.

Reply 1 has nine blocks (0–8), and a review starts on the last. The tape counts
on that: `k` × 7 to block 1, `j` × 2 to block 3, `j` × 2 to block 5. If Reply 1
changes, recount (`src/blocks.ts`'s `segment` gives the blocks).

## Targets

10–15 s, under 2 MB, about 900 px wide (GitHub's README column), 16 px font, a
high-contrast theme. Check that ✓ ✗ ✎ draw in the GIF's font.

If a take misfires, the usual cause is a `Sleep` too short for the reply to
arrive: lengthen the hidden ones, not the ones on camera.

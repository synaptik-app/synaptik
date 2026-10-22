# Demo

The set for the README's GIF: a session whose agent gives two fixed replies, so
every take is the same. `CLAUDE.md` holds them.

## Run

```bash
cd demo && claude --plugin-dir ../hosts/claude-code
```

Fullscreen renderer, a terminal about 150 columns wide (so the navigator opens
beside the reply), a font size that reads well at GIF width.

## Script

1. **Type the prompt:**

   > sessions are slow and bots hammer /login, ideas?

2. **Reply 1 arrives.** Start reviewing: `ctrl+x tab` (or `ctrl+s` with the
   bindings from `/synaptik config`).
3. **Mark**, moving with ↓:

   | Block | Key | Mark |
   |---|---|---|
   | 1. Cache sessions in Redis | `a` | ✓ |
   | Key each entry by user | `a` | ✓ |
   | Expire entries after 5 minutes | `x` | ✗ |
   | 2. Rate-limit /login | `c`, type `make it 5 attempts per minute per account`, ⏎ | ✎ |
   | 4. Ship it behind a flag | `a` | ✓ |

   Skip the rest: unmarked blocks are left out.
4. **Esc.** The compiled prompt sits in the prompt box as a dim suggestion:

   ```
   ✓ "1. Cache sessions in Redis in front of..."
       ✓ "Key each entry by user: session:{userId}"
       ✗ "Expire entries after 5 minutes"
   ✎ "2. Rate-limit /login to 20 requests per minute..." → make it 5 attempts per minute per account
   ✓ "4. Ship it behind a flag, and compare..."
   ```

5. **Tab** takes it, **⏎** sends it. Reply 2 says what was done.

Pause a beat after each step, so the GIF reads.

## Record

```bash
brew install gifski
```

⌘⇧5 → record the terminal window → stop. Then:

```bash
gifski --fps 12 --width 1000 -o demo.gif ~/Desktop/Screen\ Recording*.mov
```

Keep it under about 30 seconds and 5 MB, and put it at `.github/assets/demo.gif`.

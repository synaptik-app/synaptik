# The README's hero GIF (#190). From the repository root:
#
#   vhs demo/demo.tape
#
# It types every key itself; the reply is fixed by demo/CLAUDE.md, so every take
# is the same. demo/README.md says what has to be set up first.

Output .github/assets/demo.gif

Set Shell "zsh"
Set FontSize 16
Set Width 900
# Tall enough for Claude Code's welcome header, mascot included, above the
# prompt. Tune it if the header is cut at the top.
Set Height 660
Set Padding 16
Set Theme "Dracula"
Set TypingSpeed 20ms

# Fullscreen, always: Claude Code may fall back to classic in VHS's headless
# terminal, whatever /tui says. This is its own switch to force fullscreen.
Env CLAUDE_CODE_NO_FLICKER "1"

# --- Off camera: start the session, get Reply 1, mark two blocks ---------------
# demo/settings.json blanks the status line, and the default permission mode
# keeps your own off camera.
Hide
Type "cd demo && claude --plugin-dir ../hosts/claude-code --settings settings.json --permission-mode default --model opus" Enter
Sleep 6s
Type "sessions are slow and bots hammer /login, ideas?" Enter
Sleep 10s

# The review starts on the last block (8). Up to "1. Cache sessions" (1): accept.
# The moves go at 120 ms a key: typed faster, Claude Code drops one, and every
# mark lands a block off.
Ctrl+X
Tab
Sleep 800ms
Type@120ms "kkkkkkk"
Sleep 300ms
Type "a"
Sleep 300ms
# Down to "Expire entries after 5 minutes" (3): reject.
Type@120ms "jj"
Sleep 300ms
Type "x"
Sleep 1s
Show

# --- On camera, about 12 s ---------------------------------------------------
Sleep 1.5s

# Down to "2. Rate-limit /login" (5), one block at a time so the move shows.
Type "j"
Sleep 600ms
Type "j"
Sleep 800ms

# Comment on it, typed as a person would: unhurried, a beat between the words.
Type "c"
Sleep 500ms
Type@110ms "make it 5 requests per account,"
Sleep 300ms
Type@90ms " not per IP"
Sleep 600ms
Enter
Sleep 1s

# Down to "4. Ship it behind a flag" (7), and accept it.
Type "j"
Sleep 500ms
Type "j"
Sleep 600ms
Type "a"
Sleep 1s

# Done: the review becomes a dim suggestion in the prompt box. On the band path
# q leaves the keyboard in the band (#203), so Esc hands it back to the prompt.
Type "q"
Sleep 1.2s
Escape
Sleep 600ms

# Take it, send it; Reply 2 arrives, and stays on screen a few seconds before
# the loop.
Tab
Sleep 1.2s
Enter
Sleep 5.5s

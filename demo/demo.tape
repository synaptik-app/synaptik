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
# Low enough that Claude Code's welcome header scrolls off: the take starts at
# the prompt. Tune it if the header shows, or the prompt line is cut.
Set Height 520
Set Padding 16
Set Theme "Dracula"
Set TypingSpeed 20ms

# Fullscreen, always: Claude Code may fall back to classic in VHS's headless
# terminal, whatever /tui says. This is its own switch to force fullscreen.
Env CLAUDE_CODE_NO_FLICKER "1"

# --- Off camera: start the session, get Reply 1, mark two blocks ---------------
# demo/settings.json blanks the status line; the default permission mode drops
# the mode line; Haiku is quickest, and the replies are fixed anyway.
Hide
Type "cd demo && claude --plugin-dir ../hosts/claude-code --settings settings.json --permission-mode default --model haiku" Enter
Sleep 6s
Type "sessions are slow and bots hammer /login, ideas?" Enter
Sleep 10s

# The review starts on the last block (8). Up to "1. Cache sessions" (1): accept.
Ctrl+X
Tab
Sleep 500ms
Type "kkkkkkk"
Type "a"
# Down to "Expire entries after 5 minutes" (3): reject.
Type "jj"
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
Type@110ms "per account,"
Sleep 300ms
Type@90ms " not per IP"
Sleep 600ms
Enter
Sleep 1s

# Done: the review becomes a dim suggestion in the prompt box. On the band path
# q leaves the keyboard in the band (#203), so Esc hands it back to the prompt.
Type "q"
Sleep 1.2s
Escape
Sleep 600ms

# Take it, send it, and hold on the sent prompt.
Tab
Sleep 1.2s
Enter
Sleep 2.5s

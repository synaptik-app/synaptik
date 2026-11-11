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
Set Height 620
Set Padding 16
Set Theme "Dracula"
Set TypingSpeed 60ms

# --- Off camera: start the session, get Reply 1, mark two blocks ---------------
Hide
Type "cd demo && claude --plugin-dir ../hosts/claude-code" Enter
Sleep 6s
Type "sessions are slow and bots hammer /login, ideas?" Enter
Sleep 12s

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

# Comment on it.
Type "c"
Sleep 400ms
Type "per account, not per IP"
Sleep 500ms
Enter
Sleep 1s

# Done: the review becomes a dim suggestion in the prompt box.
Type "q"
Sleep 1.8s

# Take it, send it, and hold on the sent prompt.
Tab
Sleep 1.2s
Enter
Sleep 2.5s

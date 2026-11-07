## Neighbour test

Synaptik next to another mod, sharing the band, the reply and the prompt box. Start the session with both: `claude --plugin-dir ../hosts/claude-code --plugin-dir ./neighbour-mod`, fullscreen. The reply is short on purpose: the test is about the shared surfaces. Run it rarely: when the mods API changes how mods share a surface.

1. A first item to mark
2. A second item to mark

A closing paragraph.

### Steps

Each step says what to **do**, then what to **expect**. Mark each expectation: ✓ if you saw it, ✗ with a comment if not. Marks on the reply above are part of the test, not results.

1. **Do:** look at the band
   - **Expect:** the neighbour's line shows as well as Synaptik's
2. **Do:** press `ctrl+x tab` once
   - **Expect:** one press starts the review
3. **Do:** press `→` past Synaptik's last action
   - **Expect:** the cursor lands on the neighbour's ping, and the review ends
4. **Do:** press `ctrl+x tab`, then `n`, then `a`
   - **Expect:** `n` pings the neighbour, as a click on its ping does; `a` still reaches Synaptik
5. **Do:** press `ctrl+x tab`, `→` onto the neighbour's `clash`, wait a moment, press `a`
   - **Expect:** the toast says "neighbour: clash (a)", and no block gets ✓: with the ring on another mod's button, Synaptik's keys are off
   - **Expect:** `←` back onto Synaptik's actions, then `a`: ✓ on the selected block
6. **Do:** press `q`, click the band's "click here to review the reply", click a block, then press `x` and `n`
   - **Expect:** `x` reaches Synaptik; `n` does nothing for the neighbour
7. **Do:** scroll up to an older reply
   - **Expect:** older replies end with "— neighbour saw this reply"; the reply Synaptik marks does not
8. **Do:** press `q`, empty the prompt box, run `/neighbour suggest`, then mark a block
   - **Expect:** a toast says `{"isShown":true}`, and the box shows the neighbour's dim suggestion
   - **Expect:** after the mark, Synaptik's suggestion takes its place: the last one proposed wins
9. **Do:** restart with the neighbour first (`claude --plugin-dir ./neighbour-mod --plugin-dir ../hosts/claude-code`), run `/neighbour greedy on`, then run this test again and review it
   - **Expect:** Synaptik's marks don't show in the reply, but the review still works: moving, actions, comments, the suggestion

When you're done: click the first **Expect:**, mark every expectation, press `q`, `Tab`, then `⏎`. The test session answers with a table of your results.

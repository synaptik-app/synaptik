## Neighbour test

Run with the neighbour mod loaded next to Synaptik, in fullscreen. This reply is short on purpose: the test is about the shared surfaces, not the reply.

1. A first item to mark
2. A second item to mark

A closing paragraph.

### What to check

- **The band**
  - The band shows the neighbour's line as well as Synaptik's, mod on
- **A review from ctrl+x tab**
  - One ctrl+x tab starts the review
  - ←/→ walk only Synaptik's actions, never the neighbour's ping
  - Pressing n in the band pings the neighbour, and a, x, c, d still reach Synaptik
- **A review from a click on a block**
  - a, x, c, d reach Synaptik, and n does not reach the neighbour
- **The reply and the suggestion**
  - Older replies show "— neighbour saw this reply"; the reply Synaptik marks does not (one mod redraws a reply at a time)
  - /neighbour suggest, prompt box empty: does its suggestion show, and which one stays after marking a block
- **A less polite neighbour**
  - With the neighbour loaded first and /neighbour greedy on: Synaptik's marks vanish from the reply, but the review still works — moving, actions, comments, the suggestion

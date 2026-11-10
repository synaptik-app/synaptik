## Tables test

Stepping into tables: rows, wrapped rows, marks on rows, and a table narrowed into a list. Fullscreen (`/tui fullscreen`).

A table to step into:

| Option | Latency | Cost |
|---|---|---|
| Redis | low | $$ |
| Memcached | low | $ |
| Postgres | medium | $ |

A table with a long cell, which may wrap:

| Name | Notes |
|---|---|
| short | fine |
| long | a cell with enough text in it that it has to wrap onto a second row in most terminals, and then some more of it to be certain |
| after | the row after the long one |

### Steps

Each step says what to **do**, then what to **expect**. Mark each expectation: ✓ if you saw it, ✗ with a comment if not. Marks on the reply above are part of the test, not results.

1. **Do:** click the band's "click here to review the reply", then click the first table
   - **Expect:** its menu has a fifth action, `↳ step in`
2. **Do:** press `s`
   - **Expect:** the first data row is selected, not the header; only that row has the background
   - **Expect:** the grid otherwise looks as before, nothing moved
   - **Expect:** the band says "Row 1 of 3 · ↑↓ rows"
3. **Do:** press `↓` three times
   - **Expect:** the selection moves a row at a time, never onto a border line, and stops on the last row
4. **Do:** press `↑` to "Memcached", `x`; then `↓`, `c`, type `too slow`, press `⏎`
   - **Expect:** ✗ and ✎ sit in the margin by their rows, stepped in and out
   - **Expect:** the comment shows under the Postgres row while it is selected
5. **Do:** press `q`, then `q` again
   - **Expect:** the table shows ✸ in its margin
   - **Expect:** the suggestion quotes `"table: Option · Latency · Cost"`, with `✗ row 2: "Memcached · low · $"` and `✎ row 3: "Postgres · medium · $" → too slow` nested under it
6. **Do:** click the second table, press `s`, then `↓` to the long row
   - **Expect:** the long row is selected whole, every row it wraps onto
   - **Expect:** `↓` from it goes to "after", not into its wrapped text
7. **Do:** narrow the terminal until the second table is drawn as a list, then press `↑` and `↓`
   - **Expect:** `↑`/`↓` still select one whole row at a time

When you're done: click the first **Expect:**, mark every expectation, press `q`, `Tab`, then `⏎`. The test session answers with a table of your results.

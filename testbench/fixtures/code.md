## Code test

The awkward cases for stepping into code. Run it in fullscreen.

```ts
/* A multi-line comment:
   step onto this line, and the next.
   It should stay comment-coloured. */
const routes = [
  { path: '/api/v1/users', method: 'GET' }, // a trailing comment
  { path: '/api/v1/teams', method: 'POST' },
]

const message = `a template string
  that spans ${routes.length} lines,
  which should stay string-coloured`

export function handler(req: Request): Response {
  return new Response(message, { status: 200 })
}
```

A paragraph between the two, to walk across.

```python
"""A docstring over
several lines, which should
stay string-coloured."""

def greet(name: str) -> str:
    # an ordinary comment
    return f"hello {name}"
```

A very long line, to see wrapping:

```bash
curl --request POST --url https://example.com/api/v1/resource --header 'content-type: application/json' --data '{"name": "a value long enough to wrap in most terminals", "other": "and some more of it"}'
echo done
```

A block with no language:

```
plain text
in a fence
```

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

### What to check

- **Stepping in**
  - A code block's menu has a 5th action, step in; other blocks keep their four
  - s or step in enters the block on its first line; s, q or step out returns to it
  - After ctrl+x tab: s steps in, j / k move between lines, q steps out
- **How it looks**
  - Colours and layout match the block before stepping in, and nothing jumps
  - Multi-line comments and strings keep their colour on every line, above and below the selection
  - Only the selected line has the background, with the menu right under it
  - After the long line in the bash block, the selection and the menu still sit on the right line
- **Marks on a line**
  - a / x / c on a line stage it, its glyph in the margin on that line; Backspace takes it off
  - c opens a comment under the line, and a staged comment shows there when the line is selected
  - A block's own mark and its lines' marks can be staged together
  - Outside a review, a block with only marked lines shows ✸ in the margin; its own mark takes that place
  - Backspace on a block takes its own mark, then its lines' marks
- **Tables**
  - A table's menu has step in; ↑/↓ move between its data rows, the band says "Row 1 of 3"
  - The selected row has the background and the menu under it, and the grid otherwise looks unchanged
  - A row that wraps is selected whole, and ↓ goes to the next row, never a border
  - Narrowed until the table turns into a list, ↑/↓ still select whole rows
  - A marked row compiles as row N with its cells, nested under the table's quote
- **The prompt**
  - A marked line compiles nested under its block, with its number and the line trimmed
  - An unmarked block with a marked line is sent as a plain quote ending "(code block)"
  - A blank line compiles as its number alone

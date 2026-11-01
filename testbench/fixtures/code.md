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
- **The prompt**
  - A marked line compiles nested under its block, with its number and the line trimmed
  - An unmarked block with a marked line is sent as a plain quote ending "(code block)"
  - A blank line compiles as its number alone

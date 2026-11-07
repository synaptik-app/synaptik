## Code test

Stepping into code blocks: the colours, the margins, marks on lines, and how they compile. Fullscreen (`/tui fullscreen`).

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
curl --request POST --url "$API_URL/api/v1/resource" --header 'content-type: application/json' --data '{"name": "a value long enough to wrap in most terminals", "other": "and some more of it"}'
echo done
```

A block with no language:

```
plain text
in a fence
```

### Steps

Each step says what to **do**, then what to **expect**. Mark each expectation: ✓ if you saw it, ✗ with a comment if not. Marks on the reply above are part of the test, not results.

**Stepping in and out**

1. **Do:** click the band's "click here to review the reply", then click the TypeScript block, then the paragraph under it
   - **Expect:** the code block's menu has a fifth action, `↳ step in`; the paragraph's has four
2. **Do:** click the TypeScript block again, press `s`
   - **Expect:** its first line is selected, the menu under it ending `↰ step out`
   - **Expect:** the band says "Line 1 of N · ↑↓ lines", and ends "q step out"
   - **Expect:** nothing moved: colours and layout as before stepping in
3. **Do:** press `q`, then click `[ ↳ step in ]` in the menu, then `[ ↰ step out ]`
   - **Expect:** `q` and step out both leave the line for the whole block; step in enters it again

**How it looks**

4. **Do:** step in, press `↓` slowly through the whole block
   - **Expect:** only the selected line has the background, with the menu right under it
   - **Expect:** the multi-line comment stays comment-coloured on every line, above and below the selection
   - **Expect:** the template string stays string-coloured on every line
5. **Do:** step into the Python block, `↓` through the docstring
   - **Expect:** the docstring stays string-coloured on every line
6. **Do:** step into the bash block, `↓` to `echo done`
   - **Expect:** after the long line, which wraps, the selection and the menu sit on `echo done`
7. **Do:** step into the block with no language
   - **Expect:** its two lines can be selected like any other

**Marks on lines**

8. **Do:** in the TypeScript block, `x` on line 2, `a` on line 6, `c` on line 5, type `why GET?`, press `⏎`
   - **Expect:** each glyph sits in the margin on its own line (one row too high while stepped in is #168)
   - **Expect:** the comment shows under line 5 while it is selected
9. **Do:** `x` on the blank line between `]` and `const message`
   - **Expect:** the suggestion names it `line 8 (blank)`
10. **Do:** press `q` to step out, then `q` to end the review
    - **Expect:** the block shows ✸ in its margin: only its lines are marked
    - **Expect:** the suggestion quotes the block plainly, ending `(code block)`, with each marked line nested under it: its number, its text trimmed, and the comment after `→`
11. **Do:** click the TypeScript block, press `a`
    - **Expect:** ✓ takes the ✸'s place; the suggestion has ✓ on the block, its lines still under it
12. **Do:** press `Backspace`, then `Backspace` again
    - **Expect:** the first takes the block's ✓; the second takes its lines' marks

**From the keyboard**

13. **Do:** press `q`, `ctrl+x tab`, `k` up to the TypeScript block, then `s`
    - **Expect:** the band says "Line 1 of N · j/k lines"
14. **Do:** press `j` twice, then `q`
    - **Expect:** `j` moves between lines; `q` steps out to the whole block, still in the review

When you're done: click the first **Expect:**, mark every expectation, press `q`, `Tab`, then `⏎`. The test session answers with a table of your results.

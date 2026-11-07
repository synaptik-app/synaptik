## Nesting test

Which Markdown makes which block, and how nested blocks compile. Any renderer; the steps say fullscreen keys.

1. Top level, numbered
   - Second level, bullet
     - Third level, bullet
   - Second level again
2. Top level, numbered, with a second paragraph

   This paragraph belongs to item 2 and should stay part of the same block.
3. Top level, numbered
   1. Second level, numbered
   2. Second level, numbered

- Top level bullet
  1. Numbered under a bullet
  2. Numbered under a bullet

---

### Markdown the segmenter has to get right

Steps:
1. Run the tests:

   ```sh
   npm test
   ```
2. Deploy, then check `SESSION_CACHE` in config_prod
   - watch the error rate
   - roll back if it climbs

   Back at item 2's indent, after its nested items.

9. Nine
10. Ten
    - nested under ten
- Nested by four spaces in the source
    - one level down, not two

He wrote:
> The cache is stale
> > and so is this
> - and a list inside the quote

Setext heading
--------------

Option | Latency
--|--
Redis | low

````md
```js
x()
```
````

### Steps

Each step says what to **do**, then what to **expect**. Mark each expectation: ✓ if you saw it, ✗ with a comment if not. Marks on the reply above are part of the test, not results.

1. **Do:** click the first list item, then press `↓` down to the four-backtick fence
   - **Expect:** the headings ("Markdown the segmenter…", "Setext heading") are skipped
   - **Expect:** each list item is its own block, nested ones too
   - **Expect:** item 2 and its second paragraph are one block
   - **Expect:** "Steps:" and the list under it are separate blocks, and so are "He wrote:" and its quote
   - **Expect:** "Back at item 2's indent" is a block of its own
   - **Expect:** one block each: the code blocks, the quote with its nested quote and list, the table without outer pipes, the four-backtick fence
2. **Do:** press `a` on "Third level, bullet"
   - **Expect:** ✓ before it
   - **Expect:** in the suggestion, "1. Top level, numbered" and "Second level, bullet" as plain quotes, and ✓ "Third level, bullet" indented under them
3. **Do:** press `x` on "2. Second level, numbered", then `a` on "1. Second level, numbered"
   - **Expect:** both in the suggestion with their numbers, told apart
4. **Do:** press `a` on "1. Top level, numbered", then `x` on "Second level, bullet"
   - **Expect:** ✓ "1. Top level, numbered", with ✗ "Second level, bullet" indented under it
5. **Do:** press `a` on the `npm test` code block, under "1. Run the tests:"
   - **Expect:** it compiles indented under "1. Run the tests:"
6. **Do:** press `a` on "watch the error rate"
   - **Expect:** it compiles under "2. Deploy, then check SESSION_CACHE in config_prod", underscores intact

When you're done: click the first **Expect:**, mark every expectation, press `q`, `Tab`, then `⏎`. The test session answers with a table of your results.

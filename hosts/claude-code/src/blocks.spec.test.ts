// SPEC §3, row by row, and the Markdown the spike's segmenter never met (#50).
// Each case is a reply's text in, an outline of its segments out: a block as
// its depth in spaces and its first line, anything else as "(not a block)".

import { expect, test } from 'claude-code/testing'

import { quote, segment } from './blocks'

const outline = (text: string) =>
  segment(text).map(s =>
    s.isBlock ? `${'  '.repeat(s.depth)}${s.text.trim().split('\n')[0]}` : `(not a block) ${s.text.split('\n')[0]}`,
  )
const blocks = (text: string) => segment(text).filter(s => s.isBlock)

// --- SPEC §3's table ---------------------------------------------------------

test('§3 a paragraph wrapped over several lines is one block', async () => {
  expect(outline('One sentence\nwrapped onto\nthree lines.')).toEqual(['One sentence'])
})

test('§3 a fenced code block is one block, blank lines and all', async () => {
  expect(outline('```ts\nconst a = 1\n\nconst b = 2\n```')).toEqual(['```ts'])
})

test('§3 a table is one block', async () => {
  expect(outline('| a | b |\n|---|---|\n| 1 | 2 |')).toEqual(['| a | b |'])
})

test('§3 a blockquote over several lines is one block', async () => {
  expect(outline('> first line\n> second line\n>\n> after a quoted blank')).toEqual(['> first line'])
})

test('§3 headings and rules are not blocks', async () => {
  expect(outline('# One\n\nText\n\n---\n\n***\n\n___')).toEqual([
    '(not a block) # One',
    'Text',
    '(not a block) ---',
    '(not a block) ***',
    '(not a block) ___',
  ])
})

test('§3 a list item spanning paragraphs is one block', async () => {
  expect(outline('- first\n\n  still the first item\n- second')).toEqual(['- first', '- second'])
})

// --- Lists ------------------------------------------------------------------

test('lists: *, + and 1) markers are list items', async () => {
  expect(outline('* star\n+ plus\n1) paren\n2) paren')).toEqual(['* star', '+ plus', '1) paren', '2) paren'])
})

test('lists: nesting by 4 spaces is one level per step, not two', async () => {
  expect(outline('- a\n    - b\n        - c')).toEqual(['- a', '  - b', '    - c'])
})

test('lists: nesting under "10." (4-column marker) is one level', async () => {
  expect(outline('10. ten\n    - under ten\n11. eleven')).toEqual(['10. ten', '  - under ten', '11. eleven'])
})

test('lists: a list right after a paragraph, with no blank line, starts new blocks', async () => {
  expect(outline('Steps:\n1. one\n2. two')).toEqual(['Steps:', '1. one', '2. two'])
})

test('lists: a loose list (blank lines between items) keeps its items apart', async () => {
  expect(outline('- a\n\n- b\n\n- c')).toEqual(['- a', '- b', '- c'])
})

test('lists: a fenced code block inside an item belongs to the item', async () => {
  const text = '1. Run the tests:\n\n   ```sh\n   npm test\n   ```\n2. Deploy'
  expect(outline(text)).toEqual(['1. Run the tests:', '2. Deploy'])
  expect(blocks(text)[0]!.text).toContain('npm test')
})

test('lists: a paragraph back at the parent item’s indent, after a nested item, stays in the list', async () => {
  // Not a top-level paragraph: it is indented to item 1's content. Item 1 can't
  // hold it as one block (its child comes between), so it is a block of its own,
  // under item 1.
  expect(outline('1. A\n   - b\n\n   more about A\n2. B')).toEqual(['1. A', '  - b', '  more about A', '2. B'])
})

// --- Quotes -------------------------------------------------------------------

test('quotes: a list inside a quote stays in the quote', async () => {
  expect(outline('> Options:\n> - one\n> - two')).toEqual(['> Options:'])
})

test('quotes: a nested quote stays in the quote', async () => {
  expect(outline('> outer\n> > inner\n> outer again')).toEqual(['> outer'])
})

test('quotes: a quote right after a paragraph, with no blank line, is its own block', async () => {
  expect(outline('He wrote:\n> the cache is stale')).toEqual(['He wrote:', '> the cache is stale'])
})

// --- Headings, code, tables, HTML ----------------------------------------------

test('headings: a setext heading (underlined with = or -) is not a block', async () => {
  expect(outline('Plan\n====\n\nText\n\nNext\n----\n\nMore')).toEqual([
    '(not a block) Plan',
    'Text',
    '(not a block) Next',
    'More',
  ])
})

test('code: a four-backtick fence holds a three-backtick one', async () => {
  expect(outline('````md\n```js\nx()\n```\n````\n\nAfter')).toEqual(['````md', 'After'])
})

test('tables: a table without leading pipes is one block, after a paragraph too', async () => {
  expect(outline('Compare:\n\na | b\n--|--\n1 | 2')).toEqual(['Compare:', 'a | b'])
})

test('html: an HTML block is one block', async () => {
  expect(outline('<details>\n<summary>Logs</summary>\nnothing here\n</details>')).toEqual(['<details>'])
})

// --- quote(): the opening words, as the prompt and the navigator show them -----

test('quote: keeps underscores, # and > that are part of the text', async () => {
  expect(quote('Set SESSION_CACHE in config_prod')).toBe('Set SESSION_CACHE in config_prod')
  expect(quote('Fixes #12 when a > b')).toBe('Fixes #12 when a > b')
})

test('quote: drops emphasis and code marks', async () => {
  expect(quote('**Cache** the _session_ in `redis`')).toBe('Cache the session in redis')
})

test('quote: a table without leading pipes quotes its header cells', async () => {
  expect(quote('a | b\n--|--\n1 | 2')).toBe('table: a · b')
})

test('quote: a quote drops its > marks', async () => {
  expect(quote('> the cache is stale')).toBe('the cache is stale')
})

// --- Parent and indent ---------------------------------------------------------

test('§3 each block records its parent: the SPEC example’s table', async () => {
  const REPLY = "Here's what I'd suggest:\n\n1. Use Redis for the session cache\n   - per-user key prefix\n   - 5 minute TTL\n2. Add a rate limiter\n\nRun the migration before deploying."
  expect(blocks(REPLY).map(b => b.parent)).toEqual([-1, -1, 1, 1, -1, -1])
})

test('parent: counts blocks only, not headings', async () => {
  expect(blocks('## Plan\n\n- a\n  - b').map(b => b.parent)).toEqual([-1, 0])
})

test('indent: as Claude Code draws nesting — 2 under a bullet, 3 under "1.", 4 under "10."', async () => {
  expect(blocks('- a\n  - b\n    - c').map(b => b.indent)).toEqual([0, 2, 4])
  expect(blocks('1. a\n   - b').map(b => b.indent)).toEqual([0, 3])
  expect(blocks('10. a\n    - b').map(b => b.indent)).toEqual([0, 4])
  // the source's own indent doesn't matter: 4 spaces under a bullet still draws 2
  expect(blocks('- a\n    - b').map(b => b.indent)).toEqual([0, 2])
})

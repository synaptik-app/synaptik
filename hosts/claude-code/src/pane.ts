// What a thread pane draws as Markdown, laid out for the pane's width. Claude
// Code's `Markdown` lays a table out by the terminal's width, so in a pane
// narrower than the terminal a grid comes out too wide and wraps (#233). A table
// whose grid doesn't fit the pane is drawn as records instead; one that fits is
// left to Claude Code, which draws it whole.

import { isTableDelimiter, tableCells } from './blocks'
import { gridFits } from './table'

const FENCE = /^\s*(```|~~~)/

// A table as records: each row's cells as `Header: value`, as Claude Code's own
// fallback draws them, one a line, a blank line between rows. Inline Markdown in
// a cell or header is kept; a header that is empty, or missing for a cell past
// the last, is `Column N`; an empty cell is left out.
function records(lines: readonly string[], indent: string): string[] {
  const header = tableCells(lines[0]!)
  const out: string[] = []
  for (const line of lines.slice(2)) {
    const row = tableCells(line)
    const fields = Array.from({ length: Math.max(header.length, row.length) }, (_, column) => ({
      name: header[column] || `Column ${column + 1}`,
      value: row[column] ?? '',
    }))
      .filter(f => f.value !== '')
      .map(f => `${indent}${f.name}: ${f.value}`)
    if (fields.length === 0) continue
    if (out.length > 0) out.push('')
    // Two spaces at a line's end keep the fields on lines of their own.
    out.push(...fields.map((f, n) => (n < fields.length - 1 ? `${f}  ` : f)))
  }
  return out
}

// The Markdown with each table that doesn't fit `width` columns as records.
export function forPane(markdown: string, width: number): string {
  const lines = markdown.split('\n')
  const out: string[] = []
  let isCode = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    if (FENCE.test(line)) isCode = !isCode
    const next = lines[i + 1]
    if (isCode || !line.includes('|') || next === undefined || !isTableDelimiter(next)) {
      out.push(line)
      continue
    }
    let end = i + 2
    while (end < lines.length && lines[end]!.includes('|') && lines[end]!.trim() !== '') end++
    const table = lines.slice(i, end)
    const indent = line.match(/^\s*/)![0]
    out.push(...(gridFits(table.join('\n'), width) ? table : records(table, indent)))
    i = end - 1
  }
  return out.join('\n')
}

// A thread's table row, as the pane shows what it is about: a record, whatever
// the width. One row reads best that way, and doesn't change shape as the pane
// is resized.
export function rowRecord(source: string): string {
  const lines = source.trim().split('\n')
  if (lines.length < 3 || !isTableDelimiter(lines[1]!)) return source
  return records(lines, '').join('\n') || '(empty row)'
}

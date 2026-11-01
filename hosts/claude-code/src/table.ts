// Where Claude Code draws a table's rows, worked out the way it lays one out
// (read from 2.1.309; no API reports it). A row is as tall as its tallest wrapped
// cell, and a table with no room for its grid is drawn as a list of "Header: value".

import { tableCells } from './blocks'
import { cells } from './review'

// Its room kept free at the terminal's edge, narrowest column, tallest row before
// it gives up on the grid, and the rows it draws before "… more rows".
const SAFETY = 4
const MIN_COLUMN = 3
const MAX_ROW_LINES = 4
export const MAX_ROWS = 200

export type TableLayout = { spans: { top: number; height: number }[]; end: number }

// What a cell draws: its text without the inline marks.
const plain = (cell: string) =>
  cell
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__|~~)(.+?)\1/g, '$2')
    .replace(/(^|[^\w*])[*_](?=\S)(.+?)(?<=\S)[*_](?![\w*])/g, '$1$2')
    .replace(/`+/g, '')
    .replace(/\\\|/g, '|')

// Word wrap as Claude Code calls it: spaces kept where a line breaks, and a word
// too long for the width left whole unless hard, when it is cut.
export function wrap(text: string, width: number, hard = false): string[] {
  const body = text.trimEnd()
  if (width <= 0) return [body]
  const rows = ['']
  const add = (s: string) => {
    rows[rows.length - 1] += s
  }
  body.split(' ').forEach((word, n) => {
    let used = cells(rows[rows.length - 1]!)
    if (n > 0) {
      if (used >= width) {
        rows.push('')
        used = 0
      }
      add(' ')
      used += 1
    }
    const size = cells(word)
    if (hard && size > width) {
      const startingHere = 1 + Math.floor((size - (width - used) - 1) / width)
      if (Math.floor((size - 1) / width) < startingHere) rows.push('')
      for (const ch of word) {
        if (cells(rows[rows.length - 1]!) + cells(ch) > width) rows.push('')
        add(ch)
      }
      return
    }
    if (used + size > width && used > 0 && size > 0) rows.push('')
    add(word)
  })
  const lines = rows.filter(row => row.length > 0)
  return lines.length > 0 ? lines : ['']
}

function columnWidths(table: string[][], room: number): { widths: number[]; hard: boolean } {
  const across = (measure: (cell: string) => number) =>
    table[0]!.map((_, column) => Math.max(...table.map(row => measure(row[column] ?? '')), MIN_COLUMN))
  const ideal = across(cells)
  const least = across(cell => Math.max(0, ...cell.split(/\s+/).filter(Boolean).map(cells)))
  const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0)
  if (sum(ideal) <= room) return { widths: ideal, hard: false }
  if (sum(least) <= room) {
    const spare = room - sum(least)
    const wants = ideal.map((n, column) => n - least[column]!)
    const wanted = sum(wants)
    return { widths: least.map((n, column) => n + (wanted === 0 ? 0 : Math.floor((wants[column]! / wanted) * spare))), hard: false }
  }
  return { widths: least.map(n => Math.max(Math.floor((n * room) / sum(least)), MIN_COLUMN)), hard: true }
}

// The list a table falls back to: each row's cells, a rule between rows.
function asList(header: string[], rows: string[][], width: number): TableLayout {
  const spans: TableLayout['spans'] = []
  let top = 0
  for (const row of rows) {
    const height = row.reduce((total, cell, column) => {
      const name = header[column] ?? ''
      const value = cell.replace(/\s+/g, ' ').trim()
      if (!name && !value) return total
      const first = wrap(value, Math.max(name ? width - cells(name) - 3 : width - 1, 10))
      if (first.length <= 1) return total + 1
      const rest = wrap(first.slice(1).map(line => line.trim()).join(' '), width - 3)
      return total + 1 + rest.filter(line => line.trim()).length
    }, 0)
    spans.push({ top, height })
    top += height + 1
  }
  return { spans, end: Math.max(0, top - 1) }
}

// Where each data row sits in a table `width` columns wide, in rows from its top.
export function tableLayout(text: string, width: number): TableLayout {
  const lines = text.trim().split('\n')
  const header = tableCells(lines[0]!).map(plain)
  const shape = (row: string[]) => header.map((_, column) => row[column] ?? '')
  const all = lines.slice(2).map(line => shape(tableCells(line).map(plain)))
  const rows = all.slice(0, MAX_ROWS)
  const note = all.length > MAX_ROWS ? 1 : 0

  const frame = 1 + header.length * 3
  const room = Math.max(width - frame - SAFETY, header.length * MIN_COLUMN)
  const { widths, hard } = columnWidths([header, ...rows], room)
  const tall = (row: string[]) => Math.max(1, ...row.map((cell, column) => wrap(cell, widths[column]!, hard).length))
  const fits = frame + widths.reduce((a, b) => a + b, 0) <= width - SAFETY
  if (!fits || Math.max(tall(header), ...rows.map(tall)) > MAX_ROW_LINES) {
    const list = asList(header, rows, width)
    return { spans: list.spans, end: list.end + (note ? 2 : 0) }
  }

  // Its top border, the header and the rule under it; then each row and a rule,
  // the last one the bottom border.
  let top = 2 + tall(header)
  const spans = rows.map(row => {
    const span = { top, height: tall(row) }
    top += span.height + 1
    return span
  })
  return { spans, end: top + note }
}

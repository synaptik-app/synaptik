// A thread's agent (D51): the thread's answer offers one when its tasks need
// tools, the person asks for it, the thread steers it, and its reports come back to the
// thread. Claude Code's notices about it stay out of the main conversation.

import { expect, test } from 'claude-code/testing'
import type { FoundElement } from 'claude-code/testing'

import {
  AGENT_ID,
  agentLabels,
  agentRows,
  appended,
  band,
  drawnTexts,
  forkAnswer,
  forks,
  fullscreen,
  sentToAgents,
  spawned,
  spawnedAgent,
  start,
  submitted,
  suggested,
  threadPane,
} from './engine'

const F = 'review'
const CACHE = 1
const PANE = `synaptik-thread-${CACHE}`

type Dollar = Parameters<typeof start>[0]
type Mounted = Awaited<ReturnType<typeof fullscreen>>

async function clickAndPress(ui: Mounted, index: number, keys: string[]) {
  const clients = await ui.findAll({ type: 'Client' })
  const into = String(clients.find((c: FoundElement) => (c.props.props as { index: number }).index === index)!.key)
  await ui.pointer({ type: 'down', x: 4, y: 0, button: 'left', in: into })
  for (const key of keys) await ui.key({ key, in: into })
}

const review = ($: Dollar) =>
  $.ui.focus({ component: 'AbovePrompt', requestId: 'band', element: 'verb-accept', origin: { kind: 'person' } })

async function inPane<T>($: Dollar, act: (pane: Awaited<ReturnType<typeof threadPane>>) => Promise<T>): Promise<T> {
  const pane = await threadPane($, CACHE)
  try {
    return await act(pane)
  } finally {
    await pane.unmount()
  }
}

const send = ($: Dollar, text: string) =>
  inPane($, async pane => pane.input({ key: String((await pane.find({ type: 'Input' }))!.key), text }))
const hasText = ($: Dollar, text: string) => inPane($, async pane => Boolean(await pane.find({ type: 'Text', text })))
const hasButton = ($: Dollar, text: string) => inPane($, async pane => Boolean(await pane.find({ type: 'Button', text })))

const SUMMARY = '<summary>\nActions: Run npm test -- greet.\n</summary>\n<verdict>include</verdict>'
const NEEDS_TOOLS = `I can't run it from here. I can start an agent with tools on this; just say so.\n${SUMMARY}`
const STARTING = `Starting an agent on it.\n${SUMMARY}\n<next>agent</next>`
const REPORT = 'Tests pass. Should I also add one for the TTL?\n\n<report status="needs-you">\nDone: ran the tests\nRan: npm test -- greet (passed)\nQuestions: add a TTL test?\n</report>'

// A thread whose answer offers an agent for its tasks.
async function threadWithTools($: Dollar, on: Parameters<typeof start>[1]) {
  await start($, on, F)
  await fullscreen($, F)
  await review($)
  await clickAndPress(await fullscreen($, F), CACHE, ['d'])
  forkAnswer.text = NEEDS_TOOLS
  await send($, 'does it pass?')
}

// The agent started on that thread's tasks, at the person's word.
async function withAgent($: Dollar, on: Parameters<typeof start>[1]) {
  await threadWithTools($, on)
  forkAnswer.text = STARTING
  await send($, 'yes, start it')
  forkAnswer.text = 'Actions: none\nSubagent:\n- Still on: Run npm test -- greet.'
}

const report = ($: Dollar, answer = REPORT) =>
  $.turn.complete({ turnId: 'agent-turn', agentId: AGENT_ID, answer, durationMs: 15_000, isAborted: false, reason: 'answer' })

test('an agent starts only when the answer to the person carries the tag, and the pane has no button for it', async ($, on) => {
  await threadWithTools($, on)
  expect(spawned).toHaveLength(0)
  expect(await hasButton($, '▶ start agent on tasks')).toBe(false)
  forkAnswer.text = STARTING
  await send($, 'yes, start it')
  expect(spawned).toHaveLength(1)
  // The person reads no tag.
  expect(await inPane($, async pane => Boolean(await pane.find({ type: 'Markdown', text: 'Starting an agent on it.' })))).toBe(true)
  expect(await inPane($, async pane => (await pane.findAll({ type: 'Button' })).length)).toBe(1)
})

test('starting it spawns a fork on the summary, rewritten with its tasks under Still on', async ($, on) => {
  await withAgent($, on)
  expect(spawned).toHaveLength(1)
  expect(spawned[0]!.subagentType).toBe('fork')
  expect(spawned[0]!.description).toMatch(/^Synaptik · 1\. Cache sessions in Redis/)
  expect(spawned[0]!.prompt).toContain('The tasks:\n\nActions: Run npm test -- greet.')
  // The summary is rewritten with its tasks under Still on.
  expect(forks.at(-1)).toContain('Put them under "Subagent:" as "- Still on:"')
  // Another message that asks for one starts no second agent.
  forkAnswer.text = STARTING
  await send($, 'start it again')
  expect(spawned).toHaveLength(1)
})

test("a report joins the thread whole, sets the agent's state, and the thread answers it on its own", async ($, on) => {
  await withAgent($, on)
  const before = forks.length
  forkAnswer.text = 'It ran the tests: they pass. It asks whether to add a TTL test.'
  await report($)
  // One line for it: the thread's answer says what it did.
  expect(await hasText($, '○ Agent waiting for you · 15s')).toBe(true)
  expect(await hasText($, 'Done: ran the tests\nRan: npm test -- greet (passed)\nQuestions: add a TTL test?')).toBe(false)
  expect(forks).toHaveLength(before + 1)
  expect(forks.at(-1)).toContain('Its report:\n' + REPORT)
  // That answer sends the agent nothing, even if the fork wrote something.
  expect(sentToAgents).toHaveLength(0)
})

test("a report's answer sends nothing to the agent, even when it carries a message for it", async ($, on) => {
  await withAgent($, on)
  forkAnswer.text = 'It passes.\n<to-agent>Now add a TTL test.</to-agent>'
  await report($)
  expect(sentToAgents).toHaveLength(0)
})

test("the person's message that changes the agent's work is sent to it at once", async ($, on) => {
  await withAgent($, on)
  forkAnswer.text = 'Yes, add it.\n<to-agent>\nAdd a test for the TTL too.\n</to-agent>'
  await send($, 'yes, add the TTL test')
  expect(sentToAgents).toEqual([{ to: AGENT_ID, text: 'Add a test for the TTL too.' }])
  // One line for it: the answer says what it asked.
  expect(await hasText($, '▶ Sent to agent')).toBe(true)
  expect(await hasText($, '▶ to agent: Add a test for the TTL too.')).toBe(false)
  // A message that doesn't change its work leaves it alone.
  forkAnswer.text = 'A TTL bounds how long an entry lives.'
  await send($, 'what is a TTL again?')
  expect(sentToAgents).toHaveLength(1)
})

test('a block whose thread has an agent keeps ❝ in the margin: the agent is the discussion\'s tool', async ($, on) => {
  await withAgent($, on)
  await report($)
  await review($)
  const ui = await fullscreen($, F)
  const clients = await ui.findAll({ type: 'Client' })
  const cache = clients.find((c: FoundElement) => (c.props.props as { index: number }).index === CACHE)!
  expect((cache.props.props as { glyph?: string }).glyph).toBe('❝')
  expect(suggested()).toContain('❝')
})

test('a first turn that ended before spawn returned is read from its transcript', async ($, on) => {
  await threadWithTools($, on)
  spawnedAgent.taskStatus = 'completed'
  agentRows.push({ role: 'user', text: '<fork-boilerplate>go</fork-boilerplate>', toolUses: [] }, { role: 'assistant', text: REPORT, toolUses: [] })
  forkAnswer.text = STARTING
  await send($, 'yes, start it')
  expect(await hasText($, '○ Agent waiting for you')).toBe(true)
})

test("what the person types in the agent's view joins the thread", async ($, on) => {
  await withAgent($, on)
  const typed = (text: string, kind: 'composer' | 'coordinator') =>
    $.session.append({
      message: { type: 'user', role: 'user', content: [{ type: 'text', text }] },
      door: 'prompt',
      origin: kind === 'composer' ? { kind } : ({ kind, plugin: 'synaptik' } as never),
      uuid: `u-${text.length}`,
      agentId: AGENT_ID,
    })
  await typed('The user sent a new message while you were working:\nleave blank lines out\n\nThis is how Claude Code surfaces messages the user sends mid-turn.', 'composer')
  expect(await hasText($, '› to agent: leave blank lines out')).toBe(true)
  // What the thread sent it is the thread's already.
  await typed('Count tables.md too.', 'coordinator')
  expect(await hasText($, '› to agent: Count tables.md too.')).toBe(false)
  // The thread's agent reads it in the thread.
  forkAnswer.text = 'Noted.'
  await send($, 'and?')
  expect(forks.at(-1)).toContain('Person, to your agent in its own view: leave blank lines out')
})

test("Claude Code's notice about the agent is dropped as a prompt, and reworded as a row", async ($, on) => {
  await withAgent($, on)
  const notice = `<task-notification>\n<task-id>${AGENT_ID}</task-id>\n<status>completed</status>\n<result>${REPORT}</result>\n</task-notification>`
  const dropped = await $.prompt.submit({ text: notice, wait: false, origin: { kind: 'task-notification' } })
  expect(dropped).toEqual({ drop: 'Synaptik agent notice' })
  expect(submitted).toHaveLength(0)
  // The person's own prompt, and another agent's notice, pass untouched.
  await $.prompt.submit({ text: 'hello', wait: false, origin: { kind: 'composer' } })
  await $.prompt.submit({ text: notice.replace(AGENT_ID, 'agent-2'), wait: false, origin: { kind: 'task-notification' } })
  expect(submitted).toHaveLength(2)
  await $.session.append({ message: { type: 'user', role: 'user', content: [{ type: 'text', text: notice }] }, door: 'queue', origin: { kind: 'task-notification' }, uuid: 'u1' })
  const row = appended.at(-1) as { content: { text: string }[] }
  expect(row.content[0]!.text).toContain(`<task-id>${AGENT_ID}</task-id>`)
  expect(row.content[0]!.text).toContain('A side task the person started from a Synaptik thread')
  expect(row.content[0]!.text).not.toContain('Tests pass')
})

test('in the agent list, its row reads its block and its state', async ($, on) => {
  await withAgent($, on)
  await report($)
  const row = await $.ui.mount({
    plugin: 'synaptik',
    surface: 'terminal',
    component: 'AgentRow',
    requestId: AGENT_ID,
    props: {
      id: AGENT_ID,
      description: 'Synaptik · 1. Cache sessions in Redis',
      type: 'fork',
      kind: 'local_agent',
      label: 'fork',
      status: 'idle',
      taskStatus: 'completed',
      startTime: 1,
      cwd: '/tmp',
      tokenCount: 0,
      tokenSamples: [],
      hasRow: true,
      isHidden: false,
      rowIds: [AGENT_ID],
    },
  })
  await row.unmount()
  expect(agentLabels.at(-1)).toMatch(/^Synaptik · 1\. Cache sessions in Redis.* · waiting for you$/)
})

test("in the agent's view, its reply draws without the report", async ($, on) => {
  await withAgent($, on)
  const b = await band($, { agentId: AGENT_ID })
  await b.unmount()
  const ui = await $.ui.mount({
    plugin: 'synaptik',
    surface: 'terminal',
    component: 'AssistantMessage',
    props: { text: REPORT, isFirstOfReply: true },
    viewport: { columns: 120, rows: 40, isFullscreen: true },
  })
  expect(await ui.find({ type: 'Text', text: '  ⎿ reported to the thread · waiting for you' })).toBeDefined()
  await ui.unmount()
  expect(drawnTexts.at(-1)).toBe('Tests pass. Should I also add one for the TTL?')
})

test("a refused start is a line in the thread, in plain words, and the switch stays as it was (#237, #239)", async ($, on) => {
  await threadWithTools($, on)
  spawnedAgent.deny = 'the session was stopped and nobody has sent input since'
  forkAnswer.text = STARTING
  await send($, 'yes, start it')
  expect(await hasText($, "✗ Agent not started · Claude Code won't start an agent until you send something in the main chat")).toBe(true)
  // The thread's fork reads it, so its next answer doesn't assume the agent ran.
  forkAnswer.text = 'Send anything in the main chat first.'
  await send($, 'why not?')
  expect(forks.at(-1)).toContain("Synaptik, about your agent: ✗ Agent not started · Claude Code won't start")
})

test('a run interrupted before it reported is a line in the thread, and the agent is stopped', async ($, on) => {
  await withAgent($, on)
  const before = forks.length
  await $.turn.complete({ turnId: 'agent-turn', agentId: AGENT_ID, answer: 'Counting', durationMs: 3000, isAborted: true, reason: 'aborted' })
  expect(await hasText($, '◼ Agent stopped')).toBe(true)
  // No report, so nothing for the thread to answer.
  expect(forks).toHaveLength(before)
})

test("a thread switched off starts its agent at once: no summary written first, the thread itself its tasks", async ($, on) => {
  await start($, on, F)
  await fullscreen($, F)
  await review($)
  await clickAndPress(await fullscreen($, F), CACHE, ['d'])
  // Switched off by the person: answers come without a summary.
  await inPane($, pane => pane.press({ key: `${PANE}-include` }))
  await inPane($, pane => pane.press({ key: `${PANE}-include` }))
  forkAnswer.text = "I can't count from here."
  await send($, 'are the counts right?')
  const before = forks.length
  forkAnswer.text = 'Starting an agent on it.\n<next>agent</next>'
  await send($, 'yes, start it')
  expect(spawned).toHaveLength(1)
  // The answer's fork, then the summary rewritten after the start: none before it.
  expect(forks.length - before).toBe(2)
  expect(spawned[0]!.prompt).toContain('No summary was written for this thread')
})

test("a refused start leaves a current summary current; a run that ended without a report doesn't", async ($, on) => {
  await threadWithTools($, on)
  spawnedAgent.deny = 'refused'
  forkAnswer.text = STARTING
  await send($, 'yes, start it')
  expect(await hasText($, '✗ Agent not started · refused')).toBe(true)
  // The answer brought a summary; the line after it doesn't make it stale.
  expect(await hasText($, ' · rewritten when you close this')).toBe(false)
})

test('a run that ended without a report marks the summary due a rewrite: its tasks are undone', async ($, on) => {
  await withAgent($, on)
  forkAnswer.text = 'Counted.\n<summary>\nActions: none\n</summary>'
  await send($, 'and the summary?')
  await $.turn.complete({ turnId: 'agent-turn', agentId: AGENT_ID, answer: 'Count', durationMs: 3000, isAborted: true, reason: 'aborted' })
  expect(await hasText($, ' · rewritten when you close this')).toBe(true)
})

test('#238: a thread with an agent, switched off by hand, stays out of the suggestion when a comment comes', async ($, on) => {
  await withAgent($, on)
  expect(suggested()).toContain('❝ "1. Cache sessions in Redis"')
  await inPane($, pane => pane.press({ key: `${PANE}-include` }))
  expect(await hasButton($, '○ include in review')).toBe(true)
  expect(suggested()).not.toContain('❝')
  // The agent reports, and the thread answers it: the switch stays as the person set it.
  await report($)
  expect(await hasButton($, '○ include in review')).toBe(true)
  expect(suggested()).not.toContain('❝')
})

// A thread's agent (D51): the tags its answers carry, the agent's prompt and
// report, and Claude Code's notices about it. No session, no mock `$`.

import { expect, test } from 'claude-code/testing'

import {
  agentPrompt,
  NEW_THREAD,
  noticeAbout,
  parseAnswer,
  reportPrompt,
  reportState,
  reportStatus,
  rewordedNotice,
  summaryPrompt,
  threadPrompt,
  typedInView,
  withAnswer,
  withoutReport,
} from './threads'
import type { Thread } from './threads'

const talked: Thread = {
  ...NEW_THREAD,
  messages: [
    { role: 'person', text: 'are the counts right?' },
    { role: 'agent', text: "I can't count from here." },
  ],
  summary: 'Actions: Count the facts in each note.',
  summarizedAt: 2,
  included: true,
}
const working: Thread = { ...talked, agent: { id: 'a1', state: 'working' } }

test('with no agent, every answer offers one when its tasks need tools, and starts it when asked, the switch on or off', () => {
  for (const t of [NEW_THREAD, talked, { ...talked, isIncludeSet: true, included: false }]) {
    const prompt = threadPrompt({ block: 'B' }, t, 'go')
    expect(prompt).toContain('"I can start an agent with tools on this; just say so."')
    expect(prompt).toContain('reading or counting files')
    expect(prompt).toContain('<next>agent</next>')
    expect(prompt).toContain('Never add it unless their message asks for the agent.')
    expect(prompt).not.toContain('<to-agent>')
  }
})

test('while the verdict sets the switch, the answer says when it changes it', () => {
  expect(threadPrompt({ block: 'B' }, NEW_THREAD, 'go')).toContain('This thread is left out of their review now')
  expect(threadPrompt({ block: 'B' }, talked, 'go')).toContain('This thread is included in their review now')
  expect(threadPrompt({ block: 'B' }, talked, 'go')).toContain('"I\'ve included this in your review for the main conversation."')
  // Set by the person: no verdict, nothing to say of it.
  expect(threadPrompt({ block: 'B' }, { ...talked, isIncludeSet: true }, 'go')).not.toContain('This thread is')
})

test('the summary opens with its Context when its Actions rest on what the main conversation never saw', () => {
  expect(threadPrompt({ block: 'B' }, NEW_THREAD, 'go')).toContain('Context: only when the Actions or Decisions rest on something the main conversation never saw')
  expect(summaryPrompt({ block: 'B' }, working)).toContain("so the main conversation doesn't do it again")
})

test('with an agent, the answer may carry what to send it, and the summary has its section', () => {
  const prompt = threadPrompt({ block: 'B' }, working, 'also index them')
  expect(prompt).toContain('<to-agent>')
  expect(prompt).toContain('not every message is for it')
  expect(prompt).not.toContain('<next>agent</next>')
  expect(prompt).not.toContain('I can start an agent')
  expect(prompt).toContain('- Still on:')
})

test('the tags come off the answer, each read', () => {
  const a = parseAnswer('Sure.\n<summary>\nActions: X\n</summary>\n<verdict>include</verdict>\n<next>agent</next>')
  expect(a).toEqual({ text: 'Sure.', summary: 'Actions: X', verdict: 'include', startsAgent: true })
  const b = parseAnswer('Done that.\n<to-agent>\nAlso index by topic.\n</to-agent>')
  expect(b).toEqual({ text: 'Done that.', startsAgent: false, toAgent: 'Also index by topic.' })
  // A sentence after the tags still reads.
  expect(parseAnswer('Check it.\n<summary>\nActions: X\n</summary>\n<verdict>include</verdict>\n\nI\'ve included this in your review.').text).toBe("Check it.\n\nI've included this in your review.")
  // The switch off by the person: no summary, the tag alone.
  expect(parseAnswer('Hm.\n<next>agent</next>')).toEqual({ text: 'Hm.', startsAgent: true })
})

test('what the thread sends its agent joins the thread; an answer to a report sends nothing', () => {
  const raw = 'OK.\n<to-agent>Order by title.</to-agent>'
  const sent = withAnswer({ ...working, pending: 1 }, raw)
  expect(sent.messages.slice(-2)).toEqual([
    { role: 'agent', text: 'OK.' },
    { role: 'sent', text: 'Order by title.' },
  ])
  expect(withAnswer({ ...working, pending: 1 }, raw, true).messages.at(-1)).toEqual({ role: 'agent', text: 'OK.' })
  // No agent to send it to.
  expect(withAnswer({ ...talked, pending: 1 }, raw).messages.at(-1)).toEqual({ role: 'agent', text: 'OK.' })
})

test('the agent gets the block, the thread, and the summary whole as its tasks', () => {
  const prompt = agentPrompt({ block: 'The notes folder has three notes.' }, talked)
  expect(prompt).toContain('"""\nThe notes folder has three notes.\n"""')
  expect(prompt).toContain('Person: are the counts right?')
  expect(prompt).toContain('The tasks:\n\nActions: Count the facts in each note.')
  expect(prompt).toContain('"the coordinator"')
  expect(prompt).toContain('<report status="done | needs-you">')
})

test("the thread's answer to a report carries the report and asks nothing for the agent", () => {
  const thread: Thread = { ...working, messages: [...working.messages, { role: 'report', text: 'Counted: 3 each.' }] }
  const prompt = reportPrompt({ block: 'B' }, thread, 'Counted: 3 each.')
  expect(prompt).toContain('Its report:\nCounted: 3 each.')
  expect(prompt).toContain('Your agent reported: Counted: 3 each.')
  expect(prompt).not.toContain('<to-agent>')
  expect(prompt).toContain('- Done:')
})

test('starting the agent rewrites the summary with its tasks under Still on', () => {
  expect(summaryPrompt({ block: 'B' }, working, true)).toContain('Put them under "Subagent:" as "- Still on:"')
  expect(summaryPrompt({ block: 'B' }, working)).not.toContain('Put them under')
})

test("a report says where the agent's tasks stand", () => {
  expect(reportState('Which order?\n\n<report status="needs-you">\nQuestions: x\n</report>')).toBe('needs-you')
  expect(reportState('Done.\n<report status="done">\nDone: y\n</report>')).toBe('done')
  expect(reportState('no report here')).toBe('working')
  expect(reportStatus('Prose.\n<report status="done">\nDone: y')).toBe('done')
  expect(reportStatus('Prose.\n<rep')).toBeUndefined()
})

test("the agent's view draws its reply without the report, while it streams too", () => {
  expect(withoutReport('Prose.\n\n<report status="done">\nDone: x\n</report>')).toBe('Prose.')
  expect(withoutReport('Prose.\n\n<report status="needs-you">\nDone: x')).toBe('Prose.')
  expect(withoutReport('Prose.\n\n<report status="done">\nDone: x\n</report>\n\nAfter.')).toBe('Prose.\n\nAfter.')
  expect(withoutReport('Prose.\n\n<rep')).toBe('Prose.')
  expect(withoutReport('Prose.\n\n<report sta')).toBe('Prose.')
  expect(withoutReport('Use a <b> tag.')).toBeUndefined()
  // A report mentioned inside a line is text: the reply the agent inherited
  // from the main conversation may say "no `<report` tag".
  expect(withoutReport('its replies show no `<report` tag; each ends with a line')).toBeUndefined()
  expect(withoutReport('see <report status="done"> above')).toBeUndefined()
  expect(withoutReport('ends in <r')).toBeUndefined()
  expect(withoutReport('No report.')).toBeUndefined()
})

test("Claude Code's notice about one of Synaptik's agents is found, and reworded without its result", () => {
  const ours = new Set(['a1'])
  const notice = '<task-notification>\n<task-id>a1</task-id>\n<status>completed</status>\n<result>secret answer</result>\n</task-notification>'
  expect(noticeAbout(notice, ours)).toBe('a1')
  expect(noticeAbout(notice.replace('a1', 'b2'), ours)).toBeUndefined()
  expect(noticeAbout('<task-id>a1</task-id> mentioned in passing', ours)).toBeUndefined()
  const reworded = rewordedNotice('a1')
  expect(reworded).toContain('<task-id>a1</task-id>')
  expect(reworded).toContain('A side task the person started from a Synaptik thread')
  expect(reworded).not.toContain('secret')
})

test("what the person typed in the agent's view is taken out of Claude Code's wrapping", () => {
  expect(typedInView('The user sent a new message while you were working:\nleave blank lines out\n\nThis is how Claude Code surfaces messages the user sends mid-turn.')).toBe('leave blank lines out')
  expect(typedInView('count smoke.md too\n')).toBe('count smoke.md too')
})

test('what the person wrote in the agent\'s view reads as theirs, to the agent', () => {
  const thread: Thread = { ...working, messages: [...working.messages, { role: 'direct', text: 'leave blank lines out' }] }
  expect(threadPrompt({ block: 'B' }, thread, 'and?')).toContain('Person, to your agent in its own view: leave blank lines out')
})

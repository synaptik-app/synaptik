// Test bench companion for issue #239: makes Synaptik's thread agents fail on
// demand, so a thread's failure lines can be tested by hand. It touches only
// agents whose description starts "Synaptik ·", and passes everything else on.
//
//   /fault refuse  refuse their spawns    → "✗ Agent not started · …"
//   /fault fail    send their requests to a model that doesn't exist, so each
//                  run dies on an API error → "✗ Agent failed · an API error…"
//   /fault off     back to normal (also what a reload does)
//
// Load it beside Synaptik:
//   claude --plugin-dir ../hosts/claude-code --plugin-dir ./fault-mod

import type { Register } from 'claude-code'

// A model id no API serves: a request naming it fails.
const NO_SUCH_MODEL = 'claude-fault-mod-no-such-model'
const SYNAPTIK = /^Synaptik · /

// Everything lives inside register: the test kit loads this function as an
// inline plugin on its own, without the rest of the module.
export const register: Register = on => {
  let mode: 'off' | 'refuse' | 'fail' = 'off'

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'fault', description: 'Test bench fault mod: `refuse`, `fail` or `off`' })
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'fault' }, async ($, e) => {
    const asked = e.args.trim()
    if (asked === 'refuse' || asked === 'fail' || asked === 'off') mode = asked
    else return { text: `fault: ${mode} · /fault refuse, /fault fail or /fault off` }
    return { text: `fault: ${mode}` }
  }).catch(($, e, next) => next(e))

  // A Synaptik agent about to start: refused, while refusing.
  on('agent.spawn', async ($, e, next) => {
    if (mode !== 'refuse' || !SYNAPTIK.test(e.description)) return next(e)
    return { deny: 'refused by the test bench fault mod' }
  }).catch(($, e, next) => next(e))

  // A request inside a Synaptik agent's loop: sent to a model that doesn't
  // exist, while failing, so the run ends on an API error.
  on('turn.step', async function* ($, e, next) {
    if (mode !== 'fail' || !e.agentId) return yield* next(e)
    const agent = (await $.agent.list()).find(a => a.id === e.agentId)
    if (!agent || !SYNAPTIK.test(agent.description)) return yield* next(e)
    return yield* next({ ...e, model: NO_SUCH_MODEL })
  })
}

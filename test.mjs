import assert from 'node:assert/strict'
import z from '@deepseek-ai/schemastery'
import { Config, apply } from './index.js'
import { endpointOfSpec, normalizeLimits } from './limits.js'

// --- Config -----------------------------------------------------------------
const parsed = Config['~standard'].validate({ limits: [{ provider: 'p', max: 2 }] })
assert.equal(parsed.issues, undefined)
assert.equal(typeof parsed.value.limits.get, 'function', 'limits must stay volatile for live settings writes')
assert.deepEqual(parsed.value.limits.get(), [{ provider: 'p', max: 2 }])

const rebuilt = new z(Config.toJSON())
const rebuiltValue = rebuilt({ limits: [{ provider: 'p', max: 0 }] })
assert.equal(typeof rebuiltValue.limits.get, 'function', 'toJSON round trip keeps limits volatile')
assert.deepEqual(rebuiltValue.limits.get(), [{ provider: 'p', max: 0 }])

const empty = Config['~standard'].validate({})
assert.deepEqual(empty.value.limits.get(), [])
assert.ok(Config['~standard'].validate({ limits: [{ provider: '' }] }).issues?.length > 0, 'provider must be non-empty')
assert.ok(Config['~standard'].validate({ limits: [{ provider: 'p', max: -1 }] }).issues?.length > 0, 'max must be >= 0')

// --- normalizeLimits --------------------------------------------------------
assert.deepEqual([...normalizeLimits(undefined)], [])
assert.deepEqual(
  [...normalizeLimits([
    { provider: ' a ', max: 3 },
    { provider: 'a', max: 9 },
    { provider: 'b', max: 0 },
    { provider: 'c', max: 1.5 },
    { provider: 'd', max: -1 },
    { provider: '', max: 2 },
    null,
    'bad',
  ])],
  [['a', 3], ['b', 0]],
  'malformed rows drop, duplicates keep the first cap, whitespace trims',
)

// --- endpointOfSpec ---------------------------------------------------------
assert.equal(endpointOfSpec({ request: { agentOptions: { provider: 'explicit', model: 'm' }, parent: {} } }), 'explicit')
assert.equal(endpointOfSpec({
  request: { parent: { session: { requestHeader: () => ({ config: { provider: 'recorded' } }) }, options: { provider: 'created' } } },
}), 'recorded')
assert.equal(endpointOfSpec({
  request: { parent: { session: { requestHeader: () => undefined }, options: { provider: 'created' } } },
}), 'created')
assert.equal(endpointOfSpec({ request: { parent: {} } }), '')
assert.equal(endpointOfSpec(undefined), '')

// --- Enforcement ------------------------------------------------------------
function makeRuntime() {
  const resolvers = []
  const disposes = []
  const runtime = {
    calls: [],
    async startActivation(spec) {
      this.calls.push(spec)
      const result = new Promise((resolve, reject) => resolvers.push({ resolve, reject }))
      return {
        childId: `child-${this.calls.length}`,
        result,
        dispose: async () => {
          disposes.push(this)
        },
      }
    },
  }
  return { runtime, resolvers, disposes }
}

function install(limits, runtime) {
  const effects = []
  const ctx = {
    subagents: runtime,
    effect: (fn) => {
      effects.push(fn())
    },
    get: () => undefined,
  }
  apply(ctx, { limits: { get: () => limits } })
  return () => { for (const dispose of effects) dispose() }
}

{
  const { runtime, resolvers } = makeRuntime()
  const original = runtime.startActivation
  const disposePlugin = install([{ provider: 'p', max: 1 }], runtime)
  assert.notEqual(runtime.startActivation, original, 'the Host gate replaces the runtime method')

  const first = await runtime.startActivation({ request: { agentOptions: { provider: 'p', model: 'm' }, parent: {} } })
  assert.equal(first.childId, 'child-1')

  await assert.rejects(
    runtime.startActivation({ request: { agentOptions: { provider: 'p', model: 'm' }, parent: {} } }),
    /subagent limit reached for model endpoint "p"/,
  )
  assert.equal(runtime.calls.length, 1, 'a rejected start never reaches the runtime')

  resolvers[0].resolve({ output: [], stopReason: 'completed' })
  await new Promise((resolve) => setTimeout(resolve, 0))
  await runtime.startActivation({ request: { agentOptions: { provider: 'p', model: 'm' }, parent: {} } })
  assert.equal(runtime.calls.length, 2, 'settling the first activation returns its slot')

  disposePlugin()
  assert.equal(runtime.startActivation, original, 'plugin disposal restores the runtime method')
}

{
  const { runtime, resolvers } = makeRuntime()
  const disposePlugin = install([{ provider: 'blocked', max: 0 }], runtime)
  await assert.rejects(
    runtime.startActivation({ request: { agentOptions: { provider: 'blocked', model: 'm' }, parent: {} } }),
    /subagent limit reached/,
  )
  assert.equal(runtime.calls.length, 0, 'a zero cap blocks before the runtime is called')
  disposePlugin()
  resolvers.length = 0
}

{
  const { runtime, resolvers } = makeRuntime()
  const disposePlugin = install([{ provider: 'p', max: 1 }], runtime)
  const first = await runtime.startActivation({ request: { agentOptions: { provider: 'p', model: 'm' }, parent: {} } })
  await first.dispose()
  await runtime.startActivation({ request: { agentOptions: { provider: 'p', model: 'm' }, parent: {} } })
  assert.equal(runtime.calls.length, 2, 'disposing an activation returns its slot early')
  disposePlugin()
  resolvers.length = 0
}

{
  const { runtime, resolvers } = makeRuntime()
  const disposePlugin = install([{ provider: 'p', max: 1 }], runtime)
  await runtime.startActivation({ request: { agentOptions: { provider: 'other', model: 'm' }, parent: {} } })
  await runtime.startActivation({ request: { agentOptions: { provider: 'other', model: 'm' }, parent: {} } })
  assert.equal(runtime.calls.length, 2, 'unlisted endpoints stay unlimited')
  disposePlugin()
  resolvers.length = 0
}

{
  const { runtime, resolvers } = makeRuntime()
  const disposePlugin = install([{ provider: 'inherited', max: 1 }], runtime)
  const spec = {
    request: {
      parent: { session: { requestHeader: () => ({ config: { provider: 'inherited' } }) }, options: {} },
    },
  }
  await runtime.startActivation(spec)
  await assert.rejects(runtime.startActivation(spec), /"inherited"/, 'an inherited parent route is counted')
  disposePlugin()
  resolvers.length = 0
}

// Cordis hands plugins a tracing proxy; the patch must land on the raw service
// instance (`Symbol.for('cordis.original')`) so every consumer sees it.
{
  const { runtime: raw, resolvers } = makeRuntime()
  const original = raw.startActivation
  const exposed = new Proxy(raw, {
    get(target, prop, receiver) {
      if (prop === Symbol.for('cordis.original')) return target
      return Reflect.get(target, prop, receiver)
    },
    set(target, prop, value, receiver) {
      return Reflect.set(target, prop, value, receiver)
    },
  })
  const effects = []
  apply({
    subagents: exposed,
    effect: (fn) => { effects.push(fn()) },
    get: () => undefined,
  }, { limits: { get: () => [{ provider: 'p', max: 1 }] } })
  assert.notEqual(raw.startActivation, original, 'the raw service instance is patched, not the proxy')
  await exposed.startActivation({ request: { agentOptions: { provider: 'p', model: 'm' }, parent: {} } })
  await assert.rejects(
    exposed.startActivation({ request: { agentOptions: { provider: 'p', model: 'm' }, parent: {} } }),
    /subagent limit reached/,
    'calls through the Cordis proxy observe the gate',
  )
  for (const dispose of effects) dispose()
  assert.equal(raw.startActivation, original, 'disposal restores the raw method')
  resolvers.length = 0
}

console.log('subagent-endpoint-limits: Config, resolution, and Host enforcement tests passed')

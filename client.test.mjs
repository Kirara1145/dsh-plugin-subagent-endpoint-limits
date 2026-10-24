import assert from 'node:assert/strict'

// The browser half is a plain module-loader entry: stub the loader, then drive
// its apply() against mocked client services so the slot wiring is verified
// without a browser.
const loaded = []
globalThis.window = { __ModuleLoader__: { load: (definition) => loaded.push(definition) } }
await import('./client.js')

assert.equal(loaded.length, 1)
assert.equal(loaded[0].id, '@local/dsh-subagent-endpoint-limits')

let catalogCalls = 0
const form = {
  getSnapshot: () => ({ status: 'ready', writable: true, revision: 4, value: { limits: [{ provider: 'vllm-local', max: 2 }] } }),
  subscribe: () => () => {},
  mutate: async () => true,
}
const registrations = []
const slots = {
  inject: (slot, callback) => callback(),
  register: (options, component) => {
    registrations.push({ options, component })
    return () => {}
  },
}
const ctx = {
  effect: (fn) => fn(),
  locale: { register: () => () => {}, bind: () => (key) => key },
  configForms: {
    whileServed: (namespaces, register) => register(namespaces),
    get: (ns) => {
      assert.equal(ns, 'subagent-endpoint-limits')
      return form
    },
  },
  slots,
  remote: {
    $on: () => () => {},
    session: {
      modelCatalog: async () => {
        catalogCalls += 1
        return { ok: true, value: { groups: [{ id: 'vllm-local', name: 'vLLM', models: [{ id: 'qwen3-32b' }] }], failures: [] } }
      },
    },
  },
}

const React = {
  createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
  useState: (value) => [typeof value === 'function' ? value() : value, () => {}],
  useCallback: (fn) => fn,
  useEffect: () => {},
  useRef: (value) => ({ current: value }),
}
const module = loaded[0].factory((name) => (name === 'react' ? React : undefined))
assert.deepEqual(module.inject, ['slots', 'locale', 'configForms', 'remote', 'remote.session'])

module.apply(ctx)

assert.equal(registrations.length, 1, 'the editor registers one section')
const entry = registrations[0]
assert.equal(entry.options.name, 'plugins.detail.section')
assert.equal(entry.options.id, 'subagent-endpoint-limits')
assert.equal(entry.options.locale, 'subagentEndpointLimits')
const injected = entry.options.inject()
assert.equal(injected.form, form)
assert.equal(typeof injected.loadCatalog, 'function')

const groups = await injected.loadCatalog()
assert.equal(groups.length, 1)
await injected.loadCatalog()
assert.equal(catalogCalls, 1, 'the model directory is fetched once and cached')

const nonSubagent = entry.component({ subject: { kind: 'bundle', pkg: { name: 'x' } }, t: (key) => key, form, loadCatalog: injected.loadCatalog })
assert.equal(nonSubagent, null, 'other plugin pages get no section')
const subagent = entry.component({ subject: { kind: 'item', id: 'subagent' }, t: (key) => key, form, loadCatalog: injected.loadCatalog })
assert.notEqual(subagent, null, 'the subagent page gets the editor')
assert.equal(subagent.props.form, form)

console.log('subagent-endpoint-limits: client slot wiring tests passed')

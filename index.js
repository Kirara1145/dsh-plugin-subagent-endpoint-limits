import z from '@deepseek-ai/schemastery'
import { endpointOfSpec, normalizeLimits, readConfigValue } from './limits.js'

/**
 * Per-model-endpoint subagent capacity for DSH.
 *
 * The built-in `subagent` setting caps every live child under one main Agent;
 * this plugin adds an independent cap per LLM provider. It decorates
 * `ctx.subagents.startActivation` and reserves its own slot before delegating,
 * then releases that slot when the activation settles or is disposed — the
 * same lifetime the built-in capacity uses.
 *
 * @module @local/dsh-subagent-endpoint-limits
 */

/** Loader/config namespace and profile entry id. */
export const name = 'subagent-endpoint-limits'

/**
 * Settings section owned by this plugin.
 *
 * `limits` is volatile: every settings write updates the live reference, so a
 * capacity check reads the newest caps without reloading the plugin.
 */
export const Config = z.object({
  limits: z.array(z.object({
    provider: z.string().min(1).required(),
    max: z.number().step(1).min(0).max(Number.MAX_SAFE_INTEGER).required(),
  })).default([]).volatile(),
})

export const inject = ['subagents']

/**
 * Install the per-endpoint capacity gate.
 *
 * A provider absent from `limits` is unlimited and keeps the built-in global
 * capacity as its only bound. A cap of `0` rejects every new subagent on that
 * endpoint; the message tells the model to wait or pick another endpoint.
 *
 * @param {import('@deepseek-ai/cordis').Context} ctx - Host plugin context.
 * @param {{limits?: unknown}} config - this plugin's live configuration.
 */
/** Cordis exposes services through a tracing proxy; this symbol unwraps it. */
const ORIGINAL = Symbol.for('cordis.original')

export function apply(ctx, config = {}) {
  const exposed = ctx.subagents
  if (exposed === null || exposed === undefined || typeof exposed.startActivation !== 'function') return

  // `ctx.subagents` is a Cordis tracing proxy. Assigning a method through the
  // proxy would land on a shadow context, so patch the raw service instance the
  // proxy unwraps on its `Symbol.for('cordis.original')` key.
  const runtime = exposed[ORIGINAL] ?? exposed
  const original = runtime.startActivation
  if (typeof original !== 'function') return
  /** Live reservations per provider, including starts still materializing. */
  const active = new Map()

  const readLimits = () => normalizeLimits(readConfigValue(config?.limits))

  /**
   * Reserve one slot on a provider, or throw when its cap is already reached.
   *
   * @param {string} provider - resolved model endpoint id.
   * @returns {(() => void) | null} idempotent release, or null when unlimited.
   */
  const reserve = (provider) => {
    const limit = readLimits().get(provider)
    if (limit === undefined) return null
    const used = active.get(provider) ?? 0
    if (used >= limit) {
      const error = new Error(
        `subagent limit reached for model endpoint "${provider}" `
        + `(${limit} active). Wait for an existing subagent on that endpoint to finish, `
        + 'or raise its cap in Plugins → Subagent → Model endpoint limits.',
      )
      error.name = 'SubagentEndpointLimitError'
      throw error
    }
    active.set(provider, used + 1)
    let released = false
    return () => {
      if (released) return
      released = true
      const left = (active.get(provider) ?? 1) - 1
      if (left <= 0) active.delete(provider)
      else active.set(provider, left)
    }
  }

  /**
   * Count one delegation against its endpoint until the activation ends.
   *
   * The reservation is taken synchronously before the runtime is called, so
   * parallel tool calls in one step cannot both pass a nearly full cap.
   *
   * @param {unknown} spec - the `startActivation` input.
   * @returns {Promise<unknown>} the runtime receipt.
   */
  const startActivation = async function startActivation(spec) {
    const provider = endpointOfSpec(spec)
    const release = provider === '' ? null : reserve(provider)
    try {
      const receipt = await original.call(runtime, spec)
      if (release === null) return receipt

      let settled = false
      const settle = () => {
        if (settled) return
        settled = true
        release()
      }

      if (receipt !== null && typeof receipt === 'object') {
        const result = receipt.result
        if (result !== null && typeof result === 'object' && typeof result.then === 'function') {
          result.then(settle, settle)
        } else {
          settle()
        }
        if (typeof receipt.dispose === 'function') {
          const dispose = receipt.dispose
          receipt.dispose = (...args) => {
            settle()
            return dispose.apply(receipt, args)
          }
        }
      } else {
        settle()
      }
      return receipt
    } catch (error) {
      release?.()
      throw error
    }
  }

  ctx.effect(() => {
    runtime.startActivation = startActivation
    return () => {
      if (runtime.startActivation === startActivation) runtime.startActivation = original
    }
  }, 'subagent-endpoint-limits: per-endpoint capacity gate')
}

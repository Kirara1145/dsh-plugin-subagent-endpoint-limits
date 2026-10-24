/**
 * Pure helpers for @local/dsh-subagent-endpoint-limits.
 *
 * A "model endpoint" is one LLM provider id from the Host's model catalog
 * (`deepseek-account`, `vllm-local`, …). The Host half resolves the provider a
 * child will run on, then keeps a live count per endpoint so the configured
 * caps can be enforced before the subagent runtime reserves its own slot.
 */

/** Largest cap the settings form can express. */
export const MAX_LIMIT = Number.MAX_SAFE_INTEGER

/**
 * Read a settings value that may be a plain value or a schemastery volatile ref.
 *
 * Volatile refs expose `get()`; reading it each time is what makes a settings
 * write visible to the running plugin without remounting the fiber.
 *
 * @param {unknown} value - plain value or volatile ref.
 * @returns {unknown} the current plain value, or undefined when unreadable.
 */
export function readConfigValue(value) {
  if (value !== null && typeof value === 'object' && typeof value.get === 'function') {
    try {
      return value.get()
    } catch {
      return undefined
    }
  }
  return value
}

/**
 * Normalize one provider id.
 *
 * @param {unknown} value - candidate provider id.
 * @returns {string} trimmed id, or '' when it is not a non-empty string.
 */
export function normalizeProviderId(value) {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Turn the stored `limits` array into a provider → cap map.
 *
 * Malformed rows are dropped; a repeated provider keeps its first finite cap.
 * A missing provider is unlimited, which is why only explicit entries matter.
 *
 * @param {unknown} raw - the `limits` config value.
 * @returns {Map<string, number>} caps keyed by provider id.
 */
export function normalizeLimits(raw) {
  const limits = new Map()
  if (!Array.isArray(raw)) return limits
  for (const entry of raw) {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) continue
    const provider = normalizeProviderId(entry.provider)
    const max = entry.max
    if (provider === '' || typeof max !== 'number' || !Number.isSafeInteger(max) || max < 0) continue
    if (limits.has(provider)) continue
    limits.set(provider, Math.min(max, MAX_LIMIT))
  }
  return limits
}

/**
 * Resolve the model endpoint a delegation will run on.
 *
 * The delegation tool already merges configured defaults and provider route
 * defaults into `request.agentOptions`; when no explicit route is present the
 * child inherits the parent's latest request route, then its creation options.
 *
 * @param {unknown} spec - the `startActivation` input.
 * @returns {string} provider id, or '' when the route cannot be resolved.
 */
export function endpointOfSpec(spec) {
  const options = spec !== null && typeof spec === 'object' ? spec.request?.agentOptions : undefined
  const requested = normalizeProviderId(options?.provider)
  if (requested !== '') return requested

  const parent = spec !== null && typeof spec === 'object' ? spec.request?.parent : undefined
  if (parent === null || parent === undefined || typeof parent !== 'object') return ''

  try {
    const header = typeof parent.session?.requestHeader === 'function' ? parent.session.requestHeader() : undefined
    const provider = normalizeProviderId(header?.config?.provider)
    if (provider !== '') return provider
  } catch {
    // A session without a recorded request header falls back to creation options.
  }

  return normalizeProviderId(parent.options?.provider)
}

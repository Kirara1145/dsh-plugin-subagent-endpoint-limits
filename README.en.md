# dsh-subagent-endpoint-limits

Per-model-endpoint subagent caps for [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness).

The built-in `subagent` setting caps every live child under one main Agent. This plugin adds an **independent cap per LLM provider**, editable right inside **Plugins → Subagent**, and enforces it when a delegation starts.

## What it does

- **Per-endpoint limits**: for example `deepseek-account` max 8, `vllm-local` max 2, `qwen-gateway` set to `0` (blocked). Endpoints you do not list stay unlimited.
- **Enforced at the delegation entry**: the Host half wraps `ctx.subagents.startActivation`, reserves its own slot on the endpoint the child will run on *before* the official runtime reserves capacity, and releases that slot when the activation settles or is disposed. Parallel tool calls in one step cannot both pass a nearly full cap.
- **Endpoint inheritance**: an explicit `provider` is counted as-is; without one, the parent Agent's current request route (or creation options) is used, so "inherit the parent model" delegations are counted too.
- **Scope**: live children started on that endpoint in this Host process, across sessions. It stacks with the official global parallelism limit — both must fit.
- **Live settings**: the field is volatile, so a save applies to the next delegation without reloading the plugin or restarting a session.

## Where it lives

**Plugins → Subagent**, below the official *Limits* and *Model selection* cards:

1. Each advertised model endpoint gets a row; type a maximum on the right (blank = no limit).
2. Saved endpoints that are no longer advertised stay listed (tagged *Not advertised*) and can still be edited or removed.
3. You can also add an endpoint id manually.

The section has its own **Save endpoint limits** button and does not interfere with the official card's save.

## Configuration

Stored in the profile's `cordis.patch.yml`:

```yaml
- id: subagent-endpoint-limits
  name: '@local/dsh-subagent-endpoint-limits'
  config:
    limits:
      - provider: deepseek-account
        max: 8
      - provider: vllm-local
        max: 2
```

- `provider` must exactly match a provider id from the model catalog.
- `max` is an integer ≥ 0; `0` blocks new subagents on that endpoint.
- Unlisted endpoints have no plugin-level cap.

## Install

```bash
dsh plugin --profile desktop add "link:/absolute/path/to/dsh-subagent-endpoint-limits"
```

or in the profile's `package.json`:

```json
{
  "dependencies": {
    "@local/dsh-subagent-endpoint-limits": "link:/absolute/path/to/dsh-subagent-endpoint-limits"
  },
  "dsh": {
    "profile": {
      "bundles": ["@local/dsh-subagent-endpoint-limits"]
    }
  }
}
```

Then reload the page (or fully restart DSH).

## Limitations

- Only new delegations are gated (`startActivation`); messaging an existing child and cold resume do not take a new slot.
- Counts are per Host process and reset on restart.
- The cap is "running at the same time", not "total ever created".
- If the official runtime changes the shape of `startActivation` (for example turns it into a read-only accessor), the plugin will need an update.

## Tests

```bash
node test.mjs
node client.test.mjs
```

## License

MIT

---

[中文说明](README.md)

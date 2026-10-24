window.__ModuleLoader__.load({
  id: '@local/dsh-subagent-endpoint-limits',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    /** Locale namespace owned by this plugin. */
    const NS = 'subagentEndpointLimits'
    /** Host settings entry this page section edits. */
    const SETTINGS_NS = 'subagent-endpoint-limits'
    /** Official plugin page extension seat declared by the plugin manager. */
    const SLOT = 'plugins.detail.section'
    /** The official Subagent settings item this section belongs to. */
    const SUBAGENT_ITEM_ID = 'subagent'

    const zh = {
      title: '模型端点子代理上限',
      hint: '为每个模型端点单独限制同时运行的子代理数量。留空表示不限制，0 表示禁止该端点启动子代理。',
      scope: '计数范围：本 Host 进程内、经该端点启动且尚未结束的子代理（跨会话），并仍受上方「子智能体并行数量上限」约束。',
      provider: '模型端点',
      maxLabel: '最大子代理数',
      unlimited: '不限制',
      addPlaceholder: '端点 id，例如 vllm-local',
      add: '添加端点',
      remove: '移除端点 {provider}',
      save: '保存端点上限',
      saving: '保存中…',
      reset: '重置',
      invalid: '请输入不小于 0 的整数，或留空表示不限制。',
      saveFailed: '本部署没有接受这些值，请重试。',
      conflict: '设置已在其他位置更新，请重置后再改。',
      saved: '已保存。',
      loadFailed: '无法读取模型端点列表。',
      retry: '重试',
      empty: '当前没有可配置的模型端点。',
      readOnly: '本部署的设置为只读。',
      loading: '正在读取模型端点…',
      notAdvertised: '未公布',
      models: '{count} 个模型',
    }

    const en = {
      title: 'Model endpoint limits',
      hint: 'Cap how many subagents may run at once on each model endpoint. Leave blank for no limit; 0 blocks new subagents on that endpoint.',
      scope: 'Counted across this Host process: subagents started on that endpoint that have not ended yet, across sessions. The global parallelism limit above still applies.',
      provider: 'Model endpoint',
      maxLabel: 'Maximum subagents',
      unlimited: 'No limit',
      addPlaceholder: 'Endpoint id, e.g. vllm-local',
      add: 'Add endpoint',
      remove: 'Remove endpoint {provider}',
      save: 'Save endpoint limits',
      saving: 'Saving…',
      reset: 'Reset',
      invalid: 'Enter a whole number of 0 or more, or leave blank for no limit.',
      saveFailed: 'The deployment did not accept these values; try again.',
      conflict: 'Settings changed elsewhere. Reset before editing again.',
      saved: 'Saved.',
      loadFailed: 'Could not load the model endpoint list.',
      retry: 'Retry',
      empty: 'No model endpoints to configure right now.',
      readOnly: 'This deployment stores settings read-only.',
      loading: 'Loading model endpoints…',
      notAdvertised: 'Not advertised',
      models: '{count} models',
    }

    const styles = {
      root: {
        marginTop: 16,
        paddingTop: 16,
        borderTop: '1px solid var(--dsw-alias-border-l1)',
      },
      head: { display: 'flex', flexDirection: 'column', gap: 4 },
      title: { margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--dsw-alias-label-primary)' },
      hint: { margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--dsw-alias-label-secondary)' },
      scope: { margin: 0, fontSize: 11, lineHeight: 1.5, color: 'var(--dsw-alias-label-tertiary)' },
      grid: { display: 'flex', flexDirection: 'column', gap: 2, marginTop: 12 },
      row: {
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 132px 28px',
        alignItems: 'center',
        gap: 10,
        padding: '6px 0',
      },
      identity: { display: 'flex', flexDirection: 'column', minWidth: 0 },
      name: {
        fontSize: 13,
        color: 'var(--dsw-alias-label-primary)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      },
      id: {
        fontSize: 11,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        color: 'var(--dsw-alias-label-tertiary)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      },
      tag: {
        marginLeft: 6,
        padding: '0 5px',
        borderRadius: 999,
        border: '1px solid var(--dsw-alias-border-l1)',
        fontSize: 10,
        color: 'var(--dsw-alias-label-tertiary)',
      },
      input: {
        width: '100%',
        boxSizing: 'border-box',
        padding: '5px 8px',
        borderRadius: 6,
        border: '1px solid var(--dsw-alias-border-l2)',
        background: 'var(--dsw-alias-bg-base)',
        color: 'var(--dsw-alias-label-primary)',
        fontSize: 12,
        fontVariantNumeric: 'tabular-nums',
      },
      remove: {
        border: 0,
        background: 'transparent',
        color: 'var(--dsw-alias-label-tertiary)',
        cursor: 'pointer',
        padding: 0,
        fontSize: 15,
        lineHeight: 1,
      },
      addRow: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' },
      addInput: {
        flex: '1 1 180px',
        minWidth: 140,
        boxSizing: 'border-box',
        padding: '5px 8px',
        borderRadius: 6,
        border: '1px solid var(--dsw-alias-border-l2)',
        background: 'var(--dsw-alias-bg-base)',
        color: 'var(--dsw-alias-label-primary)',
        fontSize: 12,
      },
      button: {
        padding: '5px 10px',
        borderRadius: 6,
        border: '1px solid var(--dsw-alias-border-l2)',
        background: 'transparent',
        color: 'var(--dsw-alias-label-primary)',
        cursor: 'pointer',
        fontSize: 12,
      },
      primary: {
        padding: '5px 12px',
        borderRadius: 6,
        border: '1px solid var(--dsw-alias-border-l2)',
        background: 'var(--dsw-alias-bg-layer-2)',
        color: 'var(--dsw-alias-label-primary)',
        cursor: 'pointer',
        fontSize: 12,
      },
      actions: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 },
      note: { margin: '8px 0 0', fontSize: 12, lineHeight: 1.5, color: 'var(--dsw-alias-label-secondary)' },
      notice: { margin: '8px 0 0', fontSize: 12, lineHeight: 1.5, color: 'var(--dsw-alias-label-secondary)' },
      error: { margin: '8px 0 0', fontSize: 12, lineHeight: 1.5, color: 'var(--dsw-alias-state-error-primary)' },
    }

    /** Read the stored limits from a form snapshot. */
    function limitsOf(snapshot) {
      if (snapshot === null || typeof snapshot !== 'object' || snapshot.status !== 'ready') return []
      const value = snapshot.value
      if (value === null || typeof value !== 'object' || !Array.isArray(value.limits)) return []
      const limits = []
      for (const entry of value.limits) {
        if (entry === null || typeof entry !== 'object' || typeof entry.provider !== 'string') continue
        if (typeof entry.max !== 'number' || !Number.isSafeInteger(entry.max) || entry.max < 0) continue
        limits.push({ provider: entry.provider, max: entry.max })
      }
      return limits
    }

    /**
     * Merge the live catalog with saved endpoints that are no longer advertised.
     * Saved-but-missing rows stay visible so they can still be edited or removed.
     */
    function rowsFor(groups, limits) {
      const rows = []
      const seen = new Set()
      for (const group of Array.isArray(groups) ? groups : []) {
        if (group === null || typeof group !== 'object' || typeof group.id !== 'string' || group.id === '') continue
        if (seen.has(group.id)) continue
        seen.add(group.id)
        const limit = limits.find((entry) => entry.provider === group.id)
        rows.push({
          provider: group.id,
          name: typeof group.name === 'string' && group.name !== '' ? group.name : group.id,
          models: Array.isArray(group.models) ? group.models.length : 0,
          max: limit === undefined ? '' : String(limit.max),
          advertised: true,
        })
      }
      for (const limit of limits) {
        if (seen.has(limit.provider)) continue
        seen.add(limit.provider)
        rows.push({ provider: limit.provider, name: limit.provider, models: 0, max: String(limit.max), advertised: false })
      }
      return rows
    }

    /**
     * Editor for one model endpoint cap per row, saved as one volatile write.
     */
    function EndpointLimitsEditor(props) {
      const t = typeof props.t === 'function' ? props.t : (key) => key
      const form = props.form
      const [snapshot, setSnapshot] = React.useState(() => form.getSnapshot())
      React.useEffect(() => {
        setSnapshot(form.getSnapshot())
        return form.subscribe(() => setSnapshot(form.getSnapshot()))
      }, [form])

      const [catalog, setCatalog] = React.useState({ status: 'loading', groups: [] })
      const [rows, setRows] = React.useState([])
      const [providerDraft, setProviderDraft] = React.useState('')
      const [dirty, setDirty] = React.useState(false)
      const [busy, setBusy] = React.useState(false)
      const [error, setError] = React.useState(null)
      const [notice, setNotice] = React.useState(null)

      const generation = React.useRef(0)
      const load = React.useCallback(() => {
        const current = generation.current + 1
        generation.current = current
        setCatalog((previous) => ({ status: 'loading', groups: previous.groups }))
        Promise.resolve()
          .then(() => props.loadCatalog())
          .then((groups) => {
            if (generation.current !== current) return
            setCatalog({ status: 'ready', groups: Array.isArray(groups) ? groups : [] })
          }, () => {
            if (generation.current !== current) return
            setCatalog({ status: 'error', groups: [] })
          })
        return () => {
          if (generation.current === current) generation.current += 1
        }
      }, [props.loadCatalog])
      React.useEffect(load, [load])

      const limits = limitsOf(snapshot)
      const limitsKey = JSON.stringify(limits)
      React.useEffect(() => {
        if (dirty) return
        setRows(rowsFor(catalog.groups, limits))
      }, [catalog, limitsKey, dirty])

      const edit = (provider, value) => {
        setRows((previous) => previous.map((row) => row.provider === provider ? { ...row, max: value } : row))
        setDirty(true)
        setError(null)
        setNotice(null)
      }

      const remove = (provider) => {
        setRows((previous) => previous.filter((row) => row.provider !== provider))
        setDirty(true)
        setError(null)
        setNotice(null)
      }

      const add = () => {
        const provider = providerDraft.trim()
        if (provider === '') return
        setProviderDraft('')
        setRows((previous) => previous.some((row) => row.provider === provider)
          ? previous
          : [...previous, { provider, name: provider, models: 0, max: '', advertised: false }])
        setDirty(true)
        setError(null)
        setNotice(null)
      }

      const save = async () => {
        const current = form.getSnapshot()
        if (current.status !== 'ready' || current.writable === false || busy) return
        const next = []
        for (const row of rows) {
          const text = String(row.max ?? '').trim()
          if (text === '') continue
          if (!/^\d+$/.test(text)) {
            setError(t('invalid'))
            return
          }
          const max = Number(text)
          if (!Number.isSafeInteger(max) || max < 0) {
            setError(t('invalid'))
            return
          }
          next.push({ provider: row.provider, max })
        }
        setBusy(true)
        setError(null)
        setNotice(null)
        try {
          const accepted = await form.mutate([{ op: 'set', path: ['limits'], value: next }], current.revision)
          if (!accepted) {
            setError(t('conflict'))
            return
          }
          setDirty(false)
          setNotice(t('saved'))
        } catch {
          setError(t('saveFailed'))
        } finally {
          setBusy(false)
        }
      }

      const reset = () => {
        setDirty(false)
        setError(null)
        setNotice(null)
        setRows(rowsFor(catalog.groups, limits))
      }

      if (snapshot.status === 'unavailable') return null

      const readOnly = snapshot.status === 'ready' && snapshot.writable === false
      const disabled = readOnly || busy
      const canSave = dirty && !disabled && snapshot.status === 'ready'
      const canAdd = !disabled && providerDraft.trim() !== ''

      const header = h('div', { style: styles.head },
        h('h3', { style: styles.title }, t('title')),
        h('p', { style: styles.hint }, t('hint')),
        h('p', { style: styles.scope }, t('scope')),
      )

      if (snapshot.status !== 'ready') {
        return h('div', { style: styles.root }, header, h('p', { style: styles.note }, t('loading')))
      }

      const list = rows.length === 0
        ? h('p', { style: styles.note }, t('empty'))
        : h('div', { style: styles.grid }, rows.map((row) => h('div', { key: row.provider, style: styles.row },
          h('div', { style: styles.identity },
            h('span', { style: styles.name },
              row.name,
              row.models > 0 ? h('span', { style: styles.tag }, t('models', { count: String(row.models) })) : null,
              row.advertised ? null : h('span', { style: styles.tag }, t('notAdvertised')),
            ),
            h('code', { style: styles.id }, row.provider),
          ),
          h('input', {
            style: styles.input,
            type: 'number',
            inputMode: 'numeric',
            min: 0,
            step: 1,
            value: row.max,
            placeholder: t('unlimited'),
            'aria-label': `${t('maxLabel')} · ${row.name}`,
            disabled,
            onChange: (event) => edit(row.provider, event.target.value),
            onKeyDown: (event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                if (canSave) void save()
              }
            },
          }),
          readOnly ? null : h('button', {
            type: 'button',
            style: styles.remove,
            title: t('remove', { provider: row.provider }),
            'aria-label': t('remove', { provider: row.provider }),
            disabled,
            onClick: () => remove(row.provider),
          }, '×'),
        )))

      const addRow = readOnly ? null : h('div', { style: styles.addRow },
        h('input', {
          style: styles.addInput,
          value: providerDraft,
          placeholder: t('addPlaceholder'),
          'aria-label': t('provider'),
          disabled,
          onChange: (event) => setProviderDraft(event.target.value),
          onKeyDown: (event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              if (canAdd) add()
            }
          },
        }),
        h('button', { type: 'button', style: styles.button, disabled: !canAdd, onClick: add }, t('add')),
      )

      const actions = h('div', { style: styles.actions },
        h('button', { type: 'button', style: styles.primary, disabled: !canSave, onClick: () => { void save() } },
          busy ? t('saving') : t('save')),
        h('button', { type: 'button', style: styles.button, disabled: busy || !dirty, onClick: reset }, t('reset')),
      )

      const catalogNote = catalog.status === 'error'
        ? h('p', { role: 'alert', style: styles.error },
          t('loadFailed'),
          h('button', { type: 'button', style: styles.button, disabled: busy, onClick: load }, t('retry')))
        : null

      return h('div', { style: styles.root },
        header,
        catalogNote,
        list,
        addRow,
        actions,
        readOnly ? h('p', { style: styles.note }, t('readOnly')) : null,
        error === null ? null : h('p', { role: 'alert', style: styles.error }, error),
        notice === null ? null : h('p', { role: 'status', style: styles.notice }, notice),
      )
    }

    /** Render only inside the official Subagent item page. */
    function SubagentEndpointLimits(props) {
      const subject = props.subject
      if (subject === null || typeof subject !== 'object' || subject.kind !== 'item' || subject.id !== SUBAGENT_ITEM_ID) return null
      const form = props.form
      if (form === null || typeof form !== 'object' || typeof form.getSnapshot !== 'function') return null
      return h(EndpointLimitsEditor, { t: props.t, form, loadCatalog: props.loadCatalog })
    }

    /** Required client services. */
    const inject = ['slots', 'locale', 'configForms', 'remote', 'remote.session']

    /**
     * Register the endpoint-cap editor as a section of Plugins → Subagent.
     * @param ctx - the browser plugin context.
     */
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'subagent-endpoint-limits: dictionaries')
      const t = ctx.locale.bind(NS)

      let groups
      let pending
      const loadCatalog = () => {
        if (groups !== undefined) return Promise.resolve(groups)
        pending ??= ctx.remote.session.modelCatalog().then((result) => {
          const raw = result !== null && result !== undefined && result.ok === true && result.value !== undefined && Array.isArray(result.value.groups)
            ? result.value.groups
            : []
          groups = raw.filter((group) => group !== null && typeof group === 'object' && typeof group.id === 'string' && group.id !== '')
          return groups
        }).catch(() => {
          groups = []
          return groups
        })
        return pending
      }

      ctx.effect(() => ctx.remote.$on('llm/adapters-updated', () => {
        groups = undefined
        pending = undefined
      }), 'subagent-endpoint-limits: model directory invalidation')

      ctx.effect(() => ctx.configForms.whileServed([SETTINGS_NS], () => {
        const form = ctx.configForms.get(SETTINGS_NS)
        return ctx.slots.inject(SLOT, () => ctx.slots.register({
          name: SLOT,
          id: 'subagent-endpoint-limits',
          order: 30,
          label: () => t('title'),
          locale: NS,
          inject: () => ({ form, loadCatalog }),
        }, SubagentEndpointLimits))
      }), 'subagent-endpoint-limits: subagent page section')
    }

    return { inject, apply }
  },
})

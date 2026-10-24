# 子代理端点上限（dsh-subagent-endpoint-limits）

在 **插件 → 子智能体** 页面下方增加「模型端点子代理上限」：给每个模型端点（LLM provider）单独设置可同时运行的子代理数量，并在委派发生时真正执行这个上限。

## 它做什么

- **按端点限流**：例如 `deepseek-account` 最多 8 个、`vllm-local` 最多 2 个、`qwen-gateway` 设为 `0`（禁止委派）。没有配置的端点不额外限制。
- **在委派入口拦截**：插件装饰 `ctx.subagents.startActivation`，在官方运行时预留容量之前，先按子代理将要使用的端点预留自己的名额；名额在 activation 结束或被 `dispose` 时归还。并发工具调用在同一 tick 内也只有一个能抢到最后一个名额。
- **端点继承**：子代理显式指定 `provider` 时按该端点计数；没指定时按父 Agent 当前请求的路由（或创建选项）解析，所以「默认继承父模型」的委派同样受限。
- **计数口径**：本 Host 进程内、经该端点启动且尚未结束的子代理，跨会话累计。它与官方「子智能体并行数量上限」是**叠加**关系：两者都要满足。
- **即时生效**：设置字段是 volatile 的，保存后下一次委派立即使用新上限，不需要重载插件或重开会话。

## 界面位置

**插件 → 子智能体** 页面：

1. 上方是官方「运行限制」（最大递归深度、全局并行数量上限）和「模型选择」。
2. 下方是本插件新增的「模型端点子代理上限」：
   - 每个已公布的模型端点一行，右侧填最大子代理数；留空 = 不限制。
   - 已保存但当前未公布的端点仍保留一行，标「未公布」，可修改或删除。
   - 也可以手动「添加端点」填写目录里没有的 provider id。
   - 「保存」写入本插件的设置命名空间 `subagent-endpoint-limits`。

这一区块有自己的保存按钮，与上方官方卡片的保存互不影响。

## 存储与范围

配置保存在 profile 的 `cordis.patch.yml`：

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

- `provider` 必须与模型目录里的 provider id 完全一致（设置页会在下拉/行里显示实际 id）。
- `max` 为不小于 0 的整数；`0` 表示该端点禁止启动新子代理。
- 未列出的端点不设插件级上限，只受官方全局上限约束。

## 限制

- 只拦截新建委派（`startActivation`）；对已有子代理发消息、冷恢复不计入新名额。
- 计数只在当前 Host 进程内有效，重启后从 0 开始；不统计历史会话里已结束的子代理。
- 上限是「同时运行」而不是「累计生成」；子代理结束后名额立即归还。
- 官方运行时如果改变 `startActivation` 的方法形态（例如改成不可写的访问器），本插件需要相应调整。

## 安装

**本机已安装到 `desktop` profile**。安装时会自动把包加入 profile 的 `dependencies` 和 `dsh.profile.bundles`；刷新页面，若区块仍未出现则完全退出并重新打开 DeepSeek Harness。

也可以手动安装：

```bash
dsh plugin --profile desktop add "link:/Users/jerry/Desktop/我的项目/dsh-subagent-endpoint-limits"
```

或在 **插件 → 添加插件 → 安装第三方插件** 中选择本目录。手工配置 profile 的方式：

```json
{
  "dependencies": {
    "@local/dsh-subagent-endpoint-limits": "link:/Users/jerry/Desktop/我的项目/dsh-subagent-endpoint-limits"
  },
  "dsh": {
    "profile": {
      "bundles": ["@local/dsh-subagent-endpoint-limits"]
    }
  }
}
```

然后刷新页面。Host 半侧随组合包激活，浏览器半侧自动加载。

## 验证

```bash
node test.mjs
node client.test.mjs
```

- 打开 插件 → 子智能体，应看到「模型端点子代理上限」区块和端点列表。
- 给某个端点设 1，然后让 Agent 同时委派两个使用该端点的子代理：第二个应收到
  `subagent limit reached for model endpoint "..."`，而不是静默排队。
- 把该端点改回留空并保存，再委派应恢复正常。

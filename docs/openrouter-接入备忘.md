# OpenRouter 接入备忘（存档）

> 存档日期：2026-09-08
> 依据：OpenRouter 官方文档（openrouter.ai/docs）当日在页核对，防止过时写法。
> 核对页面：Quickstart（/docs/quickstart）、Structured Outputs（/docs/guides/features/structured-outputs）

---

## 1. 接入方式选型

OpenRouter 当日文档给出四种接法：

| 方式 | 适用 | 本项目 |
|---|---|---|
| 原生 REST `POST /api/v1/chat/completions` | 任意语言、零依赖 | 备选 |
| `@openrouter/sdk` 官方 Client SDK | 类型安全 | 备选 |
| `@openrouter/agent` Agent SDK | 工具调用、Agent 循环 | 不需要 |
| **OpenAI SDK 指向 OpenRouter** | 已有 OpenAI SDK 代码无缝迁移 | **采用** |

采用 OpenAI SDK（drop-in replacement），官方示例：

```ts
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': '<site-url>',        // 可选：OpenRouter 排行榜站点归属
    'X-OpenRouter-Title': '<app-title>', // 可选：应用名归属
  },
});

const completion = await openai.chat.completions.create({
  model: 'deepseek/deepseek-chat',
  messages: [{ role: 'user', content: '...' }],
});
```

> 注意：官方示例当前用 `~openai/gpt-latest` 这类「latest 别名」演示；本项目按用户决策默认 `deepseek/deepseek-chat`，模型 slug 可在设置页切换（完整目录见 openrouter.ai/models）。

## 2. 关键 Headers

| Header | 必填 | 说明 |
|---|---|---|
| `Authorization: Bearer <key>` | 是 | API Key |
| `HTTP-Referer` | 否（推荐） | 站点 URL，用于 openrouter.ai 排行榜归属 |
| `X-OpenRouter-Title` | 否（推荐） | 应用名归属 |

> 历史上的 `X-Title` 写法已统一为 `X-OpenRouter-Title`，用 SDK 的 `defaultHeaders` 配置。

## 3. 结构化输出（本项目热点识别的关键）

- 请求参数：

```json
{
  "model": "deepseek/deepseek-chat",
  "messages": [ ... ],
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "hotspot_report",
      "strict": true,
      "schema": { "...": "JSON Schema" }
    }
  }
}
```

- 支持与否是**按 endpoint 而非仅按模型**决定的；同一模型可能被多个供应商托管，只有部分支持
- 要强制路由到支持结构化输出的 endpoint：
  - 在模型页确认 `structured_outputs` 支持情况
  - 设置 `require_parameters: true`（Provider Routing / provider preferences）
- `strict: true` 由各供应商自行解释：有的强约束、有的仅是强提示，**不能假设 100% 合规**
- 流式响应也支持结构化输出（`stream: true` 时返回增量合法 JSON）
- **Response Healing**：非流式 + `json_schema` 时可启用 response healing plugin，降低模型输出残缺 JSON 的风险

> 因此本项目策略：优先 `json_schema`；若请求报「不支持」错误，自动降级为「提示词约束只输出 JSON + 健壮解析」，两条路都保留。

## 4. 健壮解析兜底（代码层策略）

1. 优先携带 `response_format: json_schema` 请求
2. 解析响应 `choices[0].message.content`
3. 解析失败时按序尝试：
   - 剥 ```json / ``` 围栏
   - 提取文本中首个 `{...}` 平衡块
   - 字段校验（缺字段补默认值，类型不对则丢弃该条）
4. 失败降温重试 1 次（提示词中强化「只输出 JSON」）
5. 仍失败：本次分析报错，**不落库**，保留上一期快照

## 5. 其他实用信息（核对自当日文档）

- 模型目录可程序化拉取：`GET /api/v1/models`
- 免费模型与限流规则见官方 FAQ（rate limits 按 credits 等级计算）
- OpenRouter 提供 MCP 服务器 `https://mcp.openrouter.ai/mcp`，可在 AI 编码工具里查实时模型/价格/余额
- 流式：`stream: true`，SSE 格式，与 OpenAI SDK 兼容
- 文档索引：`https://openrouter.ai/docs/llms.txt`（面向 LLM 的全量文档索引，后续查询入口）

## 6. 本项目默认配置

| 项 | 默认值 |
|---|---|
| baseURL | `https://openrouter.ai/api/v1` |
| 默认模型 | `deepseek/deepseek-chat` |
| Key 来源 | 优先设置页（存 `data/settings.json`，服务端持有），兼容 `.env` 的 `OPENROUTER_API_KEY` |
| Mock 模式 | 默认开启（当前无 Key）；设置页填 Key 后可关闭切换真实 AI |
| 输入裁剪 | 每条内容限长、单次最多 ~120 条 |
| 重试 | 失败降温重试 1 次 |

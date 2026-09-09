# Loop 2 里程碑：AI 分析层（溯源文档）

> 日期：2026-09-08 ｜ 状态：Mock 通道已通过冒烟测试；真实 OpenRouter 通道待 Key 验证 ｜ 下一循环：Loop 3（完整前端）

## 1. 本循环目标

- `lib/ai.ts`：OpenRouter 真实分析 + Mock 规则分析双通道
- `POST /api/analyze`：条目池 → 分析 → 生成快照（刊号递增）→ 与上期趋势对比
- `GET /api/snapshots`：快照列表 / 详情
- 设置读写打通（Key / 模型 / Mock 开关）

## 2. 交付物清单

| 模块 | 文件 | 说明 |
|---|---|---|
| AI 双通道 | `lib/ai.ts` | `analyzeHotspots()` 统一入口：有 Key 且非 Mock → 真实 AI；否则 Mock |
| 结构化输出 | `lib/ai.ts` | 优先 `response_format: json_schema`（OpenRouter），报错自动降级为提示词约束 |
| 健壮解析 | `lib/ai.ts` `extractJson()` | 剥 ``` 围栏 → JSON.parse → 失败找首个 `{...}` 平衡块 |
| 字段归一 | `lib/ai.ts` `normalizeHotspot()` | category/sentiment 白名单校验、heat 夹到 0-100、entities 过滤 |
| Mock 规则 | `lib/ai.ts` `analyzeWithMock()` | 标题前 12 字归一化分桶聚合 + 平台热度归一化(0-80) + 跨源加分(每源+8,上限20) |
| 趋势对比 | `lib/trend.ts` | 归一化标题（去空白/标点/符号 + 包含匹配）配对上期；Δ>3 up / <-3 down / 其余 flat；无配对 new |
| API | `app/api/analyze/route.ts` | 空池 400 保护；快照 issue 递增；maxDuration 120 |
| API | `app/api/snapshots/route.ts` | `?limit=` 列表（不含热点）；`?id=` 详情 |
| 设置 | `app/api/settings/route.ts` | Key 脱敏返回（前8+****+后4），hasKey 布尔 |

## 3. OpenRouter 接入实现（与 docs/openrouter-接入备忘.md 一一对应）

```ts
const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey,
  defaultHeaders: { 'HTTP-Referer': APP_URL, 'X-OpenRouter-Title': 'Hotspot Gazette' },
});
```

- 默认模型 `deepseek/deepseek-chat`（设置页可改）
- 结构化输出 `json_schema` + `strict: false`（不用 strict，避免部分供应商强约束导致请求失败）
- 降级链：schema 请求失败 → 无 schema 重试 → extractJson 兜底 → 归一化过滤
- 输入裁剪：最近 120 条、单条文本 160 字

## 4. 冒烟测试记录

```
analyze:  issue=1 mock=True hotspots=20   ✅
analyze2: issue=2 hotspots=20             ✅（连续两期，trend/delta 生效）
snapshots?id=... 详情返回 Top20，trend=flat/delta=0（Mock 两次输入相同属预期）✅
settings 改模型 → health 反映新模型 → 已还原 deepseek/deepseek-chat ✅
```

## 5. 已知边界（如实记录）

- **Mock 分类全部为「其他」**：规则式分析不具备分类能力，分类/实体/情感是真实 AI 通道的能力。这是 Mock 与 AI 的预期差异，Loop 3 UI 上会标注「Mock 简报」。
- **趋势 flat**：两次分析间条目池未变化，热度相同属预期。真实场景隔期采集后自然出现 up/down/new。
- **真实 AI 通道未实测**：需要用户提供 OpenRouter Key 后在设置页关闭 Mock 验证（不阻塞 Loop 3）。

## 6. Loop 3 待办（下一循环入口）

- 报刊风完整前端：头版（报头/号外/分栏/ticker/剪报抽屉）、采编部（源开关/立即采集/RSS 管理/投稿）、设置页（Key/模型/Mock）
- 里程碑文档 `docs/dev/loop3-前端.md`

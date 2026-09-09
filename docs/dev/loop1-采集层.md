# Loop 1 里程碑：采集层全链路（溯源文档）

> 日期：2026-09-08 ｜ 状态：已通过冒烟测试 ｜ 下一循环：Loop 2（AI 分析 + 头版 UI）

## 1. 本循环目标（用户已确认）

- 骨架：`create-next-app`（Next.js 16.3.4 + React 19.2.8 + TS + ESLint，无 Tailwind，import alias `@/*`）
- 范围：**全部采集源**（微博/知乎/百度/GitHub 四榜单 + RSS 订阅管理 + 手动投稿）+ 数据层 + 采集相关 API
- 明确后置：AI 分析、快照、前端页面（Loop 2+）

## 2. 交付物清单

| 模块 | 文件 | 说明 |
|---|---|---|
| 类型 | `lib/types.ts` | RawItem / Hotspot / Snapshot / RssFeed / Settings / DbData |
| 存储 | `lib/store.ts` | JSON 原子写（tmp+rename）；条目池上限 2000、快照 100 自动裁剪 |
| 抓取基座 | `lib/collectors/fetch.ts` | 统一 UA / 10s 超时 / Accept-Language / fetchJson |
| 微博 | `lib/collectors/weibo.ts` | 主：`weibo.com/ajax/side/hotSearch` JSON；备：s.weibo.com 榜单页 HTML |
| 知乎 | `lib/collectors/zhihu.ts` | 主：官方 hot-lists API；**备：TopHub 镜像页**（`tophub.today/n/mproPpoq6O`） |
| 百度 | `lib/collectors/baidu.ts` | `top.baidu.com/api/board`；**content 双层嵌套需递归展平**；无热度数值，按榜位折算 heat |
| GitHub | `lib/collectors/github.ts` | trending 页解析，heat=今日 star |
| RSS | `lib/collectors/rss.ts` | rss-parser，单源 30 条，批量 allSettled 失败隔离 |
| 调度 | `lib/collectors/index.ts` | 内置源 + RSS 统一调度，逐源 Promise.allSettled，返回 SourceResult[] |
| API | `app/api/collect/route.ts` | POST 全量采集并入库 |
| API | `app/api/items/route.ts` | GET 条目池（limit ≤500，新的在前） |
| API | `app/api/items/manual/route.ts` | POST 手动投稿（title 可选自动截取） |
| API | `app/api/rss/route.ts` | GET 列表 / POST add·remove·toggle（URL 校验、去重） |
| API | `app/api/settings/route.ts` | GET/POST 设置（榜单开关；Key 脱敏返回） |
| API | `app/api/health/route.ts` | 健康检查（条目数/刊号数/Mock 状态） |

## 3. 冒烟测试记录（PowerShell，2026-09-08）

最终结果：**5 源全绿**

```
weibo  ok=True count=50
zhihu  ok=True count=50
baidu  ok=True count=51
github ok=True count=14
rss    ok=True count=20   (Solidot)
total=543
```

- 手动投稿：added=1 ✅
- RSS 增源 + 采集：✅
- health：items=543 mock=true ✅

## 4. 踩坑记录（关键溯源信息）

1. **微博/百度 `fetchJson is not defined`**：漏导入，import 路径写了 `fetchText`。教训：新增 collector 后先本地 lint 再进调度。
2. **知乎 401/403**：官方 API 需登录态，页面有风控。解法：TopHub 镜像页（可公开访问、带 zhihu 原文链接与「xx 万热度」文本，已折算为数值 heat）。
3. **百度接口双层嵌套**：`cards[].content[]` 里每个元素还有一层 `content[]`，且无数值热度字段——用递归展平 + 榜位折算 heat（rank1≈100000，每名 -2000）。
4. **`create-next-app .` 失败**：目录名 `hotspot monitor` 含空格不符合 npm 包名。解法： neighboring 目录生成后整体移入。
5. **PowerShell 中文乱码**：控制台显示问题，数据本身 UTF-8 正常（浏览器可验证）；写文件/commit message 用 UTF-8 文件中转。

## 5. 数据质量说明（供 Loop 2 AI 分析参考）

- 微博：50 条带真实热度值（raw_hot）+ 爆/热/新标签
- 知乎：50 条，热度为「万」折算值，含问题摘要
- 百度：51 条（含 1 置顶），heat 为榜位折算，带 热/新/辟谣/热议 标签
- GitHub：14 条（实际仓库数随时间浮动 25 左右），heat=今日 star，extra=语言+总星
- RSS：每源 ≤30 条，无 heat（置空，交给 AI 评估）
- 跨源同题（如同一事件上微博+知乎+百度）目前**不去重**，留待 Loop 2 AI 聚合

## 6. Loop 2 待办（下一循环入口）

- `lib/ai.ts`：OpenRouter（Claude SDK baseURL 指向 openrouter.ai/api/v1）+ Mock 规则分析双通道，结构化输出 json_schema 优先、提示词兜底
- `POST /api/analyze`：取条目池 → AI → 生成 Snapshot（issue 递增）→ 与上期对比 trend/delta
- `GET /api/snapshots`：快照列表/详情
- 头版 UI（报刊风）最小版：报头 + 热点版块 + 采集/分析按钮
- 里程碑文档 `docs/dev/loop2-AI分析.md`

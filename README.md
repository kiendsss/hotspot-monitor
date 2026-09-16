# 热点观察哨 · 热频日报（Hotspot Gazette）

> 一句话定位：全程 Vibe Coding 开发的复古报刊风热点聚合工具 —— 多源采集 × 真实 AI（OpenRouter）识别，无 Key 自动降级 Mock，开箱即演示。

![复古报刊风](https://img.shields.io/badge/style-复古报刊-b3271e) ![Next.js 16](https://img.shields.io/badge/Next.js-16-black) ![Vercel](https://img.shields.io/badge/deploy-Vercel-black) ![License](https://img.shields.io/badge/license-MIT-paper)

## 在线演示

- 演示站：`https://你的域名.vercel.app`（部署后替换）
- 无需注册：打开即看 Mock 简报；想看真实 AI？去「印务设置」填入 OpenRouter Key 并关闭 Mock。

## 核心功能

| 功能 | 说明 |
|---|---|
| 多源采集 | 微博热搜 / 知乎热榜 / 百度热搜 / GitHub Trending / RSS / 手动投稿，逐源失败隔离 + 榜单尾部过滤 |
| AI 聚合识别 | OpenRouter（默认 `deepseek/deepseek-chat`）`json_schema` 结构化输出，不支持自动降级提示词 JSON；无 Key 走 Mock 规则简报 |
| 刊号快照 | 每次分析生成一期快照，自动对比上期趋势（新上榜 / ↑走热 / ↓降温 / 持平） |
| 搜索引擎交叉验证 | Bing / 百度网页 / 百度新闻 / 搜狗佐证打分，不达标候选直接淘汰（线上默认关闭防超时） |
| 专题追踪 | 关键词独立抓取 + 独立 AI 报告，支持 1/6/12/24h 自动追踪（Vercel 上为手动） |
| 报刊风交互 | 跑马灯 / 号外头条 / 分区版面 / 剪报抽屉 / 一键复制 Top5 / Canvas 报纸海报 |
| 存储抽象 | `Storage` 接口（get/set/append），本地 JSON ↔ Vercel KV 按 `VERCEL=1` 自动切换 |

## 快速开始

```bash
npm install
npm run dev        # http://localhost:3000
```

1. 头版看「本期导读」，点「⟳ 刷新热点」抓取热榜入池
2. 点「✦ 生成日报」产出第一期日报
3. 点任意标题看剪报抽屉，可复制分享或生成海报

启用真实 AI（任选其一）：

- 设置页：`http://localhost:3000/settings` 粘贴 `sk-or-v1-...`，取消勾选 Mock，保存
- 环境变量：复制 `.env.example` 为 `.env`，填 `OPENROUTER_API_KEY`（优先级高于设置页，有 Key 即真实 AI）

```bash
cp .env.example .env   # Windows 用 copy .env.example .env
```

## Vercel 部署

1. 推送到 GitHub 后 `Import Project`（Framework: Next.js，构建 `npm run build`）
2. `Storage → Create Database → KV` 并绑定项目（自动注入 `KV_REST_API_*`；不绑也能跑，降级内存演示）
3. `Settings → Environment Variables` 添加：

```bash
OPENROUTER_API_KEY=sk-or-v1-...
AI_MODEL=deepseek/deepseek-chat
APP_URL=https://你的域名.vercel.app
```

4. `Deploy` 后验三接口：`GET /api/health` → `POST /api/collect` → `POST /api/analyze`

## API 一览

| 方法路径 | 说明 |
|---|---|
| `POST /api/collect` | 全量采集（内置榜单+RSS，失败隔离，增量入库） |
| `POST /api/analyze` | 分析付印，生成新一期快照（含验证摘要） |
| `GET /api/snapshots?limit=` / `?id=` | 快照列表 / 详情 |
| `GET /api/items?limit=` / `?ids=` | 条目池查询 / 按 id 查剪报 |
| `POST /api/items/manual` | 手动投稿 `{"title":"...","text":"..."}` |
| `GET/POST /api/rss` | RSS 订阅管理（add/remove/toggle） |
| `GET/POST /api/settings` | 设置（Key 脱敏 / keySource / effectiveMock） |
| `GET /api/health` | 健康检查（`effectiveMock/hasKey/keySource/serverless`） |

CLI：`node scripts/hotspot-scan.mjs --top 10`（采集+分析+Markdown 简报）；`--no-collect` 只对现有存稿付印。

## AI Harness 开发记录

> 我如何指挥 AI 完成开发：需求文档先行 → 分 Loop 增量交付 → 每步解释原因 → 构建验证收口。

1. **三份设计文档定调**：先让 AI 研读 `docs/需求说明.md`（要什么）、`docs/实施方案.md`（技术选型：Next.js 16 + JSON 原子写 + OpenAI SDK 指 OpenRouter）、`docs/openrouter-接入备忘.md`（2026-09 按官方文档核对的接法、`json_schema` 降级策略），后续所有决策以此为准绳，不发散。
2. **Loop 拆解增量交付**：`loop1-采集层`（多源失败隔离 + 尾部过滤）→ `loop2-AI分析`（结构化输出 + 健壮解析 + Mock 兜底）→ `loop3-前端`（复古报刊风三页）→ `loop4-AgentSkill`（CLI + Skill）→ `loop5-信息源可靠性`（搜索引擎交叉验证），每 Loop 有独立存档（`docs/dev/`），可回滚。
3. **渐进式增强保演示**：明确指令「有 Key 走真实 AI，无 Key 自动 Mock」，AI 据此收敛出 `lib/env.ts` 的 `resolveAiConfig()`（env Key > 设置页 Key > 无 Key），保证任何环境都能跑通。
4. **Serverless 适配收口**：Vercel 只读报错后，要求「抽象 Storage 接口（get/set/append）+ LocalStorage/VercelKVStorage 双实现 + `VERCEL` 切换」，AI 一次交付 `lib/storage.ts` 并改造 `store/verify-cache/collect` 全链路，`npm run build` 即验收标准。
5. **作品集化最后打磨**：要求「复古报刊 favicon（`app/icon.svg`）+ 移动端适配 + 首页 HowTo + 产品级 README」，AI 输出即本次提交，`git log --oneline` 即完整开发证据链。

开发环境基线：Windows 10（PowerShell）、Node v24、npm 11；全程中文注释讲清"为什么"，UI 迭代以 `docs/ui-changelog/v*.md` 留痕（v2 报刊风 → v3-a 质检科 → v3-b 专题追踪）。

# 热点观察哨 · 热频日报（Hotspot Gazette）

> 复古报刊风的多源热点聚合站 —— 微博/知乎/百度/GitHub 热榜 × DeepSeek 真实 AI 识别，无 Key 自动降级 Mock，开箱即演示。已上线：**国内直连，无需代理**。

![在线](https://img.shields.io/badge/%E5%9C%A8%E7%BA%BF-redianbao.icu-b3271e) ![Next.js 16](https://img.shields.io/badge/Next.js-16-black) ![Vercel KV](https://img.shields.io/badge/storage-Upstash%20KV-green) ![License](https://img.shields.io/badge/license-MIT-paper)

## 在线演示

**https://redianbao.icu** （自定义域名，国内直连；`www.redianbao.icu` 同效）

- 打开即看：已预置 AI Key，日报为**真实模型产出**（非 Mock）
- 完整链路开箱可玩：「⟳ 刷新热点」→「✦ 生成日报」→ 点标题看剪报 → 复制 Top5 / 生成报纸海报
- 数据持久化：Upstash KV，冷启动/重新部署不丢刊号

> 本地自部署时不配 Key 会自动降级 Mock 规则简报，全流程照样能跑（见下文）。

## 核心功能

| 功能 | 说明 |
|---|---|
| 多源采集 | 微博热搜 / 知乎热榜 / 百度热搜 / GitHub Trending / RSS / 手动投稿，逐源失败隔离 + 榜单尾部过滤 |
| AI 聚合识别 | OpenAI 兼容协议（默认 `deepseek/deepseek-chat`，`OPENROUTER_API_KEY` / `DEEPSEEK_API_KEY` 双通道），结构化输出；无 Key 走 Mock 规则简报 |
| 刊号快照 | 每次分析生成一期快照，自动对比上期趋势（新上榜 / ↑走热 / ↓降温 / 持平） |
| 搜索引擎交叉验证 | Bing / 百度网页 / 百度新闻 / 搜狗佐证打分，不达标候选直接淘汰（线上默认关闭防超时） |
| 专题追踪 | 关键词独立抓取 + 独立 AI 报告，本地支持 1/6/12/24h 自动追踪（Serverless 上为手动） |
| 报刊风交互 | 跑马灯 / 号外头条 / 分区版面 / 剪报抽屉 / 一键复制 Top5 / Canvas 报纸海报 / 移动端适配 |
| 存储抽象 | `Storage` 接口（get/set/append 三原语），本地 JSON 文件 ↔ Vercel KV 按 `VERCEL=1` 运行时自动切换 |

## 快速开始

```bash
npm install
npm run dev        # http://localhost:3000
```

1. 头版看「本期导读」，点「⟳ 刷新热点」抓取热榜入池
2. 点「✦ 生成日报」产出第一期日报
3. 点任意标题看剪报抽屉，可复制分享或生成海报

启用真实 AI（任选其一）：

- 设置页：`http://localhost:3000/settings` 粘贴 Key，取消勾选 Mock，保存
- 环境变量：复制 `.env.example` 为 `.env`，填 `OPENROUTER_API_KEY` 或 `DEEPSEEK_API_KEY`（env 优先级高于设置页）

```bash
cp .env.example .env   # Windows 用 copy .env.example .env
```

## Vercel 部署（已验证路径）

本项目即部署在 Vercel + Upstash KV 上，以下为实际走通的步骤：

1. Vercel → **Add New → Project** → Import GitHub 仓库（Framework 自动识别 Next.js）
2. Environment Variables 至少配一个 Key（二选一）：
   - `DEEPSEEK_API_KEY=sk-...`（platform.deepseek.com）
   - `OPENROUTER_API_KEY=sk-or-v1-...`（openrouter.ai）
3. **Storage → Create Database → KV（Upstash）→ Connect to Project**，自动注入 `KV_REST_API_*` 三件套
4. 部署完成后验证：`GET /api/health` 应返回 `"serverless":true`；采集 + 生成日报后 **Redeploy 一次，刊号还在** 即 KV 持久化生效
5. （可选）自定义域名：Settings → Domains → 按提示在域名商处加 CNAME/A 记录，国内直连性能大幅优于 `*.vercel.app`

> 踩坑记录：若导入项目时 `.env.example` 被 Vercel 预创建成同名空变量，Upstash 连接会因变量冲突写不进值——去 Environment Variables 删掉 3 个空的 `KV_REST_API_*` 再 Connect 即可。

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

## 架构速览

```
app/                    Next.js 16 App Router（头版/采编部/专题/设置 + 9 组 API 路由）
lib/storage.ts          Storage 接口：LocalStorage(JSON 原子写) ↔ VercelKVStorage(@vercel/kv)
lib/store.ts            业务门面：键名约定 / 默认值合并 / 容量裁剪 / append 增量
lib/env.ts              resolveAiConfig：env Key > 设置页 Key > 无 Key 强制 Mock
lib/ai.ts               OpenAI 兼容客户端（指 OpenRouter/DeepSeek）
lib/collectors/         微博/知乎/百度/GitHub/RSS 采集器（失败隔离 + 尾部过滤）
lib/verify/             搜索引擎交叉验证（4 引擎 + 佐证分 + 缓存）
docs/                   需求/实施方案/接入备忘 + loop1-5 开发存档 + ui-changelog
```

## AI Harness 开发记录

> 我如何指挥 AI 完成开发：需求文档先行 → 分 Loop 增量交付 → 每步解释原因 → 构建验证收口。

1. **三份设计文档定调**：先让 AI 研读 `docs/需求说明.md`（要什么）、`docs/实施方案.md`（技术选型）、`docs/openrouter-接入备忘.md`（按官方文档核对的接法与降级策略），后续所有决策以此为准绳，不发散。
2. **Loop 拆解增量交付**：`loop1-采集层`（多源失败隔离 + 尾部过滤）→ `loop2-AI分析`（结构化输出 + 健壮解析 + Mock 兜底）→ `loop3-前端`（复古报刊风三页）→ `loop4-AgentSkill`（CLI + Skill）→ `loop5-信息源可靠性`（交叉验证），每 Loop 独立存档（`docs/dev/`），可回滚。
3. **渐进式增强保演示**：明确指令「有 Key 走真实 AI，无 Key 自动 Mock」，收敛出 `lib/env.ts` 的 `resolveAiConfig()`（env Key > 设置页 Key > 无 Key），保证任何环境都能跑通。
4. **Serverless 适配收口**：Vercel 只读报错后，要求「抽象 Storage 接口（get/set/append）+ LocalStorage/VercelKVStorage 双实现 + `VERCEL` 切换」，一次交付 `lib/storage.ts` 并改造 store/verify-cache/collect 全链路，`npm run build` 即验收标准。
5. **真实上线验证**：自定义域名 + Upstash KV 部署后，以「采集 → 付印 → Redeploy 冷启动 → 刊号仍在」作为持久化的最终验收；线上首期实测：105 条存稿、20 热点、交叉验证 30/30 通过。

开发环境基线：Windows 10（PowerShell）、Node v24、npm 11；全程中文注释讲清"为什么"，UI 迭代以 `docs/ui-changelog/v*.md` 留痕（v2 报刊风 → v3-a 质检科 → v3-b 专题追踪 → v1.0 上线版）。

## License

MIT

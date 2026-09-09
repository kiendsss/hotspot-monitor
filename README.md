# 热点观察哨 · 热频日报（Hotspot Gazette）

多来源热点采集 × OpenRouter AI 识别的复古报刊风热点监控站。

微博/知乎/百度/GitHub Trending/RSS/手动投稿 → AI 聚合识别热点 → 每次分析生成一期「刊号」快照，自动对比上期趋势（新上榜/↑走热/↓降温/持平）。

## 快速开始

```bash
npm install
npm run dev        # http://localhost:3000
```

1. 头版点「① 走访采集」抓取全网热榜
2. 点「② 编辑付印」生成第一期热点日报
3. 点任意热点查看「剪报」详情（摘要/实体/情感/来源/趋势）

## 启用真实 AI（OpenRouter）

默认使用 Mock 规则简报（无需 Key，可跑通全流程）。启用 AI：

1. 到 [openrouter.ai/keys](https://openrouter.ai/keys) 获取 API Key
2. 打开 `http://localhost:3000/settings`（印务设置）
3. 粘贴 Key、选择模型（默认 `deepseek/deepseek-chat`）、**取消勾选 Mock 模式**、保存
4. 回头版重新「编辑付印」即产出 AI 简报（含分类/实体/情感）

Key 保存在本机 `data/settings.json`，由服务端持有，前端仅显示脱敏值。

## Cursor Agent Skill

项目内置 `.cursor/skills/hotspot-monitor`：在 Cursor 对话中问「现在有什么热点」「生成热点简报」即可自动触发；也可 `/hotspot-monitor` 手动调用。

CLI 直接使用：

```bash
node scripts/hotspot-scan.mjs --top 10        # 采集+分析+输出 Markdown 简报
node scripts/hotspot-scan.mjs --no-collect    # 只对现有存稿付印
```

## API 一览

| 方法路径 | 说明 |
|---|---|
| `POST /api/collect` | 全量采集（内置榜单+RSS，失败隔离） |
| `POST /api/analyze` | 分析付印，生成新一期快照 |
| `GET /api/snapshots?limit=` / `?id=` | 快照列表 / 详情 |
| `GET /api/items?limit=` / `?ids=` | 条目池查询 |
| `POST /api/items/manual` | 手动投稿 `{"title":"...","text":"..."}` |
| `GET/POST /api/rss` | RSS 订阅管理（add/remove/toggle） |
| `GET/POST /api/settings` | 设置（Key/模型/Mock/源开关） |
| `GET /api/health` | 健康检查 |

## 架构与文档

- 技术栈：Next.js 16（App Router）+ TypeScript + cheerio + rss-parser + OpenAI SDK（指向 OpenRouter）
- 存储：`data/db.json` / `data/settings.json`（原子写）
- 需求与方案存档：`docs/需求说明.md`、`docs/实施方案.md`、`docs/openrouter-接入备忘.md`
- 开发循环溯源（loopengineering）：`docs/dev/loop1-采集层.md` → `loop2-AI分析.md` → `loop3-前端.md` → `loop4-AgentSkill.md`

# Loop 4 里程碑：Agent Skill（溯源文档）

> 日期：2026-09-08 ｜ 状态：CLI 实测通过，Skill 已按 2026-09 Cursor 官方规范落地 ｜ 待用户最终验收

## 1. 本循环目标

- `scripts/hotspot-scan.mjs`：CLI 一键扫描（采集→分析→Markdown 简报）
- `.cursor/skills/hotspot-monitor/SKILL.md`：Cursor Agent Skill
- README 使用说明收尾

## 2. 交付物

| 文件 | 说明 |
|---|---|
| `scripts/hotspot-scan.mjs` | 零依赖 Node CLI。健康检查（未启动给出明确指引）→ 可选采集 → 分析付印 → stdout 输出 Markdown 简报，stderr 输出进度。参数：`--top N` / `--no-collect` / `--base URL` |
| `.cursor/skills/hotspot-monitor/SKILL.md` | frontmatter：`name: hotspot-monitor`（与目录同名，符合规范）+ `description`（含触发场景：热点/热搜/趋势/简报）。正文：健康检查 → 必要时 `npm run dev` → 执行 scan → 按 Mock/AI 模式向用户汇报 |
| `README.md` | 快速开始、Key 配置指引、Skill 用法、API 一览、文档索引 |

## 3. Cursor Skills 规范对齐（2026-09 在页核对 cursor.com/docs/context/skills）

- 技能目录：`.cursor/skills/<skill-name>/SKILL.md`，`name` 必须与父目录名一致 ✅
- frontmatter 必填 `name` + `description`（Agent 依据 description 判断相关性自动触发）✅
- 依赖脚本放项目 `scripts/`，SKILL.md 中用可执行命令引用 ✅
- 兼容加载路径（`.claude/skills/` 等）未使用，本项目只需 Cursor

## 4. 实测记录

```
$ node scripts/hotspot-scan.mjs --top 5 --no-collect
[hotspot-scan] 服务正常：池内 728 条 · 第 3 期 · Mock 模式
[hotspot-scan] 分析付印中…
# 《热点观察哨》第 4 期热点简报
- 时间：2026/9/8 16:49:40
- 方式：Mock 规则简报（未配置 OpenRouter Key）
- 热点数：20
## No.1 网传长江武汉段三艘驳船…（热度 88/100 ｜ 趋势：持平）
…（Top5 完整输出）
```

- 服务未启动场景：脚本明确报错「本地服务未启动：请先运行 npm run dev」✅（代码路径检查）
- Skill 触发：待用户在 Cursor 对话中实测（新会话问「现在有什么热点」或 `/hotspot-monitor`）

## 5. 项目最终结构

```text
hotspot monitor/
├── app/                    # 头版/采编部/设置 + 8 个 API 路由
│   ├── _components/        # Masthead / GazetteBoard（ticker+抽屉）
│   ├── api/                # collect/analyze/snapshots/items/rss/settings/health
│   ├── globals.css         # 报刊风设计系统
│   ├── page.tsx / sources/ / settings/
├── lib/                    # types / store(原子写) / ai(OpenRouter+Mock) / trend / collectors×5
├── scripts/hotspot-scan.mjs
├── .cursor/skills/hotspot-monitor/SKILL.md
├── data/                   # db.json / settings.json（运行时生成）
├── docs/                   # 需求/方案/备忘存档 + dev/loop1~4 溯源
└── README.md
```

## 6. 全项目验收清单（请用户对照）

- [x] 网页能正常打开，报刊风格独特（浏览器截图验证）
- [x] 多源采集 + 失败隔离 + 手动投稿（5 源全绿实测）
- [x] AI/Mock 输出结构化热点（Mock 实测；AI 待 Key）
- [x] 快照趋势对比（期号递增、trend/delta 实测）
- [x] 三大页面交互正常（浏览器端到端）
- [x] Agent Skill 文件与 CLI 就位（CLI 实测；Skill 触发待实测）
- [ ] 最终验收：用户在 Cursor 实测 Skill 触发 + （可选）填 Key 验证真实 AI

## 7. 后续拓展入口（供未来开发）

- 新增采集源：`lib/collectors/` 增加文件 → 注册进 `index.ts` BUILTIN_COLLECTORS → `types.ts` SourceId 联合类型加值
- 换模型/加默认源：`data/settings.json` 或设置页
- 定时自动出版：未来可加 `node scripts/hotspot-scan.mjs` 的 cron/计划任务
- 历史刊号回看：`GET /api/snapshots?limit=50` 已备好，前端可加归档页

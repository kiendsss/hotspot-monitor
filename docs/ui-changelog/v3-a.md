# V3-a 热点信息密度扩展 — 免跳转判断信息价值

Parent: v3（Loop5 信息源可靠性，smoke PASS 2026-09-14）。本次专注“头版卡片不用跳原文也能判断值不值得点”：发布时间/抓取时间/互动数/AI 相关度理由全部落到卡片与抽屉。

Process: 基于已堆积的 V3-a 工作区改动收尾（11 文件起步）；tsc + build 双过；dev server 采集→分析冒烟（真实 AI 第 21 期）；浏览器端到端核对头版与抽屉；写本记录。

## 需求对照（用户本次 4 点）

1. 帖子发布时间：`RawItem.publishedAt` 新增，RSS 取 pubDate/isoDate；榜单接口多数不返回，前端如实显示“榜单未提供”（实测微博热搜 `mblog.created_at` 已消失，`num` 只剩热度；不再把 heat 冒充发布时间）。
2. 热点抓取时间：`fetchedAt` 本就有；出刊时聚合 `firstFetchedAt/lastFetchedAt`，卡片显示“首抓 HH:mm”，抽屉每条显示相对时间。
3. 更多互动数据：`interactions {likes/replies/reposts/raw}` 新增，只展示接口直接返回的（GitHub 今日 star → raw；微博 heat 不再误标为点赞）。卡片与抽屉均“有才渲染”，无则不占位。
4. AI 相关性理由：`interestKeywords`（设置页维护，最多 30 个）→ 真实 AI 与 Mock 均输出 `relevance/relevanceReason`；卡片徽标 + 单条折叠 + 一键展开/折叠全部理由；抽屉内独立“相关度”小节。

确认事项：`RawItem.text` 为原始描述、`Hotspot.summary` 为 AI 提炼，抽屉以“AI 提炼 / 原始描述：”双标注区分。候选展示（来源分布明细已含；首次/末次抓取、Top3 直达）用户确认本次不加。

## 附带修复（端到端发现，非本次需求但阻塞展示）

- `lib/pipeline.ts` 分源保底配额：知乎热度千万级会吃满全局 Top30（第 19/20 期 28 条全是知乎）。改为每源保底 5 席 + 剩余全局补位（`PER_SOURCE_FLOOR=5`，`cross` 跨源桶独立成组）。第 21 期验证：知乎 10 / 微博 5 / 百度 2+2 跨源 / GitHub 5，passed=30/30。
- `lib/ai.ts` + `analyze/route.ts` id 回贴：模型常复述不全中文长 id，导致 `itemIds` 全空、meta/verification 丢失。加三层兜底：prompt 规则 9 要求原样照抄 id；`resolveItemIds`（命中桶补全整桶 / 标题包含匹配）；出刊按桶 key 回填 `itemsByKey`。第 21 期：totalIds=67、withVer=20、withMeta=20。
- 微博 heat 误标点赞：删掉 `collectWeibo` 的 `interactions:{likes:heat}`（榜单热度≠点赞）。
- `meta.interactions.raw` 透传：GitHub 只有 raw 文案，聚合层与 `CardMeta` 之前只处理数字字段，已补。
- `formatSourceSpread` 加“×”：`知乎3` → `知乎×3`，避免与计数混淆。

## Change list

| File | Change |
|------|--------|
| lib/types.ts | `RawItem.publishedAt`、`ItemInteractions`、`Hotspot.relevance/relevanceReason/meta`、`HotspotMeta`、`Settings.interestKeywords` |
| lib/store.ts | `DEFAULT_SETTINGS.interestKeywords=[]` |
| lib/collectors/weibo.ts | `mblog.created_at / timestamp / on_board_time` 兜底解析 `publishedAt`；删 heat→likes 误标 |
| lib/collectors/rss.ts | pubDate/isoDate → `publishedAt` |
| lib/collectors/github.ts | 今日 star → `interactions.raw`（此前已存在，本次保留并打通聚合） |
| lib/pipeline.ts | `CandidateBucket.sourceId`、`PER_SOURCE_FLOOR` 分源保底 + `applySourceQuota` |
| lib/ai.ts | `interestKeywords/bucketsForFallback` 入参、`resolveItemIds`、prompt 规则 8/9、schema 加 relevance 字段、Mock 关键词命中打分 |
| app/api/analyze/route.ts | `buildHotspotMeta`（raw 透传）、`bucketsForFallback` 构造、id 三层回贴 |
| app/api/settings/route.ts | `interestKeywords` 读写（trim/去空/≤30） |
| app/settings/page.tsx | 兴趣关键词输入区 |
| app/_components/GazetteBoard.tsx | `RelevanceBadge/Reason/TimeMeta/InteractionMeta/CardMeta/SourceSpread`、一键展开折叠、抽屉双标注；`SourceSpread` 计数统一 `×N` |
| app/globals.css | `.story-meta/.reason-row/.reason-toggle/.reason-body/.drawer-kicker/.origin-text/.origin-kicker` |
| lib/collectors/github.ts | rank 改用自增计数回填（修复 `index+1` 跳过广告/失效卡导致 rank=undefined 的边界） |

## Verify（2026-09-15 本轮收尾实测）

- `npx tsc --noEmit` TSC_EXIT=0（修复 `lib/ai.ts` Mock 尾部残留解构 `evidenceLine` 导致的 TS2339；Mock 改为与 pipeline 同口径 `bucketKey` 分桶）。
- `npm run build` 成功（1179ms 编译，6/6 static, ƒ 9 routes）。
- 冒烟（dev server）：Mock+关验证出刊 2 期（第 22/23 期，0.4s 级、checked=30/passed=30/skipped=true）；第 23 期抽查：`relevance` 全覆盖、`meta` 全覆盖、GitHub `meta.interactions.raw`（如今日 +2776/+2173 star）透传。
- 浏览器端到端（第 23 期 Mock，共 20 热点）：`.story-meta` 20/20、`相关` 徽标 20/20；一键展开 0→20、单条关闭 20→19→20、再折叠 20→0，按钮文案 ▸/▾ 同步；头条抽屉含 `AI 提炼` 标注、来源分布、榜单 rank/heat/extra、原文、发布（榜单未提供）/抓取时间；GitHub 抽屉含 `互动：今日 +2776 star` 与原始描述。
- 冒烟后已恢复设置（mockMode=false、verifyEnabled=true、兴趣词 AI/开源/芯片/新能源车保留）；第 22/23 期 Mock 测试快照与手动投稿冒烟稿保留在库内。
- 历史冒烟（真实 Key 第 21 期）：collect added=130 filtered=60；analyze issue=21 mock=false hotspots=24 checked=30 passed=30；24 卡一键展开 0→24→0。
- 已知边界：榜单源发布时间覆盖率 0（接口不给，非代码问题）；本轮修复 `github` rank 缺失填写（`index+1`→有效 rank 回填，避免出刊裁剪与首末抓取时序倒挂）；抽屉 `SourceSpread` 与卡片 `formatSourceSpread` 已统一为 `×N` 计数。

## Rollback

- `git diff v3..HEAD` 预览本批；`git reset --hard v3` 回滚到 Loop5 已验证版。
- 本记录文件：`docs/ui-changelog/v3-a.md`。

# Loop 5 里程碑：信息源可靠性（尾部过滤 + 搜索引擎交叉验证）

> 日期：2026-09-14 ｜ 状态：接口冒烟通过（collect/analyze/settings），浏览器端到端待用户验收 ｜ 关联方案：`.cursor/plans/hotspot_source_reliability_ed41f700.plan.md`

## 1. 背景与目标

- 用户反馈：后端混入大量低质条目（随便发一条、回复寥寥），且信息源太少。
- 目标：榜单尾部分源裁剪 + 四搜索引擎交叉验证 + AI 终筛，全链路可配置、可降级。

## 2. 交付物清单

| 模块 | 文件 | 说明 |
|---|---|---|
| 类型扩展 | `lib/types.ts` | `RawItem.rank`；`SourceLimit`/`QualitySettings`；`SourceResult.filteredOut`；`EngineHit`/`Verification`/`VerificationSummary`；`Hotspot.verification`；`Snapshot.verificationSummary`；`Settings.sourceLimits?`/`quality?` |
| 默认值 | `lib/store.ts` | `DEFAULT_SOURCE_LIMITS`（微博 Top30+10万 / 知乎 Top30+50万 / 百度 Top30 / GitHub Top25+20星）；`DEFAULT_QUALITY`（验证开/minEngines=1/minHits=5/requireCrossSource/缓存6h） |
| 分桶口径 | `lib/bucket.ts` | `bucketKey`（前12字）与 `normalizeTitle` 单一出口，预聚合/验证缓存/Mock 同口径 |
| 尾部过滤 | `lib/collectors/filter.ts` | `applyTailFilter`：按源 TopN + minHeat 裁剪，rss/manual 不设限，rank 缺失按序补位 |
| 采集器 | `lib/collectors/{weibo,zhihu,baidu,github,rss}.ts` | 全部补 `rank`；微博兼容 2026 改版（`raw_hot`→`num`，`label_name`/`category`，广告丢弃）；RSS 打标 `extra='RSS'` 交给验证层 |
| 调度 | `lib/collectors/index.ts` | 统一过 `filter.ts`，`CollectReport.filteredOut`，`SourceResult.count` 为过滤后计数 |
| 验证引擎 | `lib/verify/engines.ts` | Bing网页（sb_count+b_algo）/百度网页（c-container）/百度新闻（span.nums+result）/搜狗网页（num-tips+vrwrap）；8s超时，并发由调用方限3，单引擎失败隔离 |
| 验证评分 | `lib/verify/score.ts` | 佐证分=覆盖度45+量级40+新闻15；全引擎失败记 `unverified` 通过（不阻塞出刊） |
| 验证缓存 | `lib/verify/cache.ts` | `data/verify-cache.json` 按归一化标题缓存，Top30候选、每批3并发 |
| 编排 | `lib/pipeline.ts` | `bucketize`+`selectCandidates`：预聚合→验证→门槛淘汰→回落（全灭取头部10桶标skipped） |
| AI规则 | `lib/ai.ts` | SYSTEM_PROMPT 加可信度硬规则（规则7）；prompt 透传 `heat/rank/[佐证]`；Mock 加孤条低质淘汰 |
| API | `app/api/{collect,analyze,settings}/route.ts` | collect 返回 `filteredOut`；analyze 三阶段（验证→分析→融合 `0.7*模型+0.3*佐证`）并写快照 `verificationSummary`；settings 支持 `sourceLimits`/`quality` 读写（钳制） |
| 前端 | `app/sources/page.tsx` | 各源 TopN/minHeat 配置 + 保存，采集结果显示过滤数 |
| 前端 | `app/settings/page.tsx` | 质检科面板：验证开关/minEngines/minHits/requireCrossSource |
| 前端 | `app/_components/GazetteBoard.tsx` | 佐证徽标（EvidenceBadge）+ 剪报抽屉搜索佐证明细 + 工具条过滤/验证摘要 |

## 3. 搜索引擎实测记录（2026-09-14，两轮 probe 脚本）

- Bing网页可用：`span.sb_count` 结果数 + 10 条 `li.b_algo`。
- 百度新闻可用：`span.nums` 相关资讯数 + 结果条数。
- 搜狗网页可用：`p.num-tips` 结果数 + `vrwrap` 条数。
- 百度网页可用：`c-container` 计数，官方总数元素布局多变，用实际条数。
- Bing新闻不可用：`news/search` 302 到 `cn.bing.com/` 首页，已剔除（原方案有 Bing News，执行时修订为四引擎组合，用户已确认）。

## 4. 冒烟测试记录（2026-09-14，dev server + 真实 Key）

```
collect:  added=111 filteredOut=60（微博30→30/滤20、知乎50→30/滤20、百度51→31/滤20、RSS20）
  ※ 微博首轮 filteredOut=50 全灭：接口改版 raw_hot 消失，全部 heat=undefined 被 minHeat=10万误杀
  → 修复：兼容 num 字段 + label_name/category 广告丢弃；复测 weibo count=30 filteredOut=20 ✅
GitHub trending: 首轮本机直连 20s 超时（网络抖动），失败隔离生效未影响其他源；复测恢复 ok=True count=19 ✅
analyze:  issue=14 mock=false hotspots=20 verification={checked:30 passed:30 dropped:0 skipped:false} ✅
快照抽查: rank1 engines=4 score=92 maxHits=67300；Bing 67300/百度网页21/百度新闻39/搜狗16404 ✅
analyze 严格档: minEngines=2 → checked=30 passed=30 dropped=0（真实热点全部 2+ 引擎命中，已还原 minEngines=1）✅
浏览器端到端: 头版第14期渲染正常，卡片「4源佐证」徽标 + 降温 -5 同排显示 ✅
settings: sourceLimits + quality 读写与钳制 ✅
tsc --noEmit ✅ / next build ✅
```

## 5. 已知边界（如实记录）

- 微博 2026 改版：`raw_hot` 字段已消失，当前以 `num` 为准，保留 `raw_hot ?? num` 双兼容。
- `minHits` 语义为「任一引擎最大结果数」，百度网页无官方计数时用实际条数（约 20），门槛不宜设太高。
- 验证耗时约 15-25s（含真实 AI），`maxDuration=120` 内；缓存命中后显著下降。
- GitHub 源在本机网络下超时，已隔离 + 临时关闭，非代码问题。
- 浏览器端到端（采编部阈值→走访→日报→佐证徽标→抽屉证据）尚未跑，待用户验收。

## 6. 后续待办

- 端到端验收后按 `docs/versions.md` 流程 commit + changelog。
- 可选：GitHub 超时若持续，可换 `https://api.github.com/search/repositories` 或 gh-proxy 兜底。

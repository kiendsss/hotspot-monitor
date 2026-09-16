# V3-b 关键词专题追踪 — 定向抓取 + 独立 AI 报告 + 定时自动追踪

Parent: v3-a（热点信息密度，tsc+build+e2e PASS 2026-09-15）。本次新增独立「专题追踪」：输入关键词后定向抓取并 AI 分析，报告独立存放不进头版刊号，支持定时自动追踪。

Process: 方案经用户三轮确认（数据源=4 搜索引擎+微博站内搜索；报告独立存放；定时=应用内单例+每专题独立开关间隔）；tsc + build 双过；dev server 立项→抓取→分析全链路冒烟（真实 AI，如「固态电池」47 素材/13 热点）；头版隔离核对（专题全流程后仍为第 23 期）；人工验证通过后补 changelog 推送。

## 需求对照

1. 指定关键词抓取：`/topics` 立项 → `POST /api/topics/[id]/collect` 并发抓 4 搜索引擎结果 + 微博站内搜索（`s.weibo.com` HTML 解析），逐源失败隔离、按标题去重、每引擎限 Top20。
2. 单独界面 + AI 分析：`/topics/[id]` 详情页展示报告与素材；`POST /api/topics/[id]/analyze` 复用 `analyzeHotspots`（含兴趣关键词相关度、Mock/真实切换），报告存 `topic.report`，不进头版 `snapshots` 序列。
3. 进入即看成果：立项接口内同步执行首次抓取+分析（`runTopicCycle`），前端立项后自动跳转详情页；`initialRun.ok=false` 时仍跳转并提示手动重试。
4. 定时自动追踪：`instrumentation.ts` 注册 `lib/topics/scheduler.ts` 单例，每分钟检查到期专题（`autoTrack && now-lastTrackedAt >= trackIntervalHours`），抓取+分析一次跑完，失败记 `lastError` 不阻塞其他。仅 dev/start 运行期间生效。
5. 界面一致性：导航新增「专题追踪 SPECIAL」；列表/详情只用 `app/globals.css` 现有类名（`panel/ledger/btn/notice/stamp/story-*`），无新 UI 框架。

## Change list

| File | Change |
|------|--------|
| lib/types.ts | `SourceId` 新增 `search`；`TrackInterval/KeywordTopic/TopicReport`；`DbData.topics` |
| lib/store.ts | `EMPTY_DB.topics=[]`；`saveDb` 裁剪专题条目 500/报告 30 热点；`MAX_TOPIC_ITEMS/MAX_TOPIC_HOTSPOTS` |
| lib/verify/engines.ts | 各引擎解析同步提取 `entries {title/url/text}`，验证计数逻辑不变 |
| lib/topics/search.ts | 新增：`collectTopic`（5 路并发+失败隔离+去重）、`mergeTopicItems` 增量合并 |
| lib/topics/weibo-search.ts | 新增：微博站内搜索 HTML 解析（`.card-wrap[mid]` + 中文相对时间） |
| lib/topics/service.ts | 新增：`createKeyword/normalizeInterval/grabTopic/analyzeTopic/runTopicCycle` |
| lib/topics/scheduler.ts | 新增：应用内单例调度器（60s tick，并发 2，防反爬） |
| instrumentation.ts | 新增：Node 运行时启动调度器 |
| app/api/topics/route.ts | 新增：列表 GET / 立项 POST（含首次抓取分析） |
| app/api/topics/[id]/route.ts | 新增：详情 GET / 追踪设置 PATCH / 删除 DELETE |
| app/api/topics/[id]/collect/route.ts | 新增：手动抓取（增量合并） |
| app/api/topics/[id]/analyze/route.ts | 新增：手动分析（独立报告） |
| app/topics/page.tsx | 新增：立项表单 + 专题列表（素材/报告/追踪状态/更新） |
| app/topics/[id]/page.tsx | 新增：专题头 + 追踪设置 + 报告卡片 + 素材剪报表 |
| app/_components/Masthead.tsx | 导航新增「专题追踪 SPECIAL」 |

## Verify（2026-09-16 本轮收尾实测）

- `npx tsc --noEmit` 通过；`npm run build` 成功（17 路由，含 4 个新增专题 API + 2 页面）。
- 冒烟（dev server，真实 AI）：「固态电池」抓取 47 条（4 引擎成功，微博搜索被风控已隔离），分析 13 热点；「中金」40 素材/13 热点；「显卡」47/15；「DDR」45/6。
- 立项即分析验证：新关键词 POST 返回 `initialRun {added, hotspots}`，详情 GET 直接含报告；生产模式需重新 `npm run build` + 重启 `start` 才生效（曾因此误判需求未实现，已重建验证通过）。
- 隔离核对：专题全流程后头版仍为第 23 期，刊号未增长；测试专题已删除，库内无残留。
- 已知边界：微博站内搜索易被风控（失败记源错误，其余引擎照常用）；定时依赖进程存活，关机/休眠不执行，重启后补跑。

## Rollback

- `git diff v3-a..HEAD` 预览本批；`git reset --hard v3-a` 回滚到信息密度已验证版。
- 本记录文件：`docs/ui-changelog/v3-b.md`。

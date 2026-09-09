# UI 焕新 · V1-B「脉动前线·悬浮分享」

> 日期：2026-09-09 · 范围：头版 / 剪报抽屉 / 采编部 / 印务设置 · 决策人：用户（选方案 B 起手）

## 版本目标

1. 解决「排版拥挤」：Bento 卡片流替代三栏共流，版心与行距全面松绑。
2. 解决「按钮难懂」：黑话按钮改为「主标（人话）+ 副标（保留报纸腔）+ 悬停解释」三件套。
3. 注入「急切分享」情绪：Live 脉冲 + 一键复制分享链路（头条 / Top5 / 剪报含来源）。
4. 保持报纸灵魂：`--paper / --ink / --red` 纸墨朱三色与双细线、铅字章、锯齿剪报边全部保留。

## 改动清单

| 文件 | 改动 |
| --- | --- |
| `package.json` | 新增 `tailwindcss @tailwindcss/postcss framer-motion clsx tailwind-merge` |
| `postcss.config.mjs` | 已存在 `@tailwindcss/postcss` 插件（Tailwind v4 无需 tailwind.config） |
| `lib/utils.ts` | 新增 `cn()`（clsx + tailwind-merge） |
| `app/_components/ui/bento-grid.tsx` | 新增 Aceternity BentoGrid（纸墨化：报纸色边框+硬阴影 hover 变朱红） |
| `app/_components/ui/spotlight.tsx` | 新增 Aceternity Spotlight（朱红色 0.21 透明度光斑，报头氛围） |
| `app/_components/ui/hover-border-gradient.tsx` | 新增 Aceternity HoverBorderGradient（主按钮悬停旋转描边） |
| `app/_components/ui/tooltip.tsx` | 新增轻量 Tooltip（免 Radix 依赖，键盘可达） |
| `app/globals.css` | 接入 Tailwind；`.page` 1120/48px 呼吸；`.pulse-dot` Live 脉冲；`.share-rail` 悬浮分享栏；`.btn-stack` 双行按钮；`.empty-state` 空状态；`prefers-reduced-motion` 熔断 |
| `app/_components/Masthead.tsx` | Spotlight 光斑 + LIVE 脉冲点 + slogan「捕捉正在走热的 · 第一时间分享有价值的」+ 导航加英文副标 |
| `app/_components/GazetteBoard.tsx` | 按钮 →「⟳ 刷新热点 / ✦ 生成日报」+ Tooltip；`columns` → BentoGrid（Top2 跨 2 列）；右侧悬浮分享栏（复制头条/复制 Top5）；抽屉加「复制本条剪报（含来源链接）/打开原文」；空状态重设计 |
| `app/page.tsx` | 移除底部重复 Ticker，减少版心挤压 |
| `app/sources/page.tsx` | 面板标题人话化 + helper 说明 + 按钮双行化 + 表单占位提示 |
| `app/settings/page.tsx` | 文案去黑话 + 每个字段加 `hint` 解释 + 流程说明与头版按钮术语对齐 |

## 情绪表达设计

- **急切**：报头 LIVE 红点 2.4s 双波脉冲；头条 kicker 内嵌同款脉冲；Ticker 60s→36s 提速。
- **分享欲**：桌面端右侧悬浮「✂ 复制头条 / ≡ 复制 Top5」随时可发群；剪报抽屉内复制自动带来源链接，粘贴即完整情报。
- **克制**：全页仅 Spotlight + 主按钮描边 2 处动效组件，卡片 hover 仅位移+阴影。

## 前后对比（截图占位）

- [ ] 改版前：三栏共流、双 Ticker、①② 黑话按钮
- [x] 改版后：见会话内 browser 截图（头版 / 剪报抽屉 / 悬浮分享 / 采编部 / 印务设置）

## 验证状态（按「拆分多次 + 人工验证」约定收口）

- 自动验证：`next build` 通过（TS 0 错误）；自动化浏览器实测确认 BentoGrid 59 卡 / `gap 24px` / `radius 16px`、Spotlight 与 LIVE 脉冲渲染、Ticker 滚动、快照数据正常（第 7 期 · 899 条）。
- 自动验证到此停止；后续由用户人工验收。
- 人工验收入口：dev 服务保持运行 `http://localhost:3000`（进程 PID 6628）。
- 人工验收清单：
  1. 头版报头：Spotlight 朱红光斑、LIVE 脉冲、导航 FRONT/SOURCES/SETTINGS 副标
  2. 工具条：`⟳ 刷新热点` / `✦ 生成日报` 双行按钮 + 悬停 Tooltip；主按钮悬停旋转描边
  3. 热点版面：Bento 卡片疏朗（悬停红色硬阴影），点击卡片弹剪报抽屉
  4. 剪报抽屉：`复制本条剪报`（含来源链接）/ `打开原文` / `收起剪报`
  5. 悬浮分享栏：窗口宽 >1080px 时右侧出现「✂ 复制头条 / ≡ 复制 Top5」；窄屏按设计隐藏
  6. 采编部 / 印务设置：面板标题人话化 + hint 说明 + 表单占位提示

## 工作约定（用户指定，长期有效）

1. 修改内容过大时，拆分成多次完成，每次交付一小步。
2. 验证长时间无法推进时，立即停止自动验证、释放浏览器窗口，转人工验证。
3. 每版 UI 必须 markdown 留档（本目录），改版前先给方案供选择。

## 后续批次拆分（按约定化整为零）

- V2-a：热点版面分类 Tabs（全部 / 新上榜 / 走热 / 降温）
- V2-b：复制海报图（canvas 本地生成报纸风分享图）
- V2-c：移动端分享入口（抽屉底部快捷条 + 悬浮栏小屏适配）

## 已知待办

- [ ] V2-a 分类 Tabs + Top3 智能跨列。
- [ ] V2-b 复制海报图。
- [ ] V2-c 移动端分享入口（当前 ≤1080px 隐藏悬浮栏）。
- [ ] Tooltip 为自研轻量版，如需定位翻转可换 Radix。

## 决策门

- [ ] 用户人工验收后二选一：**保留并提交 git，之后微调** / **舍弃重做一版**。

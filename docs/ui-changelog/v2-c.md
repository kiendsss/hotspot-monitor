# UI 焕新 · V2-c「分区节奏精修 · 锚点导航 + 行距/跨栏微调」

> 父版：`v2`（`41b48db` 报纸分区大板块 + Wobble 头条 + Focus 聚读，方案 B）· 补丁：`97ca9c2` utf-8 显式 · 本批基于已确认版 `v2` 增量
> 原则：先提交已确认版 `v2`（已满足 `97ca9c2 working tree clean`），再开本批小改；`build` 通过即释窗转人工

## 本批要精修什么

- **版间节奏**：增 `热点版面 · N条 · M版` + 可点 **分区锚点目录**（`plate-toc`）顶置，多版时可一键跳版块。
- **板内层次**：头条加 `3px 朱红左竖线` 容器，`WobbleCard` 领读更凸；小卡 `FocusCards` 标题 `letter-spacing 0.04em / line-height 1.5`、摘要 `13px / 1.9`，扫读更松。
- **扫码感**：分区 `scrollIntoView({ behavior: 'smooth' })`，`id="plate-{cat}"` 直达，无整页跳闪。

## 改动清单

| 文件 | 改动 |
| --- | --- |
| `app/_components/GazetteBoard.tsx` | 分区渲染块：新增 grouped 复用 + `plate-toc` 导航（`grouped.length > 1` 才显）+ 每 `plate` 补 `id` + 头条外包朱红竖线容器 + 小卡行距字距微调 |
| `app/globals.css` | 新增 `.plate-toc` 样式 + 明确 `.story-title/.story-summary/.lead-summary` 行距字距 + `1.95` 放宽 |

## 验证（短验证即释窗）

- `npm run build` 通过（`Compiled successfully in 4.6s`，TS 0 错误），即停自动化。
- 未在浏览器做长时自动化探查；由你 `http://localhost:3000` 人工验收。

## 人工验收（约 2 分钟）

1. 头版分区标题下是否出现 `· M版` 计数与可点分类名（点即平滑滚动到对应大板块）。
2. 每区头条左是否有 3px 朱红竖线领读。
3. 小卡文字是否更疏朗（标题不过挤、摘要 13px 行距足）。

## 回滚

- 本批改动均在 `v2` 之上，`git diff v2..HEAD` 可查；回滚 `git reset --hard v2`。

# UI 焕新 · V2-d「通知呼吸 + 标题红收敛」

> 父版：`v2-c` (`5a40b7d` 锚点目录 + 朱红竖线，`bd20a45 tag v2-c`) · 本批为同轨热修小步 + 原计划续改（不扩大范围）
> 规程：开改前 `v2-c` 已为已确认版（`eba465a` 含规程表，`working tree clean`），本批 `build` 通过即释窗转人工

## 本批要修什么（来自你的原话）

1. **“消息框全部贴在边框上”**：`.notice` 原 `margin 14px 0 + padding 9px 15px + dashed red` 紧贴容器边框，无呼吸、虚线显廉价 → 改卡片化。
2. **“点击时红色很奇怪”**：`.extra-title / .lead-title / .story-title :hover { color: var(--red) }` 整字跳红突兀，焦点态也同色 → 改柔和下划线。

## 改动清单

| 文件 | 改动 |
|------|------|
| `app/globals.css` | `.notice`：`dashed red → solid var(--line) + 左 4px 实色竖线`，`bg var(--paper-dark)`（ok 态 `bg #eef4e8`），`margin 16px 2px`，`padding 11px 16px`，`radius 6px`，`shadow 2×2`，`line-height 1.7`；新增 ok 态配色 `#1b4d1e` |
| `app/globals.css` | 标题 hover：`color red → color ink + underline var(--red) 1.5–1.8px offset 3–4px`；新增 `:focus-visible { outline 1.5px solid red offset 3px radius 2px }` 供键盘可达 |
| （未动） | `GazetteBoard.tsx / 结构` 本批不动逻辑，仅样式收敛 |

## 为何这样改

- 通知改实色左竖线是报纸“校正条”母题，比虚线更稳；留 `2px` 侧呼吸 + `6px` 圆角避免贴边。
- 标题红收敛为**下划线**：保留“热”信号但不整字换色，点击/键盘焦点均柔和。

## 验证（短验证即释窗）

- `npm run build` 通过（`Compiled successfully`，TS 0），即停自动化。
- 人工验收见下。

## 人工验收（约 1 分钟）

1. 触发一次通知（点 刷新热点/生成日报 或切换过滤）：通知块是否四周有呼吸、不贴边、左侧有色条。
2. 鼠标悬停任意热点标题：是否仅出现红色下划线而非整行变红；Tab 键聚焦标题是否有细红描边。

## 回滚

- 本批在 `v2-c` 之上，`git diff v2-c..HEAD` 可查；回滚 `git reset --hard v2-c`。

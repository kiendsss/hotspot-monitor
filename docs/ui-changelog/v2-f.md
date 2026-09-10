# UI 焕新 · V2-f「版面呼吸 · 入场与锚点节奏」

> 父版：`v2-e` (`9084eeb` / `v2-e`)；本批为原计划续改的小步：不改结构，只调版面呼吸与入场节奏
> 原则：先确认已提交 `v2-e`（`working tree clean` 于 `9084eeb`）再改；`build` 通过即释窗转人工

## 做什么/为什么

### 1. 全站平滑滚动
- `html { scroll-behavior: smooth }` — 点击 `plate-toc` 锚点目录时版块平滑抵达，避免硬跳；`prefers-reduced-motion` 下回退为 `auto`。

### 2. 分版入场与呼吸
- `.plate`：`margin-bottom 28→32px`、`scroll-margin-top 88px`（锚点不再贴顶 `masthead`）、`animation plateIn 0.42s` + 按序 `0 / 0.05 / 0.1 / 0.14 / 0.18 / 0.22s` 错落，纸页依次落格的报纸感。
- `.plate-hd`：`padding 11→12px` 垂直多 1px 呼吸。
- `.plate-toc a`：补 `:focus-visible` 与 `outline 1.5px solid var(--red) offset 2px`，键盘与点击一致。

### 3. 熔断
- `prefers-reduced-motion` 同时熔断 `html scroll` 与 `.plate animation`。

## 改动清单

| 文件 | 改动 |
| --- | --- |
| `app/globals.css` | 新增 `html scroll-behavior`、`.plate` 入场动画/错落/`scroll-margin`/`mb`、`.plate-hd` 呼吸、`.plate-toc a:focus-visible`、reduced-motion 扩展 |

## 验证（短验证即释窗）

- `npm run build` 通过（`Compiled successfully in 949ms`，TS 0 错误），即停自动化。
- 由你 `http://localhost:3000` 人工验收。

## 人工验收（约 1 分钟）

1. 首次载入：各大板块是否依次淡入上浮（关掉 `减少动态` 时；开 `减少动态` 则静止）。
2. 点顶置 `社会 / 科技 / …` 锚点目录：是否平滑滚动且版头离顶有 88px 留白，不被遮挡。
3. `Tab` 键在锚点目录间移动：焦点是否有红描边，`Enter` 跳版与鼠标一致。

## 回滚

- `git diff v2-e..HEAD` 查本批；`git reset --hard v2-e` 丢弃。`tag v2-e` 仍为保守锚点。

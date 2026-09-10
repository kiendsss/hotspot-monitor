# UI 焕新 · V2-i「抽屉与海报入场 · ESC 与滚动锁」

> 父版：`v2-h` (`8195008` / tag `v2-h`，人验通过)；原计划续改小步：不改分区结构，只补模态与键盘体验
> 原则：先确认已提交 `v2-h`（`working tree clean` 于 `8195008`）再改；`build` 通过即释窗转人工

## 做什么/为什么

### 1. ESC 关闭与滚动锁
- `GazetteBoard.tsx`：`selected / poster` 任一打开时监听 `Escape`（有海报先关海报），并锁 `body overflow: hidden`，关后还原，避免抽屉/海报下底页仍可滚动。

### 2. 入场动效与阴影
- `.drawer`：`animation drawerIn 0.28s`（`translateX 12→0`）+ `box-shadow -8px 0 24px`，抽屉滑入更像“拉出剪报”。
- `.poster-modal`：`animation posterIn 0.22s`（`translateY 8→0 scale 0.99→1`），海报弹窗轻弹出。
- `prefers-reduced-motion` 熔断扩展至 `.drawer` / `.poster-modal`。

## 改动清单

| 文件 | 改动 |
| --- | --- |
| `app/_components/GazetteBoard.tsx` | `Escape` 监听 + `body overflow` 锁 |
| `app/globals.css` | `.drawer` 入场/阴影、`.poster-modal` 入场、reduced-motion 扩展 |

## 验证（短验证即释窗）

- `npm run build` 通过（`Compiled successfully in 664ms`，TS 0 错误），即停自动化。
- 由你 `http://localhost:3000` 人工验收。

## 人工验收（约 1 分钟）

1. 点标题打开剪报：抽屉是否滑入、底页不可滚动；按 `Escape` 是否关闭；再点海报：`Escape` 是否先关海报再关抽屉。
2. 海报预览是否轻弹出；开“减少动态”时两者均无动画。

## 回滚

- `git diff v2-h..HEAD` 查本批；`git reset --hard v2-h` 丢弃。`tag v2-h` 仍为保守锚点。

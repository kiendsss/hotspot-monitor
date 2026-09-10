# UI 焕新 · V2-g「工具链收口 · notice 自愈 + 加载空态 + 工具条留白」

> 父版：`v2-f` (`ddd80c8` / tag `v2-f`，人验通过)；原计划续改小步：不改版式结构，收敛交互反馈
> 原则：先确认已提交 `v2-f`（`working tree clean` 于 `ddd80c8`）再改；`build` 通过即释窗转人工

## 做什么/为什么

### 1. notice 提示自愈（不再常驻）
- 之前 `notice` 出现后常驻到下一次操作；现 `useEffect + setTimeout 4000ms` 自动清除，成功/失败提示都 4 秒淡出，避免版面被旧提示占位。

### 2. 加载空态补齐
- 之前 `snapshot` 存在但 `hotspots` 未渲染完成时页面无中间态；现补 `snapshot && !headline` 的 `正在开印…` 空态（`aria-busy`），与“创刊号筹备中”区分。

### 3. 工具条与筛选留白统一
- `.toolbar`：`margin 20px 0 → 24px 0 20px + padding-bottom 16px + 分隔细线 rgba(42,37,29,0.12)`，与下方 tabs/版面形成“上工具、下版面”的层次；`gap 12→14px`。

### 4. 头条摘要间距微调
- `.extra .extra-summary { margin-top: 18px }`（原 16），头条呼吸更足。

## 改动清单

| 文件 | 改动 |
| --- | --- |
| `app/_components/GazetteBoard.tsx` | notice 4s 自动清除；`snapshot && !headline` 加载空态 |
| `app/globals.css` | `.toolbar` 留白/分隔线；`.extra .extra-summary` 间距 |

## 验证（短验证即释窗）

- `npm run build` 通过（`Compiled successfully in 716ms`，TS 0 错误），即停自动化。
- 由你 `http://localhost:3000` 人工验收。

## 人工验收（约 1 分钟）

1. 点「刷新热点 / 生成日报」：提示条出现后约 4 秒自动消失，不再常驻。
2. 头条摘要与标题间距略宽；工具条与下方筛选/版面有细线分隔，层次更清晰。
3. 空库冷启动：仍显示“创刊号筹备中”；有刊号但加载中：显示“正在开印…”。

## 回滚

- `git diff v2-f..HEAD` 查本批；`git reset --hard v2-f` 丢弃。

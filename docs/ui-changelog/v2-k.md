# UI 焕新 · V2-k「版头胶囊与空态层次」

> 父版：`v2-j` (`6f632ac` / tag `v2-j`，人验通过)；原计划续改小步：未改分区/卡片结构，只收敛版头计数与空态排版
> 原则：先确认已提交 `v2-j`（`working tree clean` 于 `6f632ac`）再改；改前已清旧 dev 进程 `:3000 free`；`build` 通过即释窗转人工

## 做什么/为什么

### 1. 版头计数胶囊落格
- 之前 `.plate-hd .more` 为裸 `mono 11px faint` 文，版头 `h2 + 更` 层次弱，扫读不抓计数。
- 本批 `border 1px rgba(42,37,29,0.25) + bg var(--paper) + padding 3px 9px + radius 999px` 胶囊化，与纸墨同色，不抢朱红竖条。

### 2. 空态层次
- `.empty-state` 补 `p + .btn / p:has(+ .btn) margin-top 16px`，若空态内含按钮（未来扩展）与段落间距一致；同时承接 V2-h 的 `56/24 + 16/2/20 + radius 8` 呼吸。

## 改动清单

| 文件 | 改动 |
| --- | --- |
| `app/globals.css` | `.plate-hd .more` 胶囊化；`.empty-state` 含按钮时的 `mt 16px` |

## 验证（短验证即释窗）

- `npm run build` 通过（`Compiled successfully in 668ms`，TS 0 错误），即停自动化。
- 由你 `http://localhost:3000` Ctrl+F5 人工验收。

## 人工验收（约 30 秒）

1. 每区版头右侧 `N 条 · 热度 M` 是否为纸色胶囊（非裸字）。
2. 空态卡（无数据/过滤空）段落与按钮（若有）间距是否一致。

## 回滚

- `git diff v2-j..HEAD` 查本批（仅 `globals.css+md`）；`git reset --hard v2-j` 丢弃。`tag v2-j` 仍为保守锚点。

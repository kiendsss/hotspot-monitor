# UI 焕新 · V2-l「筛选胶囊与版距」

> 父版：`v2-k` (`3f83bd2` / tag `v2-k`，人验通过)；原计划续改小步：未改分区/卡片结构，只收敛筛选条与版距
> 原则：先确认已提交 `v2-k`（`working tree clean` 于 `3f83bd2`）再改；改前已清旧 dev 进程 `:3000 free`（杀 30620/28844/4228，待 `TIME_WAIT` 释放）；`build` 通过即释窗转人工

## 做什么/为什么

### 1. Tabs 筛选胶囊化与版距
- 之前 `.tabs`/`.tab` 为方角硬阴影，常态与 `.toolbar` 无分隔，选中态仅墨底，整排按钮与胶囊化的版头/胶囊不统一。
- 本批：
  - `.tabs`：`margin 4 0 16 → 8 0 20 + padding 6 0 14 + 底细线 rgba(42,37,29,0.08)`，与上方工具条、下方版面形成三段节奏。
  - `.tab`：`方角→胶囊 radius 999px`、`12.5px 0.14em 7/14 → 12px 0.12em 6/13`、`shadow 2px → 1.5px`、`hover 墨底改为 paper-dark + 0.5px 轻位移`，符合纸墨系；选中态加深 `shadow 1.5px rgba(26,23,18,0.35)`；补 `:focus-visible 1.5px red`。
  - `.tab .n`：`margin-left 7→6px / 11px` 数徽更紧凑。

## 改动清单

| 文件 | 改动 |
| --- | --- |
| `app/globals.css` | `.tabs`/`.tab`/`.tab:hover|:focus-visible|.active`/`.tab .n` 全量胶囊节奏收口 |

## 验证（短验证即释窗）

- `npm run build` 通过（`Compiled successfully in 1035ms`，TS 0 错误），即停自动化。
- 由你 `http://localhost:3000` Ctrl+F5 人工验收，无需重开 Cursor。

## 人工验收（约 40 秒）

1. 筛选排 `全部 / 新上榜 / ↑走热 / ↓降温` 是否为纸色胶囊，选中为墨底胶囊；`Tab` 聚焦是否有红描边；整排下方是否有细分隔线与下方版面分隔。
2. 与版头胶囊 `.plate-hd .more` 是否同为 `999px 圆角 + 1.5px 边` 同体系。

## 回滚

- `git diff v2-k..HEAD` 查本批（仅 `globals.css+md`）；`git reset --hard v2-k` 丢弃。`tag v2-k` 仍为保守锚点。

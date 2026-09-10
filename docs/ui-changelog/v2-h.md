# UI 焕新 · V2-h「头版与空态呼吸」

> 父版：`v2-g` (`c26b13e` / tag `v2-g`，人验通过)；原计划续改小步：不改结构，只调头版与版面节奏
> 原则：先确认已提交 `v2-g`（`working tree clean` 于 `c26b13e`）再改；`build` 通过即释窗转人工

## 做什么/为什么

### 1. 头版与版面分隔
- `.extra`：`padding 40/16/28 → 44/16/32 + margin-bottom 8px`，头条与下方分隔线距离更足。
- `.section-rule`：`margin 36 0 20 → 40 0 24`，分隔线上下留白加深。
- `.section-title`：`margin-bottom 18→20px`，标题与锚点目录/版块间距更舒。

### 2. 空态呼吸
- `.empty-state`：`padding 56/20 → 56/24 + margin 16/2/20 + radius 8px`，两侧不再贴边，与提示条 `.notice` 保持一致的内缩节奏。

## 改动清单

| 文件 | 改动 |
| --- | --- |
| `app/globals.css` | `.extra/.section-rule/.section-title/.empty-state` 的 padding/margin/radius 微调 |

## 验证（短验证即释窗）

- `npm run build` 通过（`Compiled successfully in 691ms`，TS 0 错误），即停自动化。
- 由你 `http://localhost:3000` 人工验收，无需重开 Cursor（Ctrl+F5 即可，乱码问题已通过 staleTimes 与验证脚本解决）。

## 人工验收（约 1 分钟）

1. 头条与下方版面之间留白是否更足。
2. 无数据/加载中空态卡是否四周有呼吸、两侧不贴边、圆角与提示条一致。

## 回滚

- `git diff v2-g..HEAD` 查本批；`git reset --hard v2-g` 丢弃。`tag v2-g` 仍为保守锚点。

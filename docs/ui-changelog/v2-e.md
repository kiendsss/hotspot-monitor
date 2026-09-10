# UI 焕新 · V2-e「纸墨同色阴影 + 卡片呼吸」

> 父版：`v2-d` (`dedf15d`)；投诉：下沿红色阴影与纸墨不协、卡片内“字贴边/太挤”；本批为小步热修
> 原则：先确认已提交 `v2-d`（`working tree clean` 于 `dedf15d`），再改本批；`build` 通过即释窗转人工

## 修什么/为什么

### 1. 下层红色 → 纸墨同色
- **问题**：`FocusCards hover: shadow-[4px_4px_0_var(--red-dark)]` 在浅纸色上像漏油红，与 `--ink/--line` 报纸墨不协，上屏截图中尤其刺眼。
- **改**：`shadow-[3px_3px_0_rgba(42,37,29,0.16)]` 常态 + `hover shadow-[4px_4px_0_rgba(42,37,29,0.26)]`，同 `WobbleCard shadow` 统一为墨色成型，红仅留分区 `i` 竖条与 `plate-hd` 细处。
- **文件**：`app/_components/ui/focus-cards.tsx`（两档阴影类名）+ `app/_components/ui/wobble-card.tsx`（`4px...0.22 → 3px...0.16`）

### 2. 卡片与字体太紧凑 → 统一放松
- **问题**：卡内 `p-5 / gap-2`、网格 `gap-4`、标题 `line-height 1.45 / margin 6-8px`、摘要无字距，截图中 `No.8` 字贴圆角、标题与正文几乎相撞。
- **改**：
  - `FocusCards`：`gap-4 → gap-5`、`p-5 → px-6 py-6`、`FocusCard gap-2 → gap-3`
  - `WobbleCard`：`p-6 md:p-8 → p-7 md:p-9`、`shadow 4→3px 0.22→0.16`
  - `globals.css`：`.plate-body 16/16 → 22px 20px / 22px`；`.lead-title lh 1.45→1.55 + ls 0.04em`、`.lead-summary 14/1.95 → 14.5/2.0 + ls 0.02 + mt 14`；`.story-title 21/1.45/6-8 → 20/1.5/0.03em/8-10`；`.story-summary +ls 0.02 +mt 6 lh 1.95`；`.lead-meta ls 0.08→0.1 mb 8→10`
- **文件**：`app/globals.css`

## 改动清单

| 文件 | 改动 |
| --- | --- |
| `app/_components/ui/focus-cards.tsx` | 网格 gap、卡 padding/gap、常态与 hover 阴影改为墨色 |
| `app/_components/ui/wobble-card.tsx` | 卡 padding 与阴影同纸墨收淡 |
| `app/globals.css` | `.plate-body/.lead-*/.story-*` 行距字距段距全放松 |

## 验证（短验证即释窗）

- `npm run build` 通过（`Compiled successfully in 595ms`，TS 0 错误），即停自动化。
- 由你 `http://localhost:3000` 人工验收（多分区时尤其看出卡是否不再挤）。

## 人工验收（约 1 分钟）

1. 任意小卡悬停：下沿**墨色**硬阴影，无红块。
2. 大卡与小卡内文字与边框均有明显留白，标题/摘要段距足，不贴边（对照截图的 `No.8` 行尤明显）。
3. 窄屏下卡片单列时依然呼吸足够。

## 回滚

- `git diff v2-d..HEAD` 查本批；`git reset --hard v2-d` 丢弃。`tag v2-c` 保守锚点仍有效。

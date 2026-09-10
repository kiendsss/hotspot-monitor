# UI 焕新 · V2-j「徽章与条头落格」

> 父版：`v2-i` (`5d7da27` / tag `v2-i`，人验通过)；原计划续改小步：未改分区结构，补缺失的徽章与条头样式
> 原则：先确认已提交 `v2-i`（`working tree clean` 于 `5d7da27`）再改；`build` 通过即释窗转人工

## 修什么/为什么

- 之前 `.stamp / .story-top` 在 `globals.css` 中未定义，`TrendStamp`（新上榜/走热/降温）与 Focus 卡头的 `No.x / 热度` 仅裸文本，层次不清。
- 本批按报纸纸墨系补：
  - `.stamp`：`mono 10px 0.1em / 1.4 / border 1px / paper-dark 底`；`new` 朱红底 `var(--red-dark)` 边，`up` 墨绿底，`down` 透明描边，`flat` 默认。
  - `.story-top`：`mono 10.5px 0.1em / faint 色 / dashed 底线 / pb 6px mb 2px / flex 两端`，Focus 卡头 `No. / 热度` 落格。

## 改动清单

| 文件 | 改动 |
| --- | --- |
| `app/globals.css` | 新增 `.stamp / .stamp.new|up|down / .story-top` 及注释 `V2-j 徽章与条头` |

## 验证（短验证即释窗）

- `npm run build` 通过（`Compiled successfully in 4.1s`，TS 0 错误），即停自动化。
- 由你 `http://localhost:3000` Ctrl+F5 人工验收，无需重开 Cursor。

## 人工验收（约 1 分钟）

1. 头条与小卡标题旁：`新上榜 / ↑走热 / ↓降温` 是否为徽章块（非裸字）。
2. Focus 小卡顶：`No.8 · 热度 70` 是否两端对齐、带虚线底线。
3. 筛选 `新上榜/走热/降温` 时计数与徽章一致。

## 回滚

- `git diff v2-i..HEAD` 查本批（仅 `globals.css+md`）；`git reset --hard v2-i` 丢弃。

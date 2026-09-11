# UI Refresh v2-r - small-screen masthead & extra rhythm

Parent: v2-q (0f0c4be, build ok 1381ms; man verified 2026-09-11). Small step: desktop untouched; only ≤720px rhythm of masthead / extra / empty / toolbar / drawer / poster.

Process: working tree clean at v2-q tag before edit; port 3000 already free (no dev running, no auto-start per rule); build pass -> commit -> confirm free again.

## What / Why

V2-q收口了 section/plate 链，但 ≤720px 时报头与头条链仍是桌面节奏:
- .masthead h1 clamp(40px..) + 0.18em 字距，两行标题在 360px 换行时行距紧
- .masthead-meta 13px + .nav a padding 4/14 溢出窄屏一行
- .extra 44/16/32 + kicker 13px/0.5em 在手机上过大
- .extra-summary 16px/1.95 与 .empty-state 56px padding 偏大
- .toolbar gap14 + drawer 26/28 + poster 16 未收

Fix (≤720px only, same breakpoint as v2-q):
- .masthead h1: letter-spacing 0.1em, line-height 1.18（两行更从容）
- .masthead-meta: 11px / 0.08em / gap 8；.nav gap 6、a padding 4/10（单行放下）
- .extra: padding 30/12/22；kicker 11px / 0.3em / padding 3-10-13 / mb 12；summary 14px / 1.8
- .empty-state: padding 36/16；p 13.5px / 1.9
- .toolbar: gap 10 / margin 16 0 14 / pb 12；.btn-stack small 10px
- .drawer: padding 20/18；.poster-modal: padding 12

## Change list

| File | Change |
|------|--------|
| app/globals.css | 720px block: masthead h1/meta/nav + extra/kicker/summary + empty-state + toolbar/btn-stack + drawer/poster |
| docs/ui-changelog/v2-r.md | This record |
| docs/versions.md | Add v2-r row |

## Verify (short, then handoff)

- npm run build passed (Compiled successfully in 1275ms, TS 0) then stop automation.
- Manual verify: devtools mobile or narrow window ≤720px; Ctrl+F5 at http://localhost:3000 (user starts dev manually).

## Manual check (40s)

1. ≤720px: 报头主标两行不挤（行距 1.18），meta 栏（日期/导航/LIVE）单行或整齐折行不溢出。
2. 号外区: 红章 kicker 变小、标题下摘要 14px 更紧凑；空态卡内边距收窄仍留呼吸。
3. 工具条双行按钮不溢出；打开剪报抽屉/海报预览 padding 变紧但可读；>720px 完全不变。

## Rollback

- git diff v2-q..HEAD to preview (css+md only); git reset --hard v2-q to drop.

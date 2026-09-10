# UI Refresh v2-n - card adaptive: no breathing + centered, clamp + wrap

Parent: v2-m (df5f424 / tag v2-m, man verified: other parts pass). This batch only fixes cards per screenshot; no other visual change.
Sibling: v2-n first commit 74b3618 was static+centered (gap/justify); this amendment makes content fully adaptive.

Process: verified v2-m is committed and tagged before edit; old dev on :3000 was killed before edit (per rule: kill but not auto-start, user verifies manually); build pass -> commit -> kill again but not auto-start.

## What / Why

Screenshot (体育版 No.6 / 11 / 12 / 13): cards have 1-2 line titles + 2-4 line summaries of varying length. Previous fix removed breathing but kept h-full top-aligned with fixed 16.5px title, so cards with 1-line summary are tall gaps or cut off, long titles wrap cramped.

Fix (adaptive, still paper-static):
- FocusCards: grid -> `gap-6 auto-rows-fr items-stretch`; each card `flex flex-col p-6 sm:p-7 min-h-[148px] h-full overflow-hidden shadow 2px` — cards in a row equal height and stretch.
- FocusCard inner: `flex flex-1 flex-col gap-3.5 min-w-0 self-stretch` — summary can flex to fill.
- Story title: remove `!text-[16.5px] !mt-1` inline and `margin 8 0 10`; now `clamp(15px,1.9vw,17px) line-height 1.55 margin 2 0 0` + `overflow-wrap anywhere break-word hyphens` + `flex-wrap gap 6x8` so title + stamp wrap together adaptively without squeezing.
- Summary: `line-height 1.85 overflow-wrap anywhere break-word` + `flex:1 line-clamp 4` (5 on md) with overflow hidden — long copy truncates to 4-5 lines, short copy flexes, no clipped overflow; removed `!indent-0 !text-[13px] !leading-[1.9]`.
- Board: hotspot.title wrapped in `flex-1 min-w-0` so stamp does not push title off.

## Change list

| File | Change |
|------|--------|
| app/_components/ui/focus-cards.tsx | grid auto-rows-fr, card flex flex-col p6 sm:p7 min-h h-full overflow-hidden, FocusCard flex-1 min-w-0 |
| app/_components/GazetteBoard.tsx | title h3 -> story-title (no !text inline), span min-w-0 flex-1, summary -> story-summary |
| app/globals.css | .story-title clamp + wrap + gap + anywhere; .story-summary 1.85 + clamp 4/5 + flex |
| docs/ui-changelog/v2-n.md | This record (amended) |
| docs/versions.md | v2-n row updated |

## Verify (short, then handoff)

- npm run build passed (Compiled successfully in 1411ms, TS 0) then stop automation.
- Manual verify at http://localhost:3000 Ctrl+F5 (user starts dev manually).

## Manual check (40s)

1.体育版三列: Cards equal height per row, No.6 17岁松崎 / No.11 刘翔祺 / No.12 中国女排 等标题 no longer overflow, summary fits 4-5 lines with ellipsis.
2.Short summary (No.13 勇士) card not局促, text centered-ish with gap, not top-pinned.
3.Long title wraps to 2 lines with stamp on same line or wrapped, not cramped to border; hover still static, click title still opens drawer.

## Rollback

- git diff v2-m..HEAD to preview; git reset --hard v2-m to drop. Tag v2-m remains safe anchor. git diff 74b3618..HEAD to see adaptive delta over first static fix.

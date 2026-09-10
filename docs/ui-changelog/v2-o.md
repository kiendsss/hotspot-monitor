# UI Refresh v2-o - card padding: no touching border + lead static

Parent: v2-n (0969c3f / tag v2-n, man verified). Small step: no structure change, fixes card content touching border per screenshot No.7.

Process: v2-n tagged before edit; old dev :3000 killed before edit (kill only, no auto-start); build pass -> amend into v2-o commit (single SHA) -> kill check again but not auto-start.

## What / Why

Screenshot No.7 青藏高原冰川: content hugs card border (~0 gap), title and summary visually glued to edge, radius looks clipped.
Fix (amends same v2-o commit):
- WobbleCard inner: `p-6 sm:p-8` -> `px-7 py-6 sm:px-8 sm:py-7` (28px sides top/bottom breathing consistent with small cards)
- FocusCards outer: `p-6 sm:p-7` -> `px-7 py-6 sm:px-8 sm:py-7` (lead and small cards share same 28px horizontal, 24/28px vertical rhythm)
- Lead title/summary adaptive (clamp + wrap) from prior v2-o delta retained.

## Change list

| File | Change |
|------|--------|
| app/_components/ui/wobble-card.tsx | inner `p-6 sm:p-8` -> `px-7 py-6 sm:px-8 sm:py-7` |
| app/_components/ui/focus-cards.tsx | outer `p-6 sm:p-7` -> `px-7 py-6 sm:px-8 sm:py-7`, min-h 150 |
| docs/ui-changelog/v2-o.md | this record (amended) |
| docs/versions.md | v2-o row build 2.8s |

## Verify (short, then handoff)

- npm run build passed (Compiled successfully in 2.8s, TS 0) then stop automation.
- Manual verify at http://localhost:3000 Ctrl+F5 (user starts dev manually).

## Manual check (30s)

1. No.7 and all cards: content has visible 28px gap from border on all sides (left/right/top/bottom), no touching.
2. Small cards (体育三列) same gap, summary not clipped.
3. Lead still adaptive: title stamp wraps, not cramped.

## Rollback

- git diff v2-n..HEAD to preview; git reset --hard v2-n to drop. Tag v2-n remains safe anchor.

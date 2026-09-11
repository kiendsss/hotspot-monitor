# UI Refresh v2-p - mobile share bar equal fit

Parent: v2-o (b7d944b, build ok 2.8s; man pending). Small step: no desktop change; only ≤1080px share-bottom behavior.

Process: working tree clean at b7d944b before edit; kill old dev on :3000 before edit (kill only, no auto-start per rule); build pass -> commit -> kill again but not auto-start.

## What / Why

On small screens the fixed bottom bar (✂ 头条 / ≡ Top5 / ▣ 海报) uses natural button widths: three uneven buttons crowd left, leaving dead space right; with 2 buttons (no headline) even worse. Rule: bar should distribute evenly like v2-n/v2-o adaptive cards.

Fix:
- .share-bottom: add base `gap 8px` (was only in media query) so hidden state keeps layout intent.
- .share-bottom .share-btn: `flex 1 1 0 + justify-center + min-width 0 + white-space nowrap` — each button takes equal share of row width, text centers, no overflow/wrap at 360px.

Desktop untouched (bar hidden >1080px).

## Change list

| File | Change |
|------|--------|
| app/globals.css | .share-bottom base gap; .share-btn equal flex fit |
| docs/ui-changelog/v2-p.md | This record |
| docs/versions.md | Add v2-p row |

## Verify (short, then handoff)

- npm run build passed (Compiled successfully in 1879ms, TS 0) then stop automation.
- Manual verify: resize window ≤1080px or devtools mobile; Ctrl+F5 at http://localhost:3000 (user starts dev manually).

## Manual check (30s)

1. ≤1080px: bottom bar buttons share width equally (1/3 each with 3 buttons, 1/2 with 2), text centered, no crowding left.
2. 360px narrow: no text wrap/overflow; safe-area padding intact.
3. >1080px: bar hidden, right rail unchanged.

## Rollback

- git diff v2-o..HEAD to preview (css+md only); git reset --hard v2-o to drop.

# UI Refresh v2-q - small-screen plate rhythm

Parent: v2-p (43f632c, build ok 1879ms; man pending). Small step: desktop untouched; only ≤720px typography/padding of section chrome.

Process: working tree had a leftover uncommitted globals.css diff (an earlier draft of the 720px section-title rule, content same direction as this batch); it is folded into this batch, documented here; kill old dev on :3000 before edit (kill only, no auto-start per rule); build pass -> commit -> kill again but not auto-start.

## What / Why

≤720px previously only shrank .page/.masthead padding (v2 时期). Section chrome was desktop-sized:
- .section-title 15px/0.4em + 16/20 padding overflows narrow width with long titles + count chip
- .plate-hd 17px/0.32em + .more capsule nowrap crowds headline; long capsule text can push h2
- .plate-body 22/20 padding + 22 gap too airy for phone; .plate-toc chips 11.5px + big padding wrap to 3 rows; .ticker 12.5px fine but 18px margins waste width

Fix (≤720px only):
- .section-title: 13px / 0.24em / padding 12-14px; .count 10px; plus base `max-width 100% + flex-wrap wrap` (moved from leftover draft) so long combos wrap instead of overflow
- .plate-hd: padding 10 12, gap 8; h2 15px / 0.2em; .more 10px padding 2 7 nowrap flex-shrink 0 (stays one line, h2 wraps first)
- .plate-body: padding 16 14, gap 16
- .plate-toc a: 11px padding 4 8
- .ticker span: 11.5px margin 0 12

## Change list

| File | Change |
|------|--------|
| app/globals.css | new 720px block (section-title/plate-hd/more/plate-body/toc/ticker) + section-title base wrap |
| docs/ui-changelog/v2-q.md | This record |
| docs/versions.md | Add v2-q row |

## Verify (short, then handoff)

- npm run build passed (Compiled successfully in 1381ms, TS 0) then stop automation.
- Manual verify: devtools mobile or narrow window ≤720px; Ctrl+F5 at http://localhost:3000 (user starts dev manually).

## Manual check (40s)

1. ≤720px: 热点版面 title bar fits one line or wraps cleanly with count chip; no horizontal scroll.
2. Plate header (体育/科技 etc): title + more capsule aligned, capsule not clipped; body padding visibly tighter, cards roomier.
3. TOC chips + ticker slightly smaller, still legible; >720px unchanged.

## Rollback

- git diff v2-p..HEAD to preview (css+md only); git reset --hard v2-p to drop. Note v2-o also still pending tag.

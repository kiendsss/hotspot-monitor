# UI Refresh v2-m - masthead meta + share rail capsule

Parent: v2-l (40c44a5 / tag v2-l, man verified). Small step: no plate/card structure change, only masthead and share rail rhythm.

Process: verified version committed at v2-l (working tree clean) before this batch; kill old dev on :3000 before editing (per new rule: kill but do not auto-start, user verifies manually); build pass -> commit -> kill again but not auto-start.

## What / Why

### 1. Masthead meta breathing
Before: .masthead-meta margin-top 14px padding 8px 6px tight, top border close to subtitle.
Now: margin-top 16px padding 10px 8px, date / nav / LIVE block has more air, aligns with toolbar gap rhythm introduced in v2-l.

### 2. Share rail capsule
Before: naked column of buttons fixed right 18px top 40% gap 8px, visually floating without container.
Now: outer wrapper gets 6px padding + 1px rgba line + rgba(244,239,228,0.92) + backdrop blur 6px + radius 12px + soft shadow 2px 2px 0 rgba(42,37,29,0.08). Buttons keep ink hover, but rail itself is a paper capsule consistent with plate/panel system.

## Change list

| File | Change |
|------|--------|
| app/globals.css | .masthead-meta spacing; .share-rail container capsule |

## Verify (short, then handoff)

- npm run build passed (Compiled successfully in 703ms, TS 0) then stop automation.
- Manual verify at http://localhost:3000 Ctrl+F5 (user starts dev manually).

## Manual check (30s)

1. Masthead bottom bar (date | nav | LIVE) has slightly more vertical padding vs previous.
2. Right share rail (desktop >1080px): 3 buttons inside a soft paper pill with blur, not floating bare.

## Rollback

- git diff v2-l..HEAD to preview; git reset --hard v2-l to drop. Tag v2-l remains safe anchor.

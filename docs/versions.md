# Hotspot Monitor - Version and Rollback Record (process: commit verified version first, then changelog md, then tag)

## Procedure (agreed, long-term)

1. Before each change: `git commit` the verified version at HEAD, mark with `tag v{N}`.
2. After change: add `docs/ui-changelog/v{N}*.md` with same version in title and commit message.
3. Rollback anchor is the tag:
   ```bash
   git log --oneline --graph --all -12
   git checkout v2        # view v2 state
   git reset --hard v2    # discard later changes, rollback to v2
   git diff v2..HEAD      # what changed since v2
   ```

## Anchors

| Tag | Commit | Meaning | Verified | Commands |
|-----|--------|---------|----------|----------|
| v1-b (no tag yet) | dd9f269 | V1-B breathing + share | man | git checkout dd9f269 |
| v2 | 97ca9c2 (incl 41b48db) | V2 newspaper plates + Wobble lead + Focus cards (Plan B) + utf-8 fix | PASS | git checkout v2 / reset --hard v2 |
| v2-c | eba465a (incl 5a40b7d) | V2-c rhythm polish: plate TOC + lead red bar + spacing | PASS 2026-09-09 | git checkout v2-c |
| v2-d | dedf15d | V2-d notice breathing + title red->underline | PASS 2026-09-10 | git checkout v2-d / diff v2-c..v2-d |
| v2-e | 9084eeb | V2-e ink shadow + card breathing (fixes red shadow + tight type) | PASS 2026-09-10 | git checkout v2-e / diff v2-d..v2-e |
| v2-f | ddd80c8 | V2-f plate breathing + stagger entrance + smooth anchors | PASS 2026-09-10 | git checkout v2-f / diff v2-e..v2-f |
| v2-g | c26b13e | V2-g notice auto-dismiss + loading empty + toolbar breathing | PASS 2026-09-10 | git checkout v2-g / diff v2-f..v2-g |
| v2-h | 8195008 | V2-h headline + empty breathing (section/extra/panel) | PASS 2026-09-10 | git checkout v2-h / diff v2-g..v2-h |
| v2-i | 5d7da27 | V2-i drawer/poster entrance + ESC + scroll lock | PASS 2026-09-10 | git checkout v2-i / diff v2-h..v2-i |
| v2-j | 6f632ac | V2-j stamp + story-top paper style | PASS 2026-09-10 | git checkout v2-j / diff v2-i..v2-j |
| v2-k | 3f83bd2 | V2-k plate head capsule + empty level | PASS 2026-09-10 | git checkout v2-k / diff v2-j..v2-k |
| v2-l | 40c44a5 | V2-l tabs capsule + section spacing | PASS 2026-09-10 | git checkout v2-l / diff v2-k..v2-l |
| v2-m | df5f424 | V2-m masthead meta + share rail capsule | PASS 2026-09-10 | git checkout v2-m / diff v2-l..v2-m |
| v2-n | 0969c3f | V2-n card adaptive: static no breathing + clamp/wrap (fix 局促) | PASS 2026-09-10 | git checkout v2-n / diff v2-m..v2-n |
| v2-o | b7d944b | V2-o card padding gap from border (fix贴边) + lead adaptive static | pending man | git checkout v2-o / diff v2-n..v2-o |
| v2-p | 43f632c | V2-p mobile share bar equal fit | pending man | git checkout 43f632c / diff v2-o..43f632c |
| v2-q | afa9337 | V2-q small-screen plate rhythm (720px) | build ok 1381ms, pending man | git diff v2-p..HEAD / checkout afa9337 |

## Changelog files

| MD file | Commit | Content |
|---------|--------|---------|
| docs/ui-changelog/v1-b.md | dd9f269 | paper breathing + dual-line buttons + LIVE pulse + share/poster |
| docs/ui-changelog/v2.md | 41b48db | plates by category + Wobble lead + Focus |
| (patch, no separate md) | 97ca9c2 | layout.tsx explicit utf-8 rewrite |
| docs/ui-changelog/v2-c.md | 5a40b7d / eba465a | plate TOC + lead red bar + title/summary spacing |
| docs/ui-changelog/v2-d.md | dedf15d | notice breathing + title red->underline, focus-visible |
| docs/ui-changelog/v2-e.md | 9084eeb | ink shadow (no red) + Focus/Wobble breathing + type relaxation |
| docs/ui-changelog/v2-f.md | ddd80c8 | plate breathing + stagger entrance + smooth anchors |
| docs/ui-changelog/v2-g.md | c26b13e | notice auto-dismiss + loading empty + toolbar breathing |
| docs/ui-changelog/v2-h.md | 8195008 | headline/section/empty breathing |
| docs/ui-changelog/v2-i.md | 5d7da27 | drawer/poster entrance + ESC + scroll lock |
| docs/ui-changelog/v2-j.md | 6f632ac | stamp + story-top paper style |
| docs/ui-changelog/v2-k.md | 3f83bd2 | plate head capsule + empty level |
| docs/ui-changelog/v2-l.md | 40c44a5 | tabs capsule + section spacing |
| docs/ui-changelog/v2-m.md | df5f424 | masthead meta + share rail capsule |
| docs/ui-changelog/v2-n.md | 0969c3f | card adaptive static + clamp/wrap |
| docs/ui-changelog/v2-o.md | b7d944b | card padding gap from border + lead adaptive |
| docs/ui-changelog/v2-p.md | 43f632c | mobile share bar equal fit |
| docs/ui-changelog/v2-q.md | afa9337 | small-screen plate rhythm (720px) |

## How to start next version

```bash
git status  # should be working tree clean
# next change: edit code -> update that version's md -> git commit -> tag after man verify
# e.g. git diff v2-q..HEAD to preview next batch
```

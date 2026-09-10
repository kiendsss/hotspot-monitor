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
| v2-c | bd20a45 -> eba465a | V2-c rhythm polish: plate TOC + lead red bar + spacing | PASS 2026-09-09 | git checkout v2-c |
| v2-d (pending tag) | 564a3b6 | V2-d notice breathing + red convergence | build ok, pending man | git diff v2-c..HEAD / checkout 564a3b6 |

## Changelog files

| MD file | Commit | Content |
|---------|--------|---------|
| docs/ui-changelog/v1-b.md | dd9f269 | paper breathing + dual-line buttons + LIVE pulse + share/poster |
| docs/ui-changelog/v2.md | 41b48db | plates by category + Wobble lead + Focus |
| (patch, no separate md) | 97ca9c2 | layout.tsx explicit utf-8 rewrite |
| docs/ui-changelog/v2-c.md | 5a40b7d / eba465a | plate TOC + lead red bar + title/summary spacing |
| docs/ui-changelog/v2-d.md | 564a3b6 | notice breathing + title red->underline, focus-visible |

## How to start next version

```bash
git status  # should be working tree clean
# next change: edit code -> update that version's md -> git commit -> tag after man verify
# e.g. git diff v2-c..HEAD to preview next batch
```

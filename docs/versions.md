# 热点观察哨 — 版本与回滚记录（按“先提交已确认版→再改→再记 md”规程）

## 规程（用户确认，长期有效）

1. **每次修改前必先 `git commit` 已确认版本**（当前 `HEAD` 可用），打 `tag v{n}` 标记可回滚锚点。
2. **改动后必记 `docs/ui-changelog/v{n}*.md`**，标题与提交信息同版本号。
3. 回滚锚点固定为 `tag`，命令：
   ```bash
   git log --oneline --graph --all -12
   git checkout v2        # 查看 v2 当时状态
   git reset --hard v2    # 丢弃后续改动，回滚到 v2
   git diff v2..HEAD      # 查看自 v2 以来所有变更
   ```

## 锚点

| Tag | Commit | 含义 | 验证 | 可用命令 |
|-----|--------|------|------|----------|
| `v1-b` 未打 tag（可补） | `dd9f269` | V1-B 脉动前线：Bento 通透 + 按钮可懂化 + 一键分享 | 外勤 3 步 | `git checkout dd9f269` |
| `v2` | `97ca9c2`（含 `41b48db`） | V2 报纸分区大板块 + Wobble 头条 + Focus 聚读（方案 B）+ 乱码修复补丁 | 人工验证通过 ✅ | `git checkout v2` / `git reset --hard v2` |
| 下一版前置 | 从 `v2` 切分支/新提交，禁止未提交即改 | 下一版为 V2-c 节奏精修或你指定的新方向 | 待人验 | `git diff v2..HEAD` |

## 变更档

| 版本 MD | 对应提交 | 内容 |
|---------|----------|------|
| `docs/ui-changelog/v1-b.md` | `dd9f269` | 纸墨通透版式 + 按钮双行化 + LIVE 脉冲 + 悬浮分享/海报 |
| `docs/ui-changelog/v2.md` | `41b48db` | 报纸分区（按 category）+ Wobble 放大头条 + Focus 聚焦 |
| （乱码补丁随 `v2` tag 合并，无独立 md） | `97ca9c2` | `layout.tsx` 显式 utf-8 重写，`node` 字节级验证通过 |

## 如何启动下一版（下一条用户指令时执行）

```bash
# 1. 确认当前已确认版已提交（本档已满足）
git status  # 应为 working tree clean
# 2. 开新版前先新建 md 占位并提交一个空锚点（可选，若跨较大改动建议）
# 3. 改代码 → 该版 md 增量记录 → git commit → git tag v3（人验后再打）
```

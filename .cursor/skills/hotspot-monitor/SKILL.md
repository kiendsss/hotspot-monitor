---
name: hotspot-monitor
description: 热点监控与热点简报生成。当用户想了解当前热点、热搜、全网趋势，或要求生成热点简报/日报时使用。通过本地热点观察哨服务采集多来源热榜并 AI 识别热点。
---

# 热点观察哨（Hotspot Monitor）

通过本地运行的《热点观察哨》服务，采集微博/知乎/百度/GitHub/RSS 多来源内容，AI（或 Mock）识别热点并生成带趋势对比的简报。

## 使用时机

- 用户问「现在有什么热点」「热搜有什么」「帮我看看今天趋势」
- 用户要求生成热点简报、日报、舆情概览
- 用户提交了一段内容，想知道算不算热点、热度如何

## 工作流程

### 1. 健康检查

先确认本地服务是否在运行：

```bash
curl -s http://localhost:3000/api/health
```

Windows PowerShell 环境用：

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/health"
```

- 返回 `"ok": true` → 服务正常，进入第 2 步
- 连接失败 → 在项目根目录后台启动服务，等待就绪后继续：

```bash
npm run dev
```

### 2. 执行热点扫描

优先用扫描脚本（自动完成 采集 → 分析 → 输出 Markdown 简报）：

```bash
node scripts/hotspot-scan.mjs --top 10
```

参数：
- `--top N`：简报收录前 N 个热点（默认 10）
- `--no-collect`：跳过采集，直接对现有存稿付印（更快，适合刚采集过）
- `--base URL`：服务地址（默认 http://localhost:3000）

脚本 stderr 输出进度，stdout 输出 Markdown 简报。若失败提示服务未启动，回到第 1 步。

### 3. 向用户汇报

把脚本输出的 Markdown 简报直接呈现给用户，并补充一句模式说明：
- `Mock 规则简报`：说明「当前未配置 OpenRouter Key，分类/实体/情感字段为空属正常；可在 http://localhost:3000/settings 填入 Key 并关闭 Mock 开关以启用 AI 分析」
- `AI 分析`：正常呈现即可

## 注意事项

- 本技能依赖项目根目录的服务（Next.js，端口 3000），数据存储在 `data/db.json`
- 简报中的「趋势」是相邻两期对比；首次运行全部为「新上榜/持平」属正常
- 用户想手动投稿内容时，引导到 http://localhost:3000/sources ，或直接 POST `/api/items/manual`（JSON body：`{"title":"...","text":"..."}`）

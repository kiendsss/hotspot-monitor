#!/usr/bin/env node
/**
 * 热点扫描 CLI：调本地服务完成 采集 → 分析 → 输出 Markdown 热点简报。
 * 用法：node scripts/hotspot-scan.mjs [--no-collect] [--top 10] [--base http://localhost:3000]
 * 前置：dev server 已运行（npm run dev）；未运行时本脚本会给出提示。
 */

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index !== -1 && args[index + 1] ? args[index + 1] : fallback;
};
const hasFlag = (name) => args.includes(`--${name}`);

const BASE = getArg('base', process.env.HOTSPOT_BASE ?? 'http://localhost:3000');
const TOP = Math.max(1, Number(getArg('top', '10')) || 10);
const DO_COLLECT = !hasFlag('no-collect');

async function api(path, method = 'GET') {
  const res = await fetch(`${BASE}${path}`, { method });
  const data = await res.json();
  if (!data.ok) throw new Error(`${path} -> ${data.error ?? res.statusText}`);
  return data;
}

async function main() {
  // 1. 健康检查
  let health;
  try {
    health = await api('/api/health');
  } catch {
    console.error(`[hotspot-scan] 本地服务未启动：请先运行 "npm run dev"（默认 ${BASE}）`);
    process.exit(1);
  }

  console.error(
    `[hotspot-scan] 服务正常：池内 ${health.items} 条 · 第 ${health.lastIssue ?? 0} 期 · ` +
      `${health.mockMode ? 'Mock 模式' : `AI 模式(${health.model})`}`,
  );

  // 2. 采集（可选）
  if (DO_COLLECT) {
    console.error('[hotspot-scan] 走访采集中…');
    const collected = await api('/api/collect', 'POST');
    const failed = collected.sources.filter((s) => !s.ok);
    console.error(
      `[hotspot-scan] 新增 ${collected.added} 条` +
        (failed.length ? `；失败源：${failed.map((f) => `${f.name}(${f.error})`).join('、')}` : '，全部源成功'),
    );
  }

  // 3. 分析付印
  console.error('[hotspot-scan] 分析付印中…');
  const analyzed = await api('/api/analyze', 'POST');
  const snapshotId = (await api('/api/snapshots?limit=1')).snapshots[0].id;
  const detail = await api(`/api/snapshots?id=${snapshotId}`);
  const snapshot = detail.snapshot;

  // 4. 输出 Markdown 简报
  const date = new Date(snapshot.createdAt).toLocaleString('zh-CN');
  const lines = [];
  lines.push(`# 《热点观察哨》第 ${snapshot.issue} 期热点简报`);
  lines.push('');
  lines.push(`- 时间：${date}`);
  lines.push(`- 方式：${snapshot.mock ? 'Mock 规则简报（未配置 OpenRouter Key）' : `AI 分析（${snapshot.model}）`}`);
  lines.push(`- 热点数：${snapshot.hotspots.length}`);
  lines.push('');
  for (const h of snapshot.hotspots.slice(0, TOP)) {
    const trend = h.trend === 'new' ? '新上榜' : h.trend === 'up' ? `↑ +${h.delta}` : h.trend === 'down' ? `↓ ${h.delta}` : '持平';
    lines.push(`## No.${h.rank} ${h.title}`);
    lines.push(`- 热度：${h.heat}/100 ｜ 分类：${h.category} ｜ 趋势：${trend} ｜ 情感：${h.sentiment}`);
    if (h.summary) lines.push(`- 摘要：${h.summary}`);
    if (h.entities.length) lines.push(`- 实体：${h.entities.join('、')}`);
    lines.push('');
  }

  console.log(lines.join('\n'));
}

main().catch((error) => {
  console.error(`[hotspot-scan] 失败：${error.message}`);
  process.exit(1);
});

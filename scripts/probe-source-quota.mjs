/**
 * 分源保底配额探针：直接读 data/db.json，按 lib/pipeline.ts 的 bucketize 口径
 * 复算候选桶的来源分布，用于确认「单源吃满 Top30」是否已修复。
 * 用法：node scripts/probe-source-quota.mjs
 */
import { readFile } from 'node:fs/promises';

const db = JSON.parse(await readFile(new URL('../data/db.json', import.meta.url), 'utf8'));
const PER_SOURCE_FLOOR = 5;
const MAX_CANDIDATES = 30;

const bucketKey = (t) => t.replace(/[\s\p{P}]+/gu, '').slice(0, 12);

const map = new Map();
for (const item of db.items) {
  const key = bucketKey(item.title);
  if (!key) continue;
  const b = map.get(key);
  if (b) b.push(item);
  else map.set(key, [item]);
}
const all = [...map.entries()].map(([key, items]) => {
  const primary = items.reduce((a, b) => ((b.heat ?? 0) > (a.heat ?? 0) ? b : a));
  const distinct = new Set(items.map((i) => i.sourceId)).size;
  const maxHeat = Math.max(...items.map((i) => i.heat ?? 0));
  const heatScore = maxHeat > 0 ? maxHeat : distinct >= 2 ? distinct * 1000 : 0;
  return {
    key,
    title: primary.title,
    sourceId: distinct >= 2 ? 'cross' : primary.sourceId,
    heatScore,
    n: items.length,
    pub: items.filter((i) => i.publishedAt).length,
    inter: items.filter((i) => i.interactions).length,
  };
}).sort((a, b) => b.heatScore - a.heatScore);

const picked = [];
const taken = new Set();
const groups = new Map();
for (const b of all) {
  if (b.heatScore <= 0) continue;
  const l = groups.get(b.sourceId);
  if (l) l.push(b);
  else groups.set(b.sourceId, [b]);
}
for (const l of groups.values()) {
  for (const b of l.slice(0, PER_SOURCE_FLOOR)) {
    if (picked.length >= MAX_CANDIDATES) break;
    taken.add(b.key);
    picked.push(b);
  }
}
for (const b of all) {
  if (picked.length >= MAX_CANDIDATES) break;
  if (taken.has(b.key)) continue;
  taken.add(b.key);
  picked.push(b);
}
picked.sort((a, b) => b.heatScore - a.heatScore);

const tally = new Map();
for (const b of picked) tally.set(b.sourceId, (tally.get(b.sourceId) ?? 0) + 1);
console.log(`buckets=${all.length} candidates=${picked.length}`);
console.log('candidate spread:', [...tally.entries()].map(([k, v]) => `${k}=${v}`).join(' '));
console.log(`withPublished=${picked.filter((b) => b.pub).length} withInteractions=${picked.filter((b) => b.inter).length}`);
for (const b of picked) console.log(`  ${String(b.sourceId).padEnd(7)} score=${String(b.heatScore).padEnd(10)} n=${b.n} pub=${b.pub} inter=${b.inter} ${b.title.slice(0, 28)}`);

import type { EngineHit, QualitySettings, Verification } from '../types';

const NEWS_ENGINES = new Set(['百度新闻']);
/** 主流引擎满命中时的结果数量级：100 万 ≈ 6，用于把命中量压到 0-40 分 */
const VOLUME_CEILING = 6;

function isHit(hit: EngineHit): boolean {
  return hit.ok && (hit.counted > 0 || hit.total > 0);
}

/**
 * 佐证分（0-100）= 引擎覆盖度(45) + 结果量级(40) + 新闻源加成(15)。
 * 结果量取各引擎最大值而非求和，避免同一事件在多引擎重复计数。
 */
export function computeVerification(hits: EngineHit[], quality: QualitySettings): Verification {
  const okHits = hits.filter((h) => h.ok);
  const hitHits = okHits.filter(isHit);
  const maxHits = okHits.reduce((m, h) => Math.max(m, h.total), 0);
  const totalHits = okHits.reduce((s, h) => s + h.total, 0);
  const newsHits = okHits
    .filter((h) => NEWS_ENGINES.has(h.engine) && isHit(h))
    .reduce((m, h) => Math.max(m, h.total), 0);

  const engines = hitHits.length;
  const enginePart = (Math.min(engines, 3) / 3) * 45;
  const volumePart = Math.min(Math.log10(maxHits + 1) / VOLUME_CEILING, 1) * 40;
  const newsPart = newsHits > 0 ? 15 : 0;
  const score = Math.max(0, Math.min(100, Math.round(enginePart + volumePart + newsPart)));

  let passed: boolean;
  let reason: string | undefined;
  if (okHits.length === 0) {
    // 全引擎失败（断网/封禁）：标记未验证但不阻塞出刊，交由热度自然排序
    passed = true;
    reason = 'unverified';
  } else if (engines < quality.minEngines) {
    passed = false;
    reason = `命中引擎数 ${engines} < 门槛 ${quality.minEngines}`;
  } else if (maxHits < quality.minHits) {
    passed = false;
    reason = `最大结果数 ${maxHits} < 门槛 ${quality.minHits}`;
  } else {
    passed = true;
  }

  return { engines, maxHits, totalHits, newsHits, score, passed, reason, hits };
}

export function formatEvidenceLine(v: Verification): string {
  if (v.reason === 'unverified') return '佐证:引擎全部不可用';
  const engines = `${v.engines}引擎`;
  const hits = v.maxHits >= 10_000 ? `${(v.maxHits / 10_000).toFixed(1)}万` : String(v.maxHits);
  return `佐证:${engines}/最多${hits}条${v.newsHits > 0 ? '/含新闻源' : ''}`;
}

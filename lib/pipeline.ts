import type { QualitySettings, RawItem, Settings, Verification } from './types';
import { bucketKey } from './bucket';
import { verifyTitles } from './verify/cache';

export interface CandidateBucket {
  key: string;
  title: string;
  items: RawItem[];
  distinctSources: number;
  /** 桶内是否有带平台热度的来源（榜单） */
  hasHeatSource: boolean;
  /** 排序用热度：榜单取桶内最高 heat，纯 RSS/手动桶按跨源数折算 */
  heatScore: number;
  verification?: Verification;
}

/** 预聚合分桶：桶内最高平台热度排序，取头部候选送搜索引擎核验 */
export function bucketize(items: RawItem[], maxCandidates = 30): CandidateBucket[] {
  const map = new Map<string, RawItem[]>();
  for (const item of items) {
    const key = bucketKey(item.title);
    if (!key) continue;
    const bucket = map.get(key);
    if (bucket) bucket.push(item);
    else map.set(key, [item]);
  }

  return [...map.entries()]
    .map(([key, bucketItems]): CandidateBucket => {
      const primary = bucketItems.reduce((a, b) => ((b.heat ?? 0) > (a.heat ?? 0) ? b : a));
      const distinctSources = new Set(bucketItems.map((i) => i.sourceId)).size;
      const maxHeat = Math.max(...bucketItems.map((i) => i.heat ?? 0));
      // 纯 RSS/手动桶无平台热度：单条来稿 0 分自然沉底，多源佐证才冒头
      const heatScore = maxHeat > 0 ? maxHeat : (distinctSources >= 2 ? distinctSources * 1_000 : 0);
      return { key, title: primary.title, items: bucketItems, distinctSources, hasHeatSource: maxHeat > 0, heatScore };
    })
    .sort((a, b) => b.heatScore - a.heatScore)
    .slice(0, maxCandidates);
}

export interface PipelineResult {
  /** 通过验证的候选对应条目（送 AI/Mock 分析） */
  selected: RawItem[];
  /** itemId → 桶 key，AI 产出后按 itemIds 回贴佐证 */
  bucketKeyByItemId: Map<string, string>;
  /** itemId → 佐证摘要行，随 prompt 喂给模型 */
  evidenceByItemId: Map<string, string>;
  /** 桶 key → 验证结果 */
  verificationByKey: Map<string, Verification>;
  checked: number;
  passed: number;
  dropped: number;
  /** true = 本次未做验证（关闭开关或引擎全挂） */
  skipped: boolean;
}

/** 质量配置兜底：settings 文件早于该功能生成时可能缺字段 */
export function resolveQuality(settings: Settings): QualitySettings {
  return {
    verifyEnabled: settings.quality?.verifyEnabled ?? true,
    minEngines: settings.quality?.minEngines ?? 1,
    minHits: settings.quality?.minHits ?? 5,
    requireCrossSource: settings.quality?.requireCrossSource ?? true,
    cacheTtlMs: settings.quality?.cacheTtlMs ?? 6 * 60 * 60 * 1000,
  };
}

function evidenceLine(bucket: CandidateBucket): string {
  const score = bucket.verification?.score ?? 0;
  return `[佐证:${bucket.distinctSources}源/引擎${bucket.verification?.engines ?? 0}个/分${score}]`;
}

/**
 * 编排：条目池 → 预聚合 Top30 候选 → 搜索引擎交叉验证 → 门槛淘汰 → 通过者入 AI 分析。
 * 双重把关：榜单尾部已在采集层裁掉，这里再挡掉「平台有榜但全网无人讨论」的伪热点。
 */
export async function selectCandidates(items: RawItem[], settings: Settings): Promise<PipelineResult> {
  const quality = resolveQuality(settings);
  const buckets = bucketize(items);
  const bucketKeyByItemId = new Map<string, string>();
  for (const bucket of buckets) {
    for (const item of bucket.items) bucketKeyByItemId.set(item.id, bucket.key);
  }

  const finish = (list: CandidateBucket[], skipped: boolean): PipelineResult => {
    const evidenceByItemId = new Map<string, string>();
    const verificationByKey = new Map<string, Verification>();
    for (const bucket of list) {
      if (!bucket.verification) continue;
      verificationByKey.set(bucket.key, bucket.verification);
      const line = evidenceLine(bucket);
      for (const item of bucket.items) evidenceByItemId.set(item.id, line);
    }
    return {
      selected: list.flatMap((b) => b.items),
      bucketKeyByItemId,
      evidenceByItemId,
      verificationByKey,
      checked: buckets.length,
      passed: list.length,
      dropped: buckets.length - list.length,
      skipped,
    };
  };

  if (buckets.length === 0) {
    return {
      selected: [],
      bucketKeyByItemId,
      evidenceByItemId: new Map(),
      verificationByKey: new Map(),
      checked: 0,
      passed: 0,
      dropped: 0,
      skipped: !quality.verifyEnabled,
    };
  }

  if (!quality.verifyEnabled) {
    return finish(buckets, true);
  }

  const verifications = await verifyTitles(
    buckets.map((b) => b.title),
    { cacheTtlMs: quality.cacheTtlMs, minEngines: quality.minEngines, minHits: quality.minHits },
  );
  buckets.forEach((bucket) => {
    bucket.verification = verifications.get(bucket.title);
  });

  // requireCrossSource：纯 RSS/手动桶（无任何榜单来源）必须≥2 个来源，挡「随便发一条」
  const survivors = buckets.filter((bucket) => {
    const v = bucket.verification;
    if (!v || !v.passed) return false;
    if (quality.requireCrossSource && !bucket.hasHeatSource && bucket.distinctSources < 2) return false;
    return true;
  });

  if (survivors.length === 0) {
    // 验证全灭（引擎被封/断网）时不空出刊：回落预聚合头部并标记 skipped
    return finish(buckets.slice(0, 10), true);
  }

  return finish(survivors, false);
}

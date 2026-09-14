import type { RawItem, Settings, SourceId } from '../types';

const BUILTIN_IDS = ['weibo', 'zhihu', 'baidu', 'github'] as const;

const DEFAULT_LIMITS: Record<(typeof BUILTIN_IDS)[number], { topN: number; minHeat: number }> = {
  weibo: { topN: 30, minHeat: 100_000 },
  zhihu: { topN: 30, minHeat: 500_000 },
  baidu: { topN: 30, minHeat: 0 },
  github: { topN: 25, minHeat: 20 },
};

export interface TailFilterResult {
  kept: RawItem[];
  /** 各源被裁掉的条数 */
  dropped: Partial<Record<SourceId, number>>;
}

/** 取某源生效阈值：设置里没配的源回落到内置默认值 */
function limitFor(sourceId: SourceId, settings: Settings) {
  const configured = sourceId in DEFAULT_LIMITS ? settings.sourceLimits?.[sourceId as (typeof BUILTIN_IDS)[number]] : undefined;
  const fallback = sourceId in DEFAULT_LIMITS ? DEFAULT_LIMITS[sourceId as (typeof BUILTIN_IDS)[number]] : null;
  if (!fallback) return null;
  return {
    topN: configured?.topN ?? fallback.topN,
    minHeat: configured?.minHeat ?? fallback.minHeat,
  };
}

/**
 * 尾部过滤：榜单源按 rank 截断 TopN，再按平台原始热度 minHeat 淘汰"随便发一条就被抓进来"的低质尾部词条。
 * rss / manual 不设阈值——长尾内容是否成立交给搜索引擎佐证层判定。
 * rank 缺失（接口改版）时按数组顺序补位，宁可裁错也不放低质条目进池。
 */
export function applyTailFilter(items: RawItem[], settings: Settings): TailFilterResult {
  const kept: RawItem[] = [];
  const dropped: TailFilterResult['dropped'] = {};
  const seqBySource = new Map<SourceId, number>();

  for (const item of items) {
    const limit = limitFor(item.sourceId, settings);
    if (!limit) {
      kept.push(item);
      continue;
    }

    const seq = (seqBySource.get(item.sourceId) ?? 0) + 1;
    seqBySource.set(item.sourceId, seq);

    const rank = item.rank ?? seq;
    const passes = rank <= limit.topN && (limit.minHeat <= 0 || (item.heat ?? 0) >= limit.minHeat);
    if (passes) {
      kept.push(item);
    } else {
      dropped[item.sourceId] = (dropped[item.sourceId] ?? 0) + 1;
    }
  }

  return { kept, dropped };
}

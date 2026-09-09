import type { Hotspot, Snapshot } from './types';

/** 标题归一化：去空白/标点，用于跨期配对 */
function normalizeTitle(title: string): string {
  return title.replace(/[\s\p{P}\p{S}]+/gu, '').toLowerCase();
}

/** 跨期趋势对比：与上一期按归一化标题配对（含包含关系），计算 trend 与 delta */
export function attachTrends(
  current: Omit<Hotspot, 'id' | 'rank' | 'trend' | 'delta'>[],
  previous: Snapshot | undefined,
): Hotspot[] {
  const prevMap = new Map<string, Hotspot>();
  for (const h of previous?.hotspots ?? []) {
    prevMap.set(normalizeTitle(h.title), h);
  }

  const findPrev = (title: string): Hotspot | undefined => {
    const key = normalizeTitle(title);
    if (prevMap.has(key)) return prevMap.get(key);
    for (const [prevKey, prev] of prevMap) {
      if (prevKey.includes(key) || key.includes(prevKey)) return prev;
    }
    return undefined;
  };

  return current.map((hotspot, index) => {
    const prev = findPrev(hotspot.title);
    if (!prev) {
      return { ...hotspot, id: `hs_${Date.now().toString(36)}_${index}`, rank: index + 1, trend: 'new' as const };
    }
    const delta = hotspot.heat - prev.heat;
    const trend = delta > 3 ? ('up' as const) : delta < -3 ? ('down' as const) : ('flat' as const);
    return { ...hotspot, id: `hs_${Date.now().toString(36)}_${index}`, rank: index + 1, trend, delta };
  });
}

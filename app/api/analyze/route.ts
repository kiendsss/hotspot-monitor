import { NextResponse } from 'next/server';
import { getDb, getSettings, latestSnapshot, makeId, saveDb } from '@/lib/store';
import { analyzeHotspots } from '@/lib/ai';
import { attachTrends } from '@/lib/trend';
import { selectCandidates } from '@/lib/pipeline';
import { bucketKey } from '@/lib/bucket';
import type { Hotspot, HotspotMeta, ItemInteractions, RawItem, Snapshot } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** 热点最终热度 = 模型/AI 热度与搜索佐证分加权融合 */
function blendHeat(modelHeat: number, verifyScore: number | undefined): number {
  if (verifyScore === undefined) return modelHeat;
  return Math.max(0, Math.min(100, Math.round(modelHeat * 0.7 + verifyScore * 0.3)));
}

/** 从成员条目聚合发布时间/抓取时间/来源分布/互动总量，供头版卡片免跳转展示 */
function buildHotspotMeta(items: RawItem[]): HotspotMeta | undefined {
  if (items.length === 0) return undefined;
  const published = items.map((i) => i.publishedAt).filter((t): t is number => typeof t === 'number');
  const fetched = items.map((i) => i.fetchedAt).filter((t): t is number => typeof t === 'number');
  const bySource = new Map<string, number>();
  for (const item of items) bySource.set(item.sourceName, (bySource.get(item.sourceName) ?? 0) + 1);
  const sum = (key: keyof ItemInteractions) =>
    items.reduce((acc, i) => acc + (typeof i.interactions?.[key] === 'number' ? (i.interactions![key] as number) : 0), 0);
  const likes = sum('likes');
  const replies = sum('replies');
  const reposts = sum('reposts');
  const raw = items.find((i) => i.interactions?.raw)?.interactions?.raw;
  const anyInteraction = items.some((i) => i.interactions);
  return {
    publishedAt: published.length ? Math.min(...published) : undefined,
    firstFetchedAt: fetched.length ? Math.min(...fetched) : undefined,
    lastFetchedAt: fetched.length ? Math.max(...fetched) : undefined,
    sources: [...bySource.entries()].map(([name, count]) => ({ name, count })),
    interactions: anyInteraction
      ? {
          ...(likes ? { likes } : {}),
          ...(replies ? { replies } : {}),
          ...(reposts ? { reposts } : {}),
          ...(raw && !likes && !replies && !reposts ? { raw } : {}),
        }
      : undefined,
  };
}

/** POST /api/analyze：条目池 → 预聚合+搜索验证 → AI/Mock → 融合重排 → 新一期快照（含趋势对比） */
export async function POST() {
  try {
    const [db, settings] = await Promise.all([getDb(), getSettings()]);
    if (db.items.length === 0) {
      return NextResponse.json(
        { ok: false, error: '条目池为空，请先采集（POST /api/collect）或投稿' },
        { status: 400 },
      );
    }

    // 阶段一：预聚合 + 搜索引擎交叉验证，仅通过门槛的候选送分析（省 token、挡尾部噪声）
    const pipeline = await selectCandidates(db.items, settings);
    const apiKey = settings.openrouterKey && !settings.mockMode ? settings.openrouterKey : undefined;

    // 候选桶索引：AI 复述 id 失真时按桶补全/兜底，也供 meta 聚合
    const itemsByKey = new Map<string, RawItem[]>();
    for (const item of pipeline.selected) {
      const key = pipeline.bucketKeyByItemId.get(item.id);
      if (!key) continue;
      const list = itemsByKey.get(key);
      if (list) list.push(item);
      else itemsByKey.set(key, [item]);
    }
    const bucketsForFallback = [...itemsByKey.entries()].map(([key, list]) => ({
      key,
      title: list[0].title,
      itemIds: list.map((i) => i.id),
    }));

    // 阶段二：AI/Mock 聚合识别
    const output = await analyzeHotspots({
      items: pipeline.selected,
      model: settings.model,
      apiKey,
      interestKeywords: settings.interestKeywords?.filter((kw) => kw.trim()) ?? [],
      bucketsForFallback,
    });

    // 阶段三：把验证证据回贴到热点并按佐证分融合热度；同桶成员聚合出 meta 供头版展示
    const enriched: Omit<Hotspot, 'id' | 'rank' | 'trend' | 'delta'>[] = output.hotspots.map((h) => {
      const candidateIds = h.itemIds.filter((id) => pipeline.bucketKeyByItemId.has(id));
      const key = candidateIds.length
        ? pipeline.bucketKeyByItemId.get(candidateIds[0]) ?? bucketKey(h.title)
        : bucketKey(h.title);
      const verification = pipeline.verificationByKey.get(key);
      return {
        ...h,
        // 模型给出的 itemIds 不在候选池（AI 幻觉/旧条目裁剪）时用候选池内 id 回填，抽屉才能查到来源
        itemIds: candidateIds.length ? candidateIds : (itemsByKey.get(key) ?? []).map((i) => i.id),
        heat: blendHeat(h.heat, verification?.score),
        verification,
        meta: buildHotspotMeta(itemsByKey.get(key) ?? []),
      };
    });

    const prev = latestSnapshot(db);
    const hotspots = attachTrends(enriched, prev);
    const verificationSummary = {
      checked: pipeline.checked,
      passed: pipeline.passed,
      dropped: pipeline.dropped,
      skipped: pipeline.skipped,
    };
    const snapshot: Snapshot = {
      id: makeId('snap'),
      issue: (prev?.issue ?? 0) + 1,
      createdAt: Date.now(),
      model: output.model,
      mock: output.mock,
      sources: prev?.sources ?? [],
      hotspots,
      verificationSummary,
    };

    await saveDb({ ...db, snapshots: [...db.snapshots, snapshot] });
    return NextResponse.json({
      ok: true,
      issue: snapshot.issue,
      mock: snapshot.mock,
      hotspots: hotspots.length,
      verification: verificationSummary,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

import { NextResponse } from 'next/server';
import { getDb, getSettings, latestSnapshot, makeId, saveDb } from '@/lib/store';
import { analyzeHotspots } from '@/lib/ai';
import { attachTrends } from '@/lib/trend';
import { selectCandidates } from '@/lib/pipeline';
import { bucketKey } from '@/lib/bucket';
import type { Hotspot, Snapshot } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** 热点最终热度 = 模型/AI 热度与搜索佐证分加权融合 */
function blendHeat(modelHeat: number, verifyScore: number | undefined): number {
  if (verifyScore === undefined) return modelHeat;
  return Math.max(0, Math.min(100, Math.round(modelHeat * 0.7 + verifyScore * 0.3)));
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

    // 阶段二：AI/Mock 聚合识别
    const output = await analyzeHotspots({
      items: pipeline.selected,
      model: settings.model,
      apiKey,
    });

    // 阶段三：把验证证据回贴到热点并按佐证分融合热度
    const enriched: Omit<Hotspot, 'id' | 'rank' | 'trend' | 'delta'>[] = output.hotspots.map((h) => {
      const key = h.itemIds.length ? pipeline.bucketKeyByItemId.get(h.itemIds[0]) ?? bucketKey(h.title) : bucketKey(h.title);
      const verification = pipeline.verificationByKey.get(key);
      const itemIds = h.itemIds.filter((id) => pipeline.bucketKeyByItemId.has(id));
      return {
        ...h,
        // 模型给出的 itemIds 不在候选池（AI 幻觉）时按桶 key 回退匹配
        itemIds: itemIds.length ? itemIds : h.itemIds,
        heat: blendHeat(h.heat, verification?.score),
        verification,
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

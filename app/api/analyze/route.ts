import { NextResponse } from 'next/server';
import { getDb, getSettings, latestSnapshot, makeId, saveDb } from '@/lib/store';
import { analyzeHotspots } from '@/lib/ai';
import { attachTrends } from '@/lib/trend';
import type { Snapshot } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** POST /api/analyze：条目池 → AI/Mock → 新一期快照（含上期趋势对比） */
export async function POST() {
  try {
    const [db, settings] = await Promise.all([getDb(), getSettings()]);
    if (db.items.length === 0) {
      return NextResponse.json(
        { ok: false, error: '条目池为空，请先采集（POST /api/collect）或投稿' },
        { status: 400 },
      );
    }

    const output = await analyzeHotspots({
      items: db.items,
      model: settings.model,
      apiKey: settings.openrouterKey && !settings.mockMode ? settings.openrouterKey : undefined,
    });

    const prev = latestSnapshot(db);
    const hotspots = attachTrends(output.hotspots, prev);
    const snapshot: Snapshot = {
      id: makeId('snap'),
      issue: (prev?.issue ?? 0) + 1,
      createdAt: Date.now(),
      model: output.model,
      mock: output.mock,
      sources: prev?.sources ?? [],
      hotspots,
    };

    await saveDb({ ...db, snapshots: [...db.snapshots, snapshot] });
    return NextResponse.json({ ok: true, issue: snapshot.issue, mock: snapshot.mock, hotspots: hotspots.length });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

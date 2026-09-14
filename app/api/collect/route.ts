import { NextResponse } from 'next/server';
import { getDb, getSettings, saveDb, upsertItems } from '@/lib/store';
import { collectAll } from '@/lib/collectors';

export const dynamic = 'force-dynamic';

/** POST /api/collect：全量采集（内置榜单 + 启用的 RSS），逐源失败隔离；榜单尾部低质条目在采集层直接过滤 */
export async function POST() {
  try {
    const settings = await getSettings();
    const db = await getDb();
    const report = await collectAll(settings);
    const { items, added } = upsertItems(db.items, report.items);
    await saveDb({ ...db, items });
    const filteredOut = Object.values(report.filteredOut).reduce((sum, n) => sum + (n ?? 0), 0);

    return NextResponse.json({
      ok: true,
      added,
      filteredOut,
      totalItems: items.length,
      sources: report.sources,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

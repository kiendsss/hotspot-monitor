import { NextResponse } from 'next/server';
import { getDb } from '@/lib/store';

export const dynamic = 'force-dynamic';

/** GET /api/snapshots?limit=10：快照列表（不含热点详情）；GET /api/snapshots?id=xxx：单期详情 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 10) || 10, 50);
  const db = await getDb();

  if (id) {
    const snapshot = db.snapshots.find((s) => s.id === id);
    if (!snapshot) {
      return NextResponse.json({ ok: false, error: '快照不存在' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, snapshot });
  }

  const snapshots = db.snapshots.slice(-limit).reverse().map((s) => ({
    id: s.id,
    issue: s.issue,
    createdAt: s.createdAt,
    model: s.model,
    mock: s.mock,
    hotspotCount: s.hotspots.length,
  }));
  return NextResponse.json({ ok: true, snapshots });
}

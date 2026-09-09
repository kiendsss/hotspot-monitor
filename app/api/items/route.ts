import { NextResponse } from 'next/server';
import { getDb } from '@/lib/store';

export const dynamic = 'force-dynamic';

/** GET /api/items?limit=100：原始条目池（调试与前端 ticker 用）；?ids=a,b,c：按 id 精确查询（剪报抽屉用） */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const idsParam = url.searchParams.get('ids');
  const db = await getDb();

  if (idsParam) {
    const ids = new Set(idsParam.split(',').filter(Boolean).slice(0, 100));
    const items = db.items.filter((i) => ids.has(i.id));
    return NextResponse.json({ ok: true, total: items.length, items });
  }

  const limit = Math.min(Number(url.searchParams.get('limit') ?? 100) || 100, 500);
  const items = db.items.slice(-limit).reverse();
  return NextResponse.json({ ok: true, total: db.items.length, items });
}

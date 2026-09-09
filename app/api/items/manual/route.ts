import { NextResponse, type NextRequest } from 'next/server';
import { getDb, makeId, saveDb, upsertItems } from '@/lib/store';
import type { RawItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface ManualBody {
  title?: string;
  text?: string;
  sourceName?: string;
}

/** POST /api/items/manual：手动粘贴内容入库 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ManualBody;
    const text = (body.text ?? '').trim();
    if (!text) {
      return NextResponse.json({ ok: false, error: '内容不能为空' }, { status: 400 });
    }
    const title = (body.title ?? '').trim() || `${text.slice(0, 30)}${text.length > 30 ? '…' : ''}`;
    const now = Date.now();
    const item: RawItem = {
      id: makeId('manual'),
      sourceId: 'manual',
      sourceName: body.sourceName?.trim() || '手动投稿',
      title,
      text: text.slice(0, 5000),
      fetchedAt: now,
    };
    const db = await getDb();
    const { items, added } = upsertItems(db.items, [item]);
    await saveDb({ ...db, items });
    return NextResponse.json({ ok: true, added, item });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

import { NextResponse, type NextRequest } from 'next/server';
import { getDb, saveDb } from '@/lib/store';
import { grabTopic } from '@/lib/topics/service';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** POST /api/topics/[id]/collect：按关键词抓取并增量保存专题素材。 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = await getDb();
    const topics = db.topics ?? [];
    const topic = topics.find((item) => item.id === id);
    if (!topic) return NextResponse.json({ ok: false, error: '专题不存在' }, { status: 404 });

    const result = await grabTopic(topic);
    await saveDb({
      ...db,
      topics: topics.map((item) => (item.id === id ? { ...result.topic, lastError: undefined } : item)),
    });
    return NextResponse.json({
      ok: true,
      added: result.added,
      duplicates: result.duplicates,
      totalItems: result.topic.items.length,
      sources: result.report.sources,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

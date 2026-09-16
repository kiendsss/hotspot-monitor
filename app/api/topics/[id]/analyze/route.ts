import { NextResponse, type NextRequest } from 'next/server';
import { getDb, getSettings, saveDb } from '@/lib/store';
import { analyzeTopic } from '@/lib/topics/service';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** POST /api/topics/[id]/analyze：用专题条目跑 AI/Mock 分析并保存独立报告。 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [db, settings] = await Promise.all([getDb(), getSettings()]);
    const topics = db.topics ?? [];
    const topic = topics.find((item) => item.id === id);
    if (!topic) return NextResponse.json({ ok: false, error: '专题不存在' }, { status: 404 });

    const analyzed = await analyzeTopic(topic, settings);
    await saveDb({
      ...db,
      topics: topics.map((item) => (item.id === id ? { ...analyzed.topic, lastError: undefined } : item)),
    });
    return NextResponse.json({
      ok: true,
      mock: analyzed.mock,
      model: analyzed.model,
      hotspots: analyzed.hotspots.length,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

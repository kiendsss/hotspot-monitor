import { NextResponse, type NextRequest } from 'next/server';
import { getDb, saveDb } from '@/lib/store';
import { normalizeInterval } from '@/lib/topics/service';
import type { DbData, KeywordTopic } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** GET /api/topics/[id]：专题详情（含 items 摘要行与最近报告） */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const topic = (db.topics ?? []).find((t) => t.id === id);
  if (!topic) {
    return NextResponse.json({ ok: false, error: '专题不存在' }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    topic: {
      ...topic,
      // 详情页条目列表只显示摘要行，正文字段裁到 200 字防大 payload
      items: topic.items.map((i) => ({
        ...i,
        text: i.text ? i.text.slice(0, 200) : undefined,
      })),
    },
  });
}

interface TopicPatchBody {
  action: 'update';
  autoTrack?: boolean;
  trackIntervalHours?: number;
}

/** PATCH /api/topics/[id]：更新自动追踪设置 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json()) as TopicPatchBody;
    const db = await getDb();
    const topics = db.topics ?? [];
    const topic = topics.find((t) => t.id === id);
    if (!topic) {
      return NextResponse.json({ ok: false, error: '专题不存在' }, { status: 404 });
    }
    const updated: KeywordTopic = {
      ...topic,
      autoTrack: typeof body.autoTrack === 'boolean' ? body.autoTrack : topic.autoTrack,
      trackIntervalHours:
        body.trackIntervalHours !== undefined ? normalizeInterval(body.trackIntervalHours) : topic.trackIntervalHours,
      // 开启自动追踪即视为从现在起算周期
      lastTrackedAt:
        typeof body.autoTrack === 'boolean' && body.autoTrack ? Date.now() : topic.lastTrackedAt,
    };
    await saveDb({ ...db, topics: topics.map((t) => (t.id === id ? updated : t)) } satisfies DbData);
    return NextResponse.json({ ok: true, topic: { ...updated, items: undefined } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

/** DELETE /api/topics/[id]：删除专题 */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = await getDb();
    const topics = db.topics ?? [];
    if (!topics.some((t) => t.id === id)) {
      return NextResponse.json({ ok: false, error: '专题不存在' }, { status: 404 });
    }
    await saveDb({ ...db, topics: topics.filter((t) => t.id !== id) } satisfies DbData);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

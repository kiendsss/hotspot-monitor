import { NextResponse, type NextRequest } from 'next/server';
import { getDb, saveDb } from '@/lib/store';
import { createKeyword, normalizeInterval, runTopicCycle, MAX_TOPICS } from '@/lib/topics/service';
import type { DbData, KeywordTopic } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 180;

/** GET /api/topics：专题列表（不含 items 正文，只回摘要字段） */
export async function GET() {
  const db = await getDb();
  const topics = (db.topics ?? []).map((t) => ({
    id: t.id,
    keyword: t.keyword,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    autoTrack: t.autoTrack,
    trackIntervalHours: t.trackIntervalHours,
    lastTrackedAt: t.lastTrackedAt,
    lastError: t.lastError,
    itemCount: t.items.length,
    hasReport: Boolean(t.report),
    reportAt: t.report?.createdAt,
    reportMock: t.report?.mock,
    hotspotCount: t.report?.hotspots.length ?? 0,
  }));
  return NextResponse.json({ ok: true, topics });
}

interface TopicsPostBody {
  keyword?: string;
  trackIntervalHours?: number;
}

/** POST /api/topics：创建专题（仅登记关键词，抓取在 /api/topics/[id]/collect） */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TopicsPostBody;
    const keyword = (body.keyword ?? '').trim();
    if (!keyword) {
      return NextResponse.json({ ok: false, error: '关键词不能为空' }, { status: 400 });
    }
    if (keyword.length > 60) {
      return NextResponse.json({ ok: false, error: '关键词最长 60 字' }, { status: 400 });
    }
    const db = await getDb();
    const topics = db.topics ?? [];
    if (topics.length >= MAX_TOPICS) {
      return NextResponse.json({ ok: false, error: `专题数量已达上限 ${MAX_TOPICS}，请先删除旧的` }, { status: 400 });
    }
    if (topics.some((t) => t.keyword === keyword)) {
      return NextResponse.json({ ok: false, error: '同名专题已存在' }, { status: 409 });
    }
    const topic = createKeyword(keyword, normalizeInterval(body.trackIntervalHours));
    const savedDb = { ...db, topics: [...topics, topic] } satisfies DbData;
    await saveDb(savedDb);

    // 立项即执行首次抓取与分析，进入详情页直接看到成果。
    const cycle = await runTopicCycle(topic.id);
    if ('error' in cycle) {
      return NextResponse.json({
        ok: true,
        topic,
        initialRun: { ok: false, error: cycle.error },
      });
    }
    const latest = await getDb();
    const ready = (latest.topics ?? []).find((item) => item.id === topic.id) ?? topic;
    return NextResponse.json({
      ok: true,
      topic: ready,
      initialRun: { ok: true, added: cycle.added, hotspots: cycle.hotspots, mock: cycle.mock },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export interface TopicSummary {
  id: string;
  keyword: string;
  createdAt: number;
  updatedAt: number;
  autoTrack: boolean;
  trackIntervalHours: KeywordTopic['trackIntervalHours'];
  lastTrackedAt?: number;
  lastError?: string;
  itemCount: number;
  hasReport: boolean;
  reportAt?: number;
  reportMock?: boolean;
  hotspotCount: number;
}

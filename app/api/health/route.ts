import { NextResponse } from 'next/server';
import { getDb, getSettings } from '@/lib/store';
import { resolveAiConfig } from '@/lib/env';

export const dynamic = 'force-dynamic';

/** GET /api/health：健康检查（Agent Skill 与前端状态灯用；线上是否真实 AI 看 effectiveMock） */
export async function GET() {
  const [db, settings] = await Promise.all([getDb(), getSettings()]);
  const lastSnapshot = db.snapshots[db.snapshots.length - 1];
  const ai = resolveAiConfig({
    settingsKey: settings.openrouterKey,
    storedModel: settings.model,
    mockMode: settings.mockMode,
  });
  return NextResponse.json({
    ok: true,
    service: 'hotspot-gazette',
    items: db.items.length,
    snapshots: db.snapshots.length,
    lastSnapshotAt: lastSnapshot?.createdAt ?? null,
    lastIssue: lastSnapshot?.issue ?? null,
    mockMode: ai.mock,
    effectiveMock: ai.mock,
    hasKey: Boolean(ai.apiKey),
    keySource: ai.keySource,
    model: ai.model,
    serverless: settings.serverless ?? false,
  });
}

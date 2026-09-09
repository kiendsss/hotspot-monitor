import { NextResponse } from 'next/server';
import { getDb, getSettings } from '@/lib/store';

export const dynamic = 'force-dynamic';

/** GET /api/health：健康检查（Agent Skill 与前端状态灯用） */
export async function GET() {
  const [db, settings] = await Promise.all([getDb(), getSettings()]);
  const lastSnapshot = db.snapshots[db.snapshots.length - 1];
  return NextResponse.json({
    ok: true,
    service: 'hotspot-gazette',
    items: db.items.length,
    snapshots: db.snapshots.length,
    lastSnapshotAt: lastSnapshot?.createdAt ?? null,
    lastIssue: lastSnapshot?.issue ?? null,
    mockMode: settings.mockMode,
    hasKey: Boolean(settings.openrouterKey),
    model: settings.model,
  });
}

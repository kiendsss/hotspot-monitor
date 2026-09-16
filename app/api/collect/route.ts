import { NextResponse } from 'next/server';
import { appendDbItems, getSettings } from '@/lib/store';
import { collectAll } from '@/lib/collectors';

export const dynamic = 'force-dynamic';
// Vercel Hobby 上限 60s：采集涉及多源抓取，给足时间；超时由平台截断，前端按单源 ok=false 展示
export const maxDuration = 60;

/** POST /api/collect：全量采集（内置榜单 + 启用的 RSS），逐源失败隔离；榜单尾部低质条目在采集层直接过滤 */
export async function POST() {
  try {
    const settings = await getSettings();
    const report = await collectAll(settings);
    // 增量入库：走存储抽象 append 语义（去重 + 裁剪），Serverless 下不整库重写
    const { db, added } = await appendDbItems(report.items);
    const filteredOut = Object.values(report.filteredOut).reduce((sum, n) => sum + (n ?? 0), 0);

    return NextResponse.json({
      ok: true,
      added,
      filteredOut,
      totalItems: db.items.length,
      sources: report.sources,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

import { NextResponse, type NextRequest } from 'next/server';
import { getSettings, makeId, saveSettings } from '@/lib/store';
import type { RssFeed } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** GET /api/rss：列出 RSS 订阅 */
export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({ ok: true, feeds: settings.rssFeeds });
}

interface RssBody {
  action: 'add' | 'remove' | 'toggle';
  name?: string;
  url?: string;
  id?: string;
  enabled?: boolean;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** POST /api/rss：新增 / 删除 / 启停订阅源 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RssBody;
    const settings = await getSettings();

    switch (body.action) {
      case 'add': {
        const url = (body.url ?? '').trim();
        const name = (body.name ?? '').trim() || url;
        if (!isValidHttpUrl(url)) {
          return NextResponse.json({ ok: false, error: 'RSS 地址必须是合法 http(s) URL' }, { status: 400 });
        }
        if (settings.rssFeeds.some((f) => f.url === url)) {
          return NextResponse.json({ ok: false, error: '该订阅已存在' }, { status: 409 });
        }
        const feed: RssFeed = {
          id: makeId('feed'),
          name,
          url,
          enabled: true,
          addedAt: Date.now(),
        };
        settings.rssFeeds = [...settings.rssFeeds, feed];
        break;
      }
      case 'remove': {
        settings.rssFeeds = settings.rssFeeds.filter((f) => f.id !== body.id);
        break;
      }
      case 'toggle': {
        settings.rssFeeds = settings.rssFeeds.map((f) =>
          f.id === body.id ? { ...f, enabled: body.enabled ?? !f.enabled } : f,
        );
        break;
      }
      default:
        return NextResponse.json({ ok: false, error: '未知操作' }, { status: 400 });
    }

    await saveSettings(settings);
    return NextResponse.json({ ok: true, feeds: settings.rssFeeds });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

import Parser from 'rss-parser';
import type { RawItem, RssFeed } from '../types';

const parser = new Parser({
  timeout: 10_000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  },
});

/** 解析单个 RSS 源。RSS 没有平台热度概念，heat 留空：是否算热点完全交给搜索引擎佐证层判定 */
export async function collectRssFeed(feed: RssFeed): Promise<{ items: RawItem[] }> {
  const parsed = await parser.parseURL(feed.url);
  const now = Date.now();
  const items: RawItem[] = (parsed.items ?? []).slice(0, 30).map((entry, index) => {
    const title = (entry.title ?? '').trim();
    const contentHtml = entry.contentSnippet ?? entry.content ?? '';
    return {
      id: `rss_${feed.id}_${now}_${index}_${title.slice(0, 20)}`,
      sourceId: 'rss' as const,
      sourceName: feed.name,
      title,
      text: contentHtml.slice(0, 300) || undefined,
      url: entry.link,
      rank: index + 1,
      extra: 'RSS',
      fetchedAt: now,
    };
  }).filter((i) => i.title);
  return { items };
}

/** 批量拉取所有启用的源，单源失败不影响其他源 */
export async function collectAllRss(feeds: RssFeed[]): Promise<{
  items: RawItem[];
  errors: { feedId: string; name: string; error: string }[];
}> {
  const enabled = feeds.filter((f) => f.enabled);
  const results = await Promise.allSettled(enabled.map((f) => collectRssFeed(f)));
  const items: RawItem[] = [];
  const errors: { feedId: string; name: string; error: string }[] = [];
  results.forEach((result, index) => {
    const feed = enabled[index];
    if (result.status === 'fulfilled') {
      items.push(...result.value.items);
    } else {
      errors.push({
        feedId: feed.id,
        name: feed.name,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
    }
  });
  return { items, errors };
}

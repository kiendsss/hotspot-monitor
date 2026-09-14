import type { RawItem, Settings, SourceId, SourceResult } from '../types';
import { collectWeibo } from './weibo';
import { collectZhihu } from './zhihu';
import { collectBaidu } from './baidu';
import { collectGithub } from './github';
import { collectAllRss } from './rss';
import { applyTailFilter } from './filter';

interface NamedCollector {
  id: 'weibo' | 'zhihu' | 'baidu' | 'github';
  name: string;
  run: () => Promise<{ items: RawItem[] }>;
  enabled: (settings: Settings) => boolean;
}

const BUILTIN_COLLECTORS: NamedCollector[] = [
  { id: 'weibo', name: '微博热搜', run: collectWeibo, enabled: (s) => s.builtinSources.weibo },
  { id: 'zhihu', name: '知乎热榜', run: collectZhihu, enabled: (s) => s.builtinSources.zhihu },
  { id: 'baidu', name: '百度热搜', run: collectBaidu, enabled: (s) => s.builtinSources.baidu },
  { id: 'github', name: 'GitHub Trending', run: collectGithub, enabled: (s) => s.builtinSources.github },
];

export interface CollectReport {
  items: RawItem[];
  sources: SourceResult[];
  /** 各源尾部过滤丢弃数 */
  filteredOut: Partial<Record<SourceId, number>>;
}

/** 全量采集：内置榜单 + RSS，逐源 Promise.allSettled 失败隔离 */
export async function collectAll(settings: Settings): Promise<CollectReport> {
  const startedAt = Date.now();
  const tasks: { id: SourceResult['id']; name: string; promise: Promise<{ items: RawItem[] }> }[] =
    BUILTIN_COLLECTORS.filter((c) => c.enabled(settings)).map((c) => ({
      id: c.id,
      name: c.name,
      promise: c.run(),
    }));

  if (settings.rssFeeds.some((f) => f.enabled)) {
    tasks.push({
      id: 'rss',
      name: 'RSS 订阅',
      promise: collectAllRss(settings.rssFeeds).then((r) => ({ items: r.items })),
    });
  }

  const results = await Promise.allSettled(tasks.map((t) => t.promise));
  const rawItems: RawItem[] = [];
  const sources: SourceResult[] = results.map((result, index) => {
    const task = tasks[index];
    const t0 = startedAt;
    if (result.status === 'fulfilled') {
      return {
        id: task.id,
        name: task.name,
        ok: true,
        count: result.value.items.length,
        costMs: Date.now() - t0,
      };
    }
    return {
      id: task.id,
      name: task.name,
      ok: false,
      count: 0,
      error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      costMs: Date.now() - t0,
    };
  });

  results.forEach((result) => {
    if (result.status === 'fulfilled') rawItems.push(...result.value.items);
  });

  // 尾部过滤：榜单只留头部 + 热度门槛，丢弃尾部低质词条
  const { kept: items, dropped } = applyTailFilter(rawItems, settings);
  sources.forEach((source) => {
    source.filteredOut = dropped[source.id] ?? 0;
    if (source.ok) source.count = items.filter((i) => i.sourceId === source.id).length;
  });

  return { items, sources, filteredOut: dropped };
}

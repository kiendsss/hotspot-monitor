import type { RawItem, SourceId } from '../types';
import { normalizeTitle } from '../bucket';
import { searchAll, type SearchEntry } from '../verify/engines';
import { makeId } from '../store';
import { searchWeiboPosts } from './weibo-search';

/** 专题追踪抓取层：4 搜索引擎结果提取 + 微博站内搜索，并发失败隔离、按标题去重。 */

export interface TopicSourceResult {
  id: string;
  name: string;
  ok: boolean;
  count: number;
  error?: string;
  costMs: number;
}

export interface TopicCollectReport {
  items: RawItem[];
  sources: TopicSourceResult[];
  /** 因标题重复丢弃的条数 */
  duplicates: number;
}

const SEARCH_SOURCE_ID: SourceId = 'search';
/** 每引擎最多转入条数：与验证层 count=20 对齐，防单引擎刷屏 */
const PER_ENGINE_LIMIT = 20;
/** 微博站内搜索转入上限：与 searchWeiboPosts 内部 slice(0,20) 对齐 */
const WEIBO_LIMIT = 20;

const ENGINE_NAME: Record<string, string> = {
  Bing网页: 'Bing搜索',
  百度网页: '百度搜索',
  百度新闻: '百度新闻',
  搜狗网页: '搜狗搜索',
};

function searchEntryToItem(entry: SearchEntry, engine: string, now: number, index: number): RawItem | null {
  const title = entry.title.trim();
  if (!title) return null;
  return {
    id: `search_${now}_${index}_${title.slice(0, 20)}`,
    sourceId: SEARCH_SOURCE_ID,
    sourceName: ENGINE_NAME[engine] ?? engine,
    title,
    text: entry.text?.slice(0, 500),
    url: entry.url,
    rank: index + 1,
    fetchedAt: now,
  };
}

/** 单关键词专题抓取：5 路并发（4 引擎 + 微博搜索），逐源失败隔离 */
export async function collectTopic(keyword: string): Promise<TopicCollectReport> {
  const now = Date.now();
  const sources: TopicSourceResult[] = [];

  const engineTask = (async () => {
    const t0 = Date.now();
    try {
      const hits = await searchAll(keyword);
      const items: RawItem[] = [];
      let seq = 0;
      for (const hit of hits) {
        const entries = (hit.entries ?? []).slice(0, PER_ENGINE_LIMIT);
        for (const entry of entries) {
          const item = searchEntryToItem(entry, hit.engine, now, seq++);
          if (item) items.push(item);
        }
        sources.push({
          id: `engine:${hit.engine}`,
          name: ENGINE_NAME[hit.engine] ?? hit.engine,
          ok: hit.ok && (hit.counted > 0 || entries.length > 0),
          count: 0, // 去重后回填
          error: hit.ok ? undefined : hit.error ?? '抓取失败',
          costMs: Date.now() - t0,
        });
      }
      return items;
    } catch (error) {
      sources.push({
        id: 'engine:all',
        name: '搜索引擎',
        ok: false,
        count: 0,
        error: error instanceof Error ? error.message : String(error),
        costMs: Date.now() - t0,
      });
      return [];
    }
  })();

  const weiboTask = (async () => {
    const t0 = Date.now();
    try {
      const { items } = await searchWeiboPosts(keyword);
      sources.push({
        id: 'weibo-search',
        name: '微博搜索',
        ok: true,
        count: 0, // 去重后回填
        costMs: Date.now() - t0,
      });
      return items.slice(0, WEIBO_LIMIT);
    } catch (error) {
      sources.push({
        id: 'weibo-search',
        name: '微博搜索',
        ok: false,
        count: 0,
        error: error instanceof Error ? error.message : String(error),
        costMs: Date.now() - t0,
      });
      return [];
    }
  })();

  const [engineItems, weiboItems] = await Promise.all([engineTask, weiboTask]);

  // 按标题去重（normalizeTitle 口径）：引擎摘要常带站名后缀，保留首见条目
  const seen = new Set<string>();
  const items: RawItem[] = [];
  let duplicates = 0;
  for (const item of [...engineItems, ...weiboItems]) {
    const key = normalizeTitle(item.title);
    if (!key) {
      duplicates += 1;
      continue;
    }
    if (seen.has(key)) {
      duplicates += 1;
      continue;
    }
    seen.add(key);
    items.push(item);
  }

  // 回填各源实际贡献数（去重后）
  const byName = new Map<string, number>();
  for (const item of items) byName.set(item.sourceName, (byName.get(item.sourceName) ?? 0) + 1);
  for (const s of sources) {
    if (s.ok) s.count = byName.get(s.name) ?? 0;
  }

  return { items, sources, duplicates };
}

/** 增量合并：新条目标题不在旧池才追加；id 用新生成的时间戳，防跨轮 id 串扰 */
export function mergeTopicItems(existing: RawItem[], incoming: RawItem[]): { items: RawItem[]; added: number; duplicates: number } {
  const seen = new Set(existing.map((i) => normalizeTitle(i.title)));
  const fresh: RawItem[] = [];
  let duplicates = 0;
  for (const item of incoming) {
    const key = normalizeTitle(item.title);
    if (!key || seen.has(key)) {
      duplicates += 1;
      continue;
    }
    seen.add(key);
    fresh.push({ ...item, id: makeId('search') });
  }
  return { items: [...existing, ...fresh], added: fresh.length, duplicates };
}

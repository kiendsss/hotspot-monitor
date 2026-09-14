import * as cheerio from 'cheerio';
import type { RawItem } from '../types';
import { fetchJson, fetchText } from './fetch';

/** 知乎热榜：官方接口需登录（401）、页面有反爬（403），策略：
 *  1. 官方 API（部分网络环境可用）
 *  2. TopHub 镜像页解析（今日热榜，带原文链接与热度） */
export async function collectZhihu(): Promise<{ items: RawItem[] }> {
  try {
    return await collectZhihuApi();
  } catch {
    return collectZhihuMirror();
  }
}

interface ZhihuApiItem {
  target: {
    title?: string;
    excerpt?: string;
    url?: string;
  };
  detail_text?: string;
}

interface ZhihuApiResponse {
  data?: ZhihuApiItem[];
}

async function collectZhihuApi(): Promise<{ items: RawItem[] }> {
  const raw = await fetchJson<ZhihuApiResponse>(
    'https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=50',
    {
      headers: {
        Referer: 'https://www.zhihu.com/hot',
        Accept: 'application/json, text/plain, */*',
      },
    },
  );
  const now = Date.now();
  const items: RawItem[] = [];
  let rank = 0;
  for (const entry of raw.data ?? []) {
    const title = (entry.target?.title ?? '').trim();
    if (!title) continue;
    rank += 1;
    const rawUrl = entry.target?.url;
    const url = rawUrl
      ? rawUrl.replace('api.zhihu.com/questions', 'www.zhihu.com/question').replace('api.zhihu.com', 'www.zhihu.com')
      : undefined;
    // detail_text 形如 "1234 万热度"
    const heatMatch = entry.detail_text?.match(/([\d.]+)\s*(?:万)?\s*热度/);
    let heat: number | undefined;
    if (heatMatch) {
      const value = Number(heatMatch[1]);
      heat = entry.detail_text?.includes('万') ? Math.round(value * 10_000) : value;
    }
    items.push({
      id: `zhihu_${now}_${rank}_${title.slice(0, 20)}`,
      sourceId: 'zhihu',
      sourceName: '知乎热榜',
      title,
      text: entry.target?.excerpt?.slice(0, 200),
      url,
      rank,
      heat,
      fetchedAt: now,
    });
  }
  if (items.length === 0) throw new Error('知乎 API 返回为空');
  return { items };
}

const ZHIHU_TOPHUB_URL = 'https://tophub.today/n/mproPpoq6O';

async function collectZhihuMirror(): Promise<{ items: RawItem[] }> {
  const html = await fetchText(ZHIHU_TOPHUB_URL);
  const $ = cheerio.load(html);
  const now = Date.now();
  const items: RawItem[] = [];

  $('table.table tbody tr').each((index, el) => {
    const link = $(el).find('td a').first();
    const title = link.text().trim();
    if (!title) return;
    const href = link.attr('href');
    const rank = index + 1;
    // 热度在 td.ws（微博）或 .item-desc「677 万热度」（知乎）
    const heatText = $(el).find('td.ws').text().trim() || $(el).find('.item-desc').text().trim();
    const heatMatch = heatText.match(/([\d.]+)\s*(万)?/);
    let heat: number | undefined;
    if (heatMatch) {
      const value = Number(heatMatch[1]);
      heat = heatMatch[2] ? Math.round(value * 10_000) : value;
    }
    items.push({
      id: `zhihu_${now}_${rank}_${title.slice(0, 20)}`,
      sourceId: 'zhihu',
      sourceName: '知乎热榜',
      title,
      url: href,
      rank,
      heat,
      extra: index === 0 ? '置顶' : undefined,
      fetchedAt: now,
    });
  });

  if (items.length === 0) throw new Error('知乎镜像页解析为空');
  return { items };
}

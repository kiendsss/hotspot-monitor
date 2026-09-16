import * as cheerio from 'cheerio';
import type { RawItem } from '../types';
import { fetchText } from '../collectors/fetch';

/** 微博站内搜索（s.weibo.com/weibo?q=）：按关键词抓实时博文，作为专题追踪的第 5 个来源。
 * 与热榜采集器（lib/collectors/weibo.ts）不同：这里是搜索页 HTML 解析，无平台热度数值。 */

interface WeiboSearchHit {
  title: string;
  url?: string;
  text?: string;
  publishedAt?: number;
  user?: string;
}

/** 解析搜索页条目：PC 版 .card-wrap[mid] 为主，兼容移动端 .card 结构 */
function parseSearchHtml(html: string, keyword: string): WeiboSearchHit[] {
  const $ = cheerio.load(html);
  const hits: WeiboSearchHit[] = [];
  const seen = new Set<string>();
  $('div.card-wrap[mid]').each((_, el) => {
    const node = $(el);
    const from = node.find('.from a').first().text().trim();
    const textEl = node.find('p.txt').first().text().replace(/\s+/g, ' ').trim();
    // 主文时间：from 首链接常为「x分钟前/今天 hh:mm/日期」；data 属性里有毫秒时间戳则优先
    const tsAttr = node.find('[date]').first().attr('date');
    const ts = tsAttr ? Number(tsAttr) : NaN;
    const publishedAt = Number.isFinite(ts) && ts > 0 ? ts : from ? parseCnRelative(from) : undefined;
    const user = node.find('.name').first().text().trim() || undefined;
    const mid = node.attr('mid') ?? '';
    const dedupeKey = mid || textEl.slice(0, 40);
    if (!textEl || seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    hits.push({
      title: textEl.slice(0, 60) || keyword,
      url: mid ? `https://weibo.com/detail/${mid}` : undefined,
      text: textEl.slice(0, 500),
      publishedAt,
      user,
    });
  });
  return hits;
}

/** 「12分钟前 / 今天 09:30 / 9月10日 08:00 / 09-15」类中文相对时间 */
function parseCnRelative(text: string): number | undefined {
  const now = Date.now();
  const minAgo = text.match(/(\d+)\s*分钟前/);
  if (minAgo) return now - Number(minAgo[1]) * 60_000;
  const hourAgo = text.match(/(\d+)\s*小时前/);
  if (hourAgo) return now - Number(hourAgo[1]) * 3_600_000;
  const dayAgo = text.match(/(\d+)\s*天前/);
  if (dayAgo) return now - Number(dayAgo[1]) * 86_400_000;
  const today = text.match(/今天\s*(\d{1,2}):(\d{2})/);
  if (today) {
    const d = new Date();
    d.setHours(Number(today[1]), Number(today[2]), 0, 0);
    return d.getTime() <= now ? d.getTime() : d.getTime() - 86_400_000;
  }
  const md = text.match(/(\d{1,2})月(\d{1,2})日\s*(\d{1,2}):?(\d{2})?/);
  if (md) {
    const d = new Date();
    d.setMonth(Number(md[1]) - 1, Number(md[2]));
    d.setHours(Number(md[3] ?? 0), Number(md[4] ?? 0), 0, 0);
    // 跨年：算出的时间在未来则回退一年
    return d.getTime() <= now ? d.getTime() : d.getTime() - 365 * 86_400_000;
  }
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** 按关键词搜索微博实时博文；被风控/无结果时抛错由上层隔离 */
export async function searchWeiboPosts(keyword: string): Promise<{ items: RawItem[] }> {
  const url = `https://s.weibo.com/weibo?q=${encodeURIComponent(keyword)}&typeall=1&suball=1&timescope=custom:2026-01-01-0:2026-12-31-0&Refer=g`;
  const html = await fetchText(url, {
    timeoutMs: 10_000,
    headers: { Referer: 'https://s.weibo.com/' },
  });
  if (/验证码|passport\.weibo|登录/i.test(html) && !/card-wrap/.test(html)) {
    throw new Error('微博搜索被风控（需登录/验证码）');
  }
  const hits = parseSearchHtml(html, keyword);
  if (hits.length === 0) throw new Error('微博搜索结果为空（可能被风控或无结果）');
  const now = Date.now();
  const items: RawItem[] = hits.slice(0, 20).map((hit, index) => ({
    id: `weibo_search_${now}_${index}_${hit.title.slice(0, 20)}`,
    sourceId: 'search' as const,
    sourceName: '微博搜索',
    title: hit.title,
    text: hit.text,
    url: hit.url,
    rank: index + 1,
    extra: hit.user ? `@${hit.user}` : undefined,
    publishedAt: hit.publishedAt,
    fetchedAt: now,
  }));
  return { items };
}

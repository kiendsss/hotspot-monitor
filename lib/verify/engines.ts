import * as cheerio from 'cheerio';
import type { EngineHit } from '../types';
import { fetchText } from '../collectors/fetch';

/** 搜索引擎交叉验证：免费 HTML 抓取 + 结果数解析，不依赖任何付费 Key。
 * 组合（2026-09 实测可用）：Bing 网页 / 百度网页 / 百度新闻 / 搜狗网页。
 * Bing 新闻 news/search 会 302 到 cn.bing.com 首页，HTML 抓取不可用，已剔除。
 * v3-b 起同一次解析额外提取结果条目（标题/链接/摘要），供专题追踪按关键词抓取复用。 */

/** 单条搜索结果（专题追踪用；验证层只用计数，忽略此字段） */
export interface SearchEntry {
  title: string;
  url?: string;
  text?: string;
}

export interface EngineParse {
  total: number;
  counted: number;
  officialCount: boolean;
  /** 按页面顺序提取的结果条目（解析不到则空数组） */
  entries: SearchEntry[];
}

function toNum(raw: string): number {
  const digits = raw.replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
}

function isAntiBot(html: string): boolean {
  return /验证码|滑动验证|安全验证|unusual traffic|recaptcha/i.test(html);
}

async function runEngine(
  engine: string,
  url: string,
  headers: Record<string, string>,
  parse: (html: string) => EngineParse,
): Promise<EngineHit> {
  try {
    const html = await fetchText(url, { timeoutMs: 8000, headers });
    if (isAntiBot(html)) throw new Error('命中反爬验证');
    const { total, counted, officialCount, entries } = parse(html);
    return { engine, ok: true, total, counted, officialCount, entries };
  } catch (error) {
    return {
      engine,
      ok: false,
      total: 0,
      counted: 0,
      officialCount: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Bing 网页：span.sb_count「约 29,100 个结果」+ li.b_algo 结果条数与标题/链接/摘要 */
export function searchBingWeb(query: string): Promise<EngineHit> {
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=20`;
  return runEngine('Bing网页', url, {}, (html) => {
    const $ = cheerio.load(html);
    const countText = $('span.sb_count').first().text();
    const m = countText.match(/([\d,，\s]+)/);
    const num = m ? toNum(m[1]) : 0;
    const entries: SearchEntry[] = [];
    $('li.b_algo').each((_, el) => {
      const a = $(el).find('h2 a').first();
      const title = a.text().trim();
      if (!title) return;
      entries.push({
        title,
        url: a.attr('href'),
        text: $(el).find('.b_caption p, .b_lineclamp2, .b_paractl p').first().text().trim() || undefined,
      });
    });
    const counted = entries.length || $('li.b_algo').length;
    return { total: num > 0 ? num : counted, counted, officialCount: num > 0, entries };
  });
}

/** 百度网页：.c-container 结果容器计数；官方总数元素布局多变，解析不到时用实际条数 */
export function searchBaiduWeb(query: string): Promise<EngineHit> {
  const url = `https://www.baidu.com/s?wd=${encodeURIComponent(query)}&rn=20`;
  return runEngine('百度网页', url, { Referer: 'https://www.baidu.com/' }, (html) => {
    const $ = cheerio.load(html);
    const entries: SearchEntry[] = [];
    $('.c-container, .result').each((_, el) => {
      const a = $(el).find('h3 a, .t a').first();
      const title = a.text().trim() || $(el).find('[aria-label], .c-title').first().text().trim();
      if (!title) return;
      entries.push({
        title,
        url: a.attr('href'),
        text: $(el).find('.c-abstract, [class*="content-right"]').first().text().trim() || undefined,
      });
    });
    const counted = entries.length > 0 ? entries.length : $('.c-container').length > 0 ? $('.c-container').length : $('.result').length;
    const bodyText = $('body').text().slice(0, 8000);
    const m = bodyText.match(/找到相关结果[^0-9]{0,10}([\d,，]+)|相关结果约[^0-9]{0,10}([\d,，]+)/);
    const num = m ? toNum(m[1] ?? m[2] ?? '') : 0;
    return { total: num > 0 ? num : counted, counted, officialCount: num > 0, entries };
  });
}

/** 百度新闻：span.nums「百度为您找到相关资讯100个」+ .result 结果条数与标题/链接/摘要 */
export function searchBaiduNews(query: string): Promise<EngineHit> {
  const url = `https://news.baidu.com/ns?word=${encodeURIComponent(query)}&tn=news&from=news&cl=2&rn=20&ct=1`;
  return runEngine('百度新闻', url, {}, (html) => {
    const $ = cheerio.load(html);
    const numsText = $('span.nums').first().text();
    const m = numsText.match(/([\d,，]+)/);
    const num = m ? toNum(m[1]) : 0;
    const entries: SearchEntry[] = [];
    $('div.result, div.result-op').each((_, el) => {
      const a = $(el).find('h3 a').first();
      const title = a.text().trim();
      if (!title) return;
      entries.push({
        title,
        url: a.attr('href'),
        text: $(el).find('.c-summary, .c-gap-top-small, [class*="summary"]').first().text().replace(/\s+/g, ' ').trim() || undefined,
      });
    });
    const counted = entries.length > 0
      ? entries.length
      : $('div.result, div.result-op').length > 0
        ? $('div.result, div.result-op').length
        : $('h3.c-title').length;
    return { total: num > 0 ? num : counted, counted, officialCount: num > 0, entries };
  });
}

/** 搜狗网页：p.num-tips「搜狗已为您找到约37,020条相关结果」+ .vrwrap 结果条数与标题/链接/摘要 */
export function searchSogouWeb(query: string): Promise<EngineHit> {
  const url = `https://www.sogou.com/web?query=${encodeURIComponent(query)}`;
  return runEngine('搜狗网页', url, { Referer: 'https://www.sogou.com/' }, (html) => {
    const $ = cheerio.load(html);
    const tipsText = $('p.num-tips').first().text();
    const m = tipsText.match(/约?\s*([\d,，]+)\s*条/);
    const num = m ? toNum(m[1]) : 0;
    const entries: SearchEntry[] = [];
    $('.vrwrap, .rb').each((_, el) => {
      const a = $(el).find('h3 a').first();
      const title = a.text().trim();
      if (!title) return;
      entries.push({
        title,
        url: a.attr('href'),
        text: $(el).find('.space-txt, .str-text-info, [class*="str_info"]').first().text().trim() || undefined,
      });
    });
    const counted = entries.length > 0 ? entries.length : $('.vrwrap').length > 0 ? $('.vrwrap').length : $('.rb').length;
    return { total: num > 0 ? num : counted, counted, officialCount: num > 0, entries };
  });
}

type EngineFn = (query: string) => Promise<EngineHit>;

export const ENGINES: { id: string; run: EngineFn }[] = [
  { id: 'Bing网页', run: searchBingWeb },
  { id: '百度网页', run: searchBaiduWeb },
  { id: '百度新闻', run: searchBaiduNews },
  { id: '搜狗网页', run: searchSogouWeb },
];

/** 全引擎并发查询，单个引擎失败不影响其他（runEngine 内部已兜底不抛错） */
export async function searchAll(query: string): Promise<EngineHit[]> {
  const results = await Promise.allSettled(ENGINES.map((e) => e.run(query)));
  return results.map((result, index) =>
    result.status === 'fulfilled'
      ? result.value
      : {
          engine: ENGINES[index].id,
          ok: false,
          total: 0,
          counted: 0,
          officialCount: false,
          error: String(result.reason),
        },
  );
}

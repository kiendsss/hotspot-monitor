import * as cheerio from 'cheerio';
import type { RawItem } from '../types';
import { fetchJson, fetchText } from './fetch';

interface BaiduCardRaw {
  word?: string;
  desc?: string;
  /** 榫位（1 开始），无 hotScore 数值字段 */
  index?: number;
  hotTag?: string;
  /** 标签文案：热/新/辟谣/热议 等 */
  newHotName?: string;
  labelTagName?: string;
  url?: string;
  /** 实际结构中 content 里还嵌一层 content */
  content?: BaiduCardRaw[];
}

interface BaiduHotResponse {
  data?: {
    cards?: { content?: BaiduCardRaw[] }[];
  };
}

/** 递归展平嵌套的 content 数组，取出含 word 的卡片 */
function flattenCards(raw: BaiduCardRaw[] | undefined): BaiduCardRaw[] {
  if (!raw) return [];
  const out: BaiduCardRaw[] = [];
  for (const card of raw) {
    if (card.word) out.push(card);
    if (card.content) out.push(...flattenCards(card.content));
  }
  return out;
}

/** 百度热搜：公开 JSON 接口（top.baidu.com 的 board 接口） */
export async function collectBaidu(): Promise<{ items: RawItem[] }> {
  const raw = await fetchJson<BaiduHotResponse>(
    'https://top.baidu.com/api/board?platform=wise&tab=realtime',
  );
  const cards = flattenCards(raw.data?.cards?.flatMap((c) => c.content ?? []));
  const now = Date.now();
  const items: RawItem[] = cards
    .filter((c) => c.word)
    .map((card, index) => ({
      id: `baidu_${now}_${index}_${card.word!.slice(0, 20)}`,
      sourceId: 'baidu' as const,
      sourceName: '百度热搜',
      title: card.word!,
      text: card.desc?.replace(/<[^>]+>/g, '').slice(0, 200),
      url: card.url,
      // 该接口无 hotScore 数值，用榜单位次折算热度：rank1≈100000
      heat: card.index ? Math.max(100_000 - card.index * 2_000, 1_000) : 100_000,
      extra: card.newHotName ?? card.labelTagName,
      fetchedAt: now,
    }));
  if (items.length === 0) throw new Error('百度热搜接口返回为空');
  return { items };
}

/** 备用：HTML 页面解析 */
export async function collectBaiduHtmlFallback(): Promise<{ items: RawItem[] }> {
  const html = await fetchText('https://top.baidu.com/board?tab=realtime');
  const $ = cheerio.load(html);
  const now = Date.now();
  const items: RawItem[] = [];
  $('.c-single-text-quotations, .category-wrap_iQLoo').each((index, el) => {
    const title = $(el).find('.c-single-text-quotations__title, .title_dIF3B').first().text().trim();
    if (!title) return;
    const desc = $(el).find('.hot-desc_1m_jR, .hot-desc').text().trim();
    items.push({
      id: `baidu_${now}_${index}_${title.slice(0, 20)}`,
      sourceId: 'baidu',
      sourceName: '百度热搜',
      title,
      text: desc.slice(0, 200) || undefined,
      fetchedAt: now,
    });
  });
  if (items.length === 0) throw new Error('百度热搜 HTML 解析为空');
  return { items };
}

import * as cheerio from 'cheerio';
import type { RawItem } from '../types';
import { fetchJson, fetchText } from './fetch';

interface WeiboCard {
  mblog?: {
    text?: string;
    created_at?: string;
  };
  word_scheme?: string;
  word?: string;
  /** 微博 2026 改版后热度字段由 raw_hot 变为 num */
  raw_hot?: number;
  num?: number;
  rank?: number;
  realpos?: number;
  label_name?: string;
  category?: string;
  is_ad?: number;
}

interface WeiboHotSearchResponse {
  data?: {
    realtime?: WeiboCard[];
  };
}

/** 微博热搜：公开 JSON 接口，含热度值与标签（热/新/爆/娱乐等） */
export async function collectWeibo(): Promise<{ items: RawItem[] }> {
  const raw = await fetchJson<WeiboHotSearchResponse>(
    'https://weibo.com/ajax/side/hotSearch',
    { headers: { Referer: 'https://weibo.com/' } },
  );
  const cards = raw.data?.realtime ?? [];
  const now = Date.now();
  const items: RawItem[] = [];
  let rank = 0;
  for (const card of cards) {
    const word = card.word_scheme ?? card.word ?? '';
    const title = word.startsWith('#') ? word.slice(1) : word;
    if (!title) continue;
    // 博文推广 / 商业标签直接丢弃
    const category = card.category ?? '';
    if (card.is_ad === 1 || /推广|商业|广告/.test(category)) continue;
    rank += 1;
    const heat = card.raw_hot ?? card.num ?? undefined;
    const label = card.label_name ?? card.mblog?.text?.match(/class="surl-text">([^<]+)</)?.[1];
    items.push({
      id: `weibo_${now}_${rank}_${title.slice(0, 20)}`,
      sourceId: 'weibo',
      sourceName: '微博热搜',
      title,
      text: card.mblog?.text?.replace(/<[^>]+>/g, '').slice(0, 200),
      url: `https://s.weibo.com/weibo?q=${encodeURIComponent(`#${title}#`)}`,
      rank,
      heat,
      extra: label,
      fetchedAt: now,
    });
  }
  if (items.length === 0) {
    // 接口结构变化兜底：试抓移动端页面
    return collectWeiboMobileFallback();
  }
  return { items };
}

async function collectWeiboMobileFallback(): Promise<{ items: RawItem[] }> {
  const html = await fetchText('https://s.weibo.com/top/summary');
  const $ = cheerio.load(html);
  const now = Date.now();
  const items: RawItem[] = [];
  $('tbody tr').each((index, el) => {
    const title = $(el).find('td.td-02 a').text().trim();
    if (!title) return;
    const heatText = $(el).find('td.td-02 span').text().replace(/\D/g, '');
    items.push({
      id: `weibo_${now}_${index}_${title.slice(0, 20)}`,
      sourceId: 'weibo',
      sourceName: '微博热搜',
      title,
      url: new URL($(el).find('td.td-02 a').attr('href') ?? '', 'https://s.weibo.com').toString(),
      heat: heatText ? Number(heatText) : undefined,
      fetchedAt: now,
    });
  });
  if (items.length === 0) throw new Error('微博热搜抓取为空（可能被风控）');
  return { items };
}

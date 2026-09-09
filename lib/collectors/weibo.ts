import * as cheerio from 'cheerio';
import type { RawItem } from '../types';
import { fetchJson, fetchText } from './fetch';

interface WeiboCard {
  mblog?: {
    text?: string;
    created_at?: string;
  };
  word_scheme?: string;
  raw_hot?: number;
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
  cards.forEach((card, index) => {
    const word = card.word_scheme ?? '';
    const title = word.startsWith('#') ? word.slice(1) : word;
    if (!title) return;
    const label = card.mblog?.text?.match(/class="surl-text">([^<]+)</)?.[1];
    items.push({
      id: `weibo_${now}_${index}_${title.slice(0, 20)}`,
      sourceId: 'weibo',
      sourceName: '微博热搜',
      title,
      text: card.mblog?.text?.replace(/<[^>]+>/g, '').slice(0, 200),
      url: `https://s.weibo.com/weibo?q=${encodeURIComponent(`#${title}#`)}`,
      heat: card.raw_hot ?? undefined,
      extra: label,
      fetchedAt: now,
    });
  });
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

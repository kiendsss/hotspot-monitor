import * as cheerio from 'cheerio';
import type { RawItem } from '../types';
import { fetchJson, fetchText } from './fetch';

interface WeiboCard {
  mblog?: {
    text?: string;
    /** 历史字段：当前热搜接口多数卡片无 mblog，有则解析（形如 "Mon Sep 14 10:00:00 +0800 2026"） */
    created_at?: string;
  };
  word_scheme?: string;
  word?: string;
  /** 微博 2026 改版后热度字段由 raw_hot 变为 num */
  raw_hot?: number;
  num?: number;
  rank?: number;
  realpos?: number;
  /** 榜单上榜时间戳（秒）：当前热搜接口不返回，有则解析 */
  timestamp?: number;
  on_board_time?: number;
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
    // 热搜榜本身是“榜单上榜”概念，接口不返回词条发布时间；
    // 仅当卡片携带 mblog.created_at / timestamp 类字段时才记录，其余留空由前端显示“榜单未提供”
    const createdAt = card.mblog?.created_at ? Date.parse(card.mblog.created_at) : NaN;
    const boardTs = [card.timestamp, card.on_board_time]
      .filter((t): t is number => typeof t === 'number' && t > 0)
      .map((t) => (t < 1e12 ? t * 1000 : t))[0];
    const publishedAt = Number.isFinite(createdAt) ? createdAt : boardTs;
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
      publishedAt,
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

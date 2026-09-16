import type { Hotspot, KeywordTopic, RawItem, Settings, TopicReport, TrackInterval } from '../types';
import { analyzeHotspots } from '../ai';
import { collectTopic, mergeTopicItems } from './search';
import { getDb, makeId, saveDb } from '../store';

/** 专题追踪业务层：抓取 → 入库 → AI 分析 → 报告落库。手动与调度器共用。 */

const VALID_INTERVALS: TrackInterval[] = [1, 6, 12, 24];
export const MAX_TOPICS = 50;

export function normalizeInterval(value: unknown): TrackInterval {
  const n = Number(value);
  return (VALID_INTERVALS as number[]).includes(n) ? (n as TrackInterval) : 6;
}

export function createKeyword(keyword: string, interval: TrackInterval): KeywordTopic {
  const now = Date.now();
  return {
    id: makeId('topic'),
    keyword: keyword.trim().slice(0, 60),
    createdAt: now,
    updatedAt: now,
    autoTrack: false,
    trackIntervalHours: interval,
    items: [],
  };
}

/** 抓取并增量合并条目；返回更新后的 topic（调用方负责落库） */
export async function grabTopic(topic: KeywordTopic): Promise<{ topic: KeywordTopic; report: import('./search').TopicCollectReport; added: number; duplicates: number }> {
  const collect = await collectTopic(topic.keyword);
  const { items, added, duplicates } = mergeTopicItems(topic.items, collect.items);
  return {
    topic: { ...topic, items, updatedAt: Date.now() },
    report: collect,
    added,
    duplicates,
  };
}

/** 对专题条目跑 AI/Mock 分析，产出专题报告（不进头版快照序列） */
export async function analyzeTopic(topic: KeywordTopic, settings: Settings): Promise<{ topic: KeywordTopic; hotspots: Hotspot[]; model: string; mock: boolean }> {
  if (topic.items.length === 0) throw new Error('专题暂无素材，请先抓取');
  const apiKey = settings.openrouterKey && !settings.mockMode ? settings.openrouterKey : undefined;
  const output = await analyzeHotspots({
    items: topic.items,
    model: settings.model,
    apiKey,
    // 专题条目天然同主题：不喂佐证摘要，也不做跨源淘汰，让模型直接聚合
    interestKeywords: settings.interestKeywords?.filter((kw) => kw.trim()) ?? [],
  });
  const hotspots = output.hotspots
    .map((h, index) => ({
      ...h,
      id: `hs_${Date.now().toString(36)}_${index}`,
      rank: index + 1,
      trend: 'new' as const,
    }))
    .sort((a, b) => b.heat - a.heat)
    .map((h, index) => ({ ...h, rank: index + 1 }));
  const report: TopicReport = {
    createdAt: Date.now(),
    model: output.model,
    mock: output.mock,
    hotspots,
  };
  return { topic: { ...topic, report }, hotspots, model: output.model, mock: output.mock };
}

/** 抓取 + 分析一次跑完（调度器用），失败写 lastError；返回最新 db */
export async function runTopicCycle(topicId: string): Promise<{ added: number; hotspots: number; mock: boolean } | { error: string }> {
  const db = await getDb();
  const settings = await import('../store').then((m) => m.getSettings());
  const topics = db.topics ?? [];
  const topic = topics.find((t) => t.id === topicId);
  if (!topic) return { error: '专题不存在' };
  try {
    const grabbed = await grabTopic(topic);
    const analyzed = await analyzeTopic(grabbed.topic, settings);
    const updated: KeywordTopic = {
      ...analyzed.topic,
      lastTrackedAt: Date.now(),
      lastError: undefined,
    };
    await saveDb({ ...db, topics: topics.map((t) => (t.id === topicId ? updated : t)) });
    return { added: grabbed.added, hotspots: analyzed.hotspots.length, mock: analyzed.mock };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await saveDb({
      ...db,
      topics: topics.map((t) => (t.id === topicId ? { ...t, lastTrackedAt: Date.now(), lastError: message } : t)),
    });
    return { error: message };
  }
}

/** 条目池大小参考：专题条目不进全局池，仅用于前端展示 */
export function topicItemSummary(items: RawItem[]): string {
  const byName = new Map<string, number>();
  for (const item of items) byName.set(item.sourceName, (byName.get(item.sourceName) ?? 0) + 1);
  return [...byName.entries()].map(([name, n]) => `${name}×${n}`).join(' · ');
}

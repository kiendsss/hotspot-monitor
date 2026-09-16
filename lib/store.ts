import type { DbData, QualitySettings, RawItem, Settings, Snapshot } from './types';
import { getServerModel, isVercelRuntime } from './env';
import { storage } from './storage';

// 业务数据门面：底层读写全部委托 lib/storage（本地 JSON / Vercel KV 自动切换）。
// 本文件只管键名约定、默认值合并与裁剪策略，Route 层零改动。

const DB_KEY = 'db';
const DB_ITEMS_KEY = 'db-items';
const SETTINGS_KEY = 'settings';
const VERIFY_CACHE_KEY = 'verify-cache';

/** 原始条目池上限，超过后裁掉最旧的 */
const MAX_ITEMS = 2000;
/** 快照保留上限 */
const MAX_SNAPSHOTS = 100;
/** 单个专题素材条目上限（新增在尾部） */
const MAX_TOPIC_ITEMS = 500;
/** 单份专题报告热点数上限（按热度排序后裁剪） */
const MAX_TOPIC_HOTSPOTS = 30;

export const DEFAULT_SOURCE_LIMITS: Record<'weibo' | 'zhihu' | 'baidu' | 'github', { topN: number; minHeat: number }> = {
  weibo: { topN: 30, minHeat: 100000 },
  zhihu: { topN: 30, minHeat: 500000 },
  baidu: { topN: 30, minHeat: 0 },
  github: { topN: 25, minHeat: 20 },
};

export const DEFAULT_QUALITY: QualitySettings = {
  verifyEnabled: true,
  minEngines: 1,
  minHits: 5,
  requireCrossSource: true,
  cacheTtlMs: 6 * 60 * 60 * 1000,
};

export const DEFAULT_SETTINGS: Settings = {
  model: 'deepseek/deepseek-chat',
  mockMode: true,
  rssFeeds: [],
  builtinSources: { weibo: true, zhihu: true, baidu: true, github: true },
  sourceLimits: DEFAULT_SOURCE_LIMITS,
  quality: DEFAULT_QUALITY,
  interestKeywords: [],
};

export const EMPTY_DB: DbData = { items: [], snapshots: [], topics: [] };

export interface VerifyCacheEntry {
  checkedAt: number;
  verification: unknown;
}
export type VerifyCache = Record<string, VerifyCacheEntry>;

export async function getDb(): Promise<DbData> {
  const stored = await storage.get<DbData>(DB_KEY);
  return stored ? { ...EMPTY_DB, ...stored } : EMPTY_DB;
}

/**
 * 读取生效设置：env 优先级高于存储值，并派生 Serverless 标志。
 * 原因：在线演示的 Key/模型应由 Vercel 环境变量控制，
 * 存储不可用（KV 未绑定）时配置也不至丢失。
 */
export async function getSettings(): Promise<Settings & { aiKey?: string; serverless: boolean }> {
  const stored = (await storage.get<Settings>(SETTINGS_KEY)) ?? DEFAULT_SETTINGS;
  const envKey =
    process.env.OPENROUTER_API_KEY?.trim() || process.env.DEEPSEEK_API_KEY?.trim();
  const onVercel = isVercelRuntime();
  const settings: Settings & { aiKey?: string; serverless: boolean } = {
    ...stored,
    model: getServerModel(stored.model),
    serverless: onVercel,
    aiKey: envKey || stored.openrouterKey,
  };
  if (onVercel) {
    // 线上默认关交叉验证：4 引擎 HTML 抓取太慢，会拖爆 Serverless 超时
    settings.quality = {
      verifyEnabled: false,
      minEngines: settings.quality?.minEngines ?? DEFAULT_QUALITY.minEngines,
      minHits: settings.quality?.minHits ?? DEFAULT_QUALITY.minHits,
      requireCrossSource: settings.quality?.requireCrossSource ?? DEFAULT_QUALITY.requireCrossSource,
      cacheTtlMs: DEFAULT_QUALITY.cacheTtlMs,
    };
  }
  return settings;
}

/** 整体保存：裁剪策略集中在这里，存储层只见干净数据 */
export async function saveDb(db: DbData): Promise<void> {
  const trimmed: DbData = {
    items: db.items.slice(-MAX_ITEMS),
    snapshots: db.snapshots.slice(-MAX_SNAPSHOTS),
    // 专题条目/报告各自裁剪，避免单个长追踪专题撑爆一份文档
    topics: (db.topics ?? []).map((t) => ({
      ...t,
      items: t.items.slice(-MAX_TOPIC_ITEMS),
      report: t.report
        ? { ...t.report, hotspots: t.report.hotspots.slice(0, MAX_TOPIC_HOTSPOTS) }
        : undefined,
    })),
  };
  await storage.set(DB_KEY, trimmed);
  // 同步维护条目视图键，采集增量只碰该键时整体读数保持一致
  await storage.set(DB_ITEMS_KEY, trimmed.items);
}

/**
 * 增量追加条目池：走 storage.append（去重 + 尾部追加 + 裁剪）。
 * 原因：db 整体含快照/专题，采集只增条目，没必要每次整库重写；
 * KV 上大文档读写贵，append 只读写 db-items 视图，快且便宜。
 */
export async function appendDbItems(items: RawItem[]): Promise<{ db: DbData; added: number }> {
  const db = await getDb();
  if (items.length === 0) return { db, added: 0 };
  // 首次迁移：旧 db 整体存在、条目视图缺失时，用整体条目播种视图，保证老数据不丢
  if ((await storage.get<RawItem[]>(DB_ITEMS_KEY)) === null) {
    await storage.set(DB_ITEMS_KEY, db.items);
  }
  const { added } = await storage.append(DB_ITEMS_KEY, items, {
    maxLength: MAX_ITEMS,
    dedupeKey: (i) => i.id,
  });
  // 视图与整体合并：条目视图已是最终态，快照/专题按原样回填
  const itemsView = (await storage.get<RawItem[]>(DB_ITEMS_KEY)) ?? db.items;
  const next: DbData = { ...db, items: itemsView.slice(-MAX_ITEMS) };
  await storage.set(DB_KEY, next);
  return { db: next, added };
}

export async function saveSettings(settings: Settings): Promise<void> {
  const { aiKey: _aiKey, serverless: _serverless, ...stored } = settings as Settings & {
    aiKey?: string;
    serverless?: boolean;
  };
  await storage.set(SETTINGS_KEY, stored);
}

/** 交叉验证缓存：整读整写走 get/set */
export async function getVerifyCache(): Promise<VerifyCache> {
  return (await storage.get<VerifyCache>(VERIFY_CACHE_KEY)) ?? {};
}

export async function saveVerifyCache(cache: VerifyCache): Promise<void> {
  await storage.set(VERIFY_CACHE_KEY, cache);
}

export function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function upsertItems(existing: RawItem[], incoming: RawItem[]): {
  items: RawItem[];
  added: number;
} {
  const seen = new Set(existing.map((i) => i.id));
  const fresh = incoming.filter((i) => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });
  return { items: [...existing, ...fresh], added: fresh.length };
}

export function latestSnapshot(db: DbData): Snapshot | undefined {
  return db.snapshots[db.snapshots.length - 1];
}

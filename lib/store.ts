import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { DbData, QualitySettings, RawItem, Settings, Snapshot } from './types';

const DATA_DIR = join(process.cwd(), 'data');
const DB_PATH = join(DATA_DIR, 'db.json');
const SETTINGS_PATH = join(DATA_DIR, 'settings.json');

/** 原始条目池上限，超过后裁掉最旧的 */
const MAX_ITEMS = 2000;
/** 快照保留上限 */
const MAX_SNAPSHOTS = 100;

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

export const EMPTY_DB: DbData = { items: [], snapshots: [] };

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(path, 'utf8');
    return { ...fallback, ...(JSON.parse(raw) as T) };
  } catch {
    return fallback;
  }
}

/** 临时文件 + rename 原子写，避免进程中断导致 JSON 损坏 */
async function writeJson(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await rename(tmp, path);
}

export async function getDb(): Promise<DbData> {
  return readJson(DB_PATH, EMPTY_DB);
}

export async function saveDb(db: DbData): Promise<void> {
  const trimmed: DbData = {
    items: db.items.slice(-MAX_ITEMS),
    snapshots: db.snapshots.slice(-MAX_SNAPSHOTS),
  };
  await writeJson(DB_PATH, trimmed);
}

export async function getSettings(): Promise<Settings> {
  return readJson(SETTINGS_PATH, DEFAULT_SETTINGS);
}

export async function saveSettings(settings: Settings): Promise<void> {
  await writeJson(SETTINGS_PATH, settings);
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

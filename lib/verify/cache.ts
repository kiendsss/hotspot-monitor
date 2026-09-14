import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Verification } from '../types';
import { searchAll } from './engines';
import { computeVerification } from './score';

const CACHE_PATH = join(process.cwd(), 'data', 'verify-cache.json');
/** 单次分析验证的候选上限：只核验预聚合头部，避免 4 引擎 × 全量标题刷太久 */
export const MAX_VERIFY_CANDIDATES = 30;
/** 引擎并发上限：节流是为避免被反爬 */
const MAX_CONCURRENCY = 3;

interface CacheEntry {
  checkedAt: number;
  verification: Verification;
}

type CacheMap = Record<string, CacheEntry>;

async function readCache(): Promise<CacheMap> {
  try {
    const raw = await readFile(CACHE_PATH, 'utf8');
    return JSON.parse(raw) as CacheMap;
  } catch {
    return {};
  }
}

async function writeCache(cache: CacheMap): Promise<void> {
  try {
    await mkdir(dirname(CACHE_PATH), { recursive: true });
    const tmp = `${CACHE_PATH}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(cache, null, 2), 'utf8');
    await rename(tmp, CACHE_PATH);
  } catch {
    // 缓存写失败不阻塞主链路，下次再查一次引擎即可
  }
}

/** 标题归一化缓存 key：预聚合分桶口径，别名归一到同一缓存条目 */
export function normalizeCacheKey(title: string): string {
  return title.replace(/[\s\p{P}\p{S}]+/gu, '').toLowerCase();
}

/**
 * 批量验证候选标题：缓存命中直接用，剩余并发查引擎（每批 3 个）。
 * 全部引擎失败的候选标记 unverified 但不淘汰，不阻塞出刊。
 */
export async function verifyTitles(
  titles: string[],
  opts: { cacheTtlMs: number; minEngines: number; minHits: number },
): Promise<Map<string, Verification>> {
  const quality = { verifyEnabled: true, minEngines: opts.minEngines, minHits: opts.minHits, requireCrossSource: false, cacheTtlMs: opts.cacheTtlMs };
  const targets = titles.slice(0, MAX_VERIFY_CANDIDATES);
  const cache = await readCache();
  const now = Date.now();
  const out = new Map<string, Verification>();
  const pending: string[] = [];

  for (const title of targets) {
    const key = normalizeCacheKey(title);
    const entry = cache[key];
    if (entry && now - entry.checkedAt < opts.cacheTtlMs) {
      out.set(title, entry.verification);
    } else {
      pending.push(title);
    }
  }

  for (let i = 0; i < pending.length; i += MAX_CONCURRENCY) {
    const batch = pending.slice(i, i + MAX_CONCURRENCY);
    const results = await Promise.all(batch.map(async (title) => {
      const hits = await searchAll(title);
      return computeVerification(hits, quality);
    }));
    results.forEach((verification, index) => {
      const title = batch[index];
      out.set(title, verification);
      cache[normalizeCacheKey(title)] = { checkedAt: now, verification };
    });
  }

  await writeCache(cache);
  return out;
}

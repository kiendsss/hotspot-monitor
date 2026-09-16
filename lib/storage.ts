// 存储抽象层：本地 JSON 文件 vs Vercel KV，运行时自动切换
// 原因：Vercel Serverless 文件系统只读（/tmp 跨实例不共享），线上必须用 KV 持久化；
// 本地 dev 则继续用 ./data/<key>.json，零配置可跑。业务层只认 Storage 接口。
//
// 键约定（KV 与本地文件同名，便于对照迁移）：
//   'db'           -> DbData 整体（兼容旧版单文件）
//   'db-items'     -> RawItem[] 视图，采集增量只碰这个键（免整库重写快照/专题）
//   'settings'     -> Settings
//   'verify-cache' -> VerifyCache
// db 整体可能很大，条目增量走 append 语义：读列表 -> 去重追加 -> 裁剪 -> 回写。

import { isVercelRuntime } from './env';

export interface AppendOptions<T> {
  /** 列表最大长度，超长时从头部裁掉最旧的（默认 2000） */
  maxLength?: number;
  /** 去重键；提供时只追加键不存在的条目，并返回 added 计数 */
  dedupeKey?: (item: T) => string;
}

/**
 * 通用存储接口：get 整体读、set 整体写、append 列表尾部追加。
 * key 为逻辑键名，实现层自行映射到底层位置（本地文件名 / KV 键）。
 */
export interface Storage {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  append<T>(key: string, items: T[], opts?: AppendOptions<T>): Promise<{ added: number; total: number }>;
}

/** append 共用逻辑：去重 + 尾部追加 + 裁剪；两实现只落盘方式不同 */
async function appendWith(
  store: Pick<Storage, 'get' | 'set'>,
  key: string,
  items: unknown[],
  opts?: AppendOptions<unknown>,
): Promise<{ added: number; total: number }> {
  const maxLength = opts?.maxLength ?? 2000;
  const current = (await store.get<unknown[]>(key)) ?? [];
  let fresh = items;
  if (opts?.dedupeKey) {
    const dedupe = opts.dedupeKey;
    const seen = new Set(current.map(dedupe));
    fresh = items.filter((i) => {
      const k = dedupe(i);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }
  const next = [...current, ...fresh].slice(-maxLength);
  await store.set(key, next);
  return { added: fresh.length, total: next.length };
}

/** 本地开发：读写 ./data/<key>.json，原子写（tmp + rename）防写坏 */
class LocalStorage implements Storage {
  private readonly dir: string;

  constructor(dir?: string) {
    const cwd = typeof process.cwd === 'function' ? process.cwd() : '.';
    this.dir = dir ?? `${cwd}/data`;
  }

  private path(key: string): string {
    return `${this.dir}/${key}.json`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const { readFile } = await import('node:fs/promises');
      return JSON.parse(await readFile(this.path(key), 'utf8')) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    const { mkdir, rename, writeFile } = await import('node:fs/promises');
    const { dirname } = await import('node:path');
    const path = this.path(key);
    await mkdir(dirname(path), { recursive: true });
    const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tmp, JSON.stringify(value, null, 2), 'utf8');
    await rename(tmp, path);
  }

  async append<T>(key: string, items: T[], opts?: AppendOptions<T>): Promise<{ added: number; total: number }> {
    return appendWith(this, key, items, opts as AppendOptions<unknown> | undefined);
  }
}

/**
 * Vercel 线上：使用 @vercel/kv 持久化（键加 hotspot: 前缀防同账号多项目串数据）。
 * KV 未绑定（缺 KV_REST_API_URL）时降级为进程内存，保证在线演示不 500；
 * 控制台只打一次警告，提醒去 Vercel Storage 页创建 KV 并绑定项目。
 */
class VercelKVStorage implements Storage {
  private readonly kvPrefix = 'hotspot:';
  private readonly memory = new Map<string, unknown>();
  private warned = false;

  private async kv() {
    const { kv } = await import('@vercel/kv');
    return kv;
  }

  private fallback(reason: string): void {
    if (!this.warned) {
      this.warned = true;
      console.warn(
        `[storage] KV 不可用，已降级为内存存储：${reason}。请在 Vercel Storage 页创建 KV 数据库并绑定项目。`,
      );
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      return (await (await this.kv()).get<T>(this.kvPrefix + key)) ?? null;
    } catch (error) {
      this.fallback(error instanceof Error ? error.message : String(error));
      return (this.memory.get(key) as T) ?? null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await (await this.kv()).set(this.kvPrefix + key, value);
    } catch (error) {
      this.fallback(error instanceof Error ? error.message : String(error));
      this.memory.set(key, value);
    }
  }

  async append<T>(key: string, items: T[], opts?: AppendOptions<T>): Promise<{ added: number; total: number }> {
    return appendWith(this, key, items, opts as AppendOptions<unknown> | undefined);
  }
}

function createStorage(): Storage {
  if (isVercelRuntime()) return new VercelKVStorage();
  return new LocalStorage();
}

/** 全局单例：Serverless 下复用同实例连接，本地 dev 复用同目录句柄 */
export const storage: Storage = createStorage();

export { isVercelRuntime };

import type { RawItem } from '../types';

const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

export async function fetchText(
  url: string,
  opts: { timeoutMs?: number; headers?: Record<string, string> } = {},
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 10_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': DEFAULT_UA,
        Accept: 'text/html,application/json,*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        ...opts.headers,
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJson<T>(
  url: string,
  opts: { timeoutMs?: number; headers?: Record<string, string> } = {},
): Promise<T> {
  const text = await fetchText(url, opts);
  return JSON.parse(text) as T;
}

export interface CollectorResult {
  items: RawItem[];
}

export type Collector = () => Promise<CollectorResult>;

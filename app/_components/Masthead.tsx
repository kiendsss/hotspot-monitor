'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export interface HealthInfo {
  items: number;
  lastIssue: number | null;
  mockMode: boolean;
  hasKey: boolean;
  model: string;
}

export function Masthead() {
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  useEffect(() => {
    const load = () =>
      fetch('/api/health')
        .then((r) => r.json())
        .then((d) => d.ok && setHealth(d))
        .catch(() => {});
    load();
    const timer = setInterval(load, 30_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="masthead">
      <h1>
        热点观察哨<span className="gazette-red">·</span>热频日报
      </h1>
      <div className="masthead-meta">
        <span>{today}</span>
        <nav className="nav">
          <Link href="/">头版</Link>
          <Link href="/sources">采编部</Link>
          <Link href="/settings">印务设置</Link>
        </nav>
        <span>
          <i className={`lamp ${health ? 'ok' : 'off'}`} />
          第 {health?.lastIssue ?? '—'} 期 · 存稿 {health?.items ?? 0} 条
          {health?.mockMode ? ' · Mock 简报' : ' · AI 简报'}
        </span>
      </div>
    </header>
  );
}

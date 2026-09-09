'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Spotlight } from './ui/spotlight';

export interface HealthInfo {
  items: number;
  lastIssue: number | null;
  mockMode: boolean;
  hasKey: boolean;
  model: string;
}

export function Masthead() {
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [today, setToday] = useState('');
  useEffect(() => {
    setToday(
      new Date().toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      }),
    );
  }, []);

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
      <Spotlight className="-top-40 left-0 md:-top-20 md:left-48" fill="#b3271e" />
      <h1>
        热点观察哨<span className="gazette-red">·</span>热频日报
      </h1>
      <p
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          letterSpacing: '0.22em',
          color: 'var(--ink-faint)',
          marginTop: 8,
          position: 'relative',
          zIndex: 2,
        }}
      >
        捕捉正在走热的 · 第一时间分享有价值的
      </p>
      <div className="masthead-meta">
        <span>{today}</span>
        <nav className="nav">
          <Link href="/">
            头版<small>FRONT</small>
          </Link>
          <Link href="/sources">
            采编部<small>SOURCES</small>
          </Link>
          <Link href="/settings">
            印务设置<small>SETTINGS</small>
          </Link>
        </nav>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span className="pulse-dot" aria-hidden />
            <span style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--red)', fontWeight: 700 }}>LIVE</span>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <i className={`lamp ${health ? 'ok' : 'off'}`} />
            第 {health?.lastIssue ?? '—'} 期 · 存稿 {health?.items ?? 0} 条
            {health?.mockMode ? ' · Mock 简报' : ' · AI 简报'}
          </span>
        </span>
      </div>
    </header>
  );
}

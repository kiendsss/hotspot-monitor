'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Masthead } from '../_components/Masthead';
import type { TrackInterval } from '@/lib/types';
import type { TopicSummary } from '@/app/api/topics/route';

const INTERVALS: { value: TrackInterval; label: string }[] = [
  { value: 1, label: '每 1 小时' },
  { value: 6, label: '每 6 小时' },
  { value: 12, label: '每 12 小时' },
  { value: 24, label: '每 24 小时' },
];

function formatTime(ts?: number): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function TopicsPage() {
  const [topics, setTopics] = useState<TopicSummary[]>([]);
  const [keyword, setKeyword] = useState('');
  const [interval, setInterval] = useState<TrackInterval>(6);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetch('/api/topics').then((r) => r.json());
      if (data.ok) setTopics(data.topics);
    } catch {
      // 列表加载失败静默，页面保留空状态
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const create = async () => {
    const kw = keyword.trim();
    if (!kw) {
      setNotice({ text: '请输入关键词', ok: false });
      return;
    }
    setBusy(true);
    // 立项后自动跳转到详情页，直接查看抓取与 AI 分析后的成果。
    setNotice({ text: `专题「${kw}」立项中，正在抓取并分析…`, ok: true });
    try {
      const data = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: kw, trackIntervalHours: interval }),
      }).then((r) => r.json());
      if (!data.ok) throw new Error(data.error);
      const initial = data.initialRun as { ok: boolean; error?: string; hotspots?: number } | undefined;
      if (initial && !initial.ok) {
        setNotice({ text: `已立项但首次抓取失败：${initial.error ?? '未知错误'}，已进入详情页可手动重试`, ok: false });
      }
      setKeyword('');
      window.location.href = `/topics/${data.topic.id}`;
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : String(error), ok: false });
      setBusy(false);
    }
  };

  const remove = async (id: string, name: string) => {
    if (!window.confirm(`确定撤下专题「${name}」吗？素材与报告一并删除。`)) return;
    try {
      const data = await fetch(`/api/topics/${id}`, { method: 'DELETE' }).then((r) => r.json());
      if (!data.ok) throw new Error(data.error);
      setNotice({ text: `已撤下「${name}」`, ok: true });
      await load();
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : String(error), ok: false });
    }
  };

  return (
    <>
      <Masthead />
      <main className="page">
        {notice && <div className={`notice ${notice.ok ? 'ok' : ''}`}>{notice.text}</div>}

        <section className="panel">
          <h3>立项 — 新关键词</h3>
          <p className="hint" style={{ marginBottom: 14, color: 'var(--ink-faint)', fontSize: 12, fontFamily: 'var(--mono)' }}>
            输入关键词即立项；抓取覆盖 4 个搜索引擎 + 微博站内搜索，结果独立存档，不进头版刊号
          </p>
          <div className="toolbar">
            <input
              type="text"
              placeholder="关键词，如：固态电池"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') create();
              }}
              style={{ flex: 1, minWidth: 200 }}
              maxLength={60}
            />
            <select
              value={interval}
              onChange={(e) => setInterval(Number(e.target.value) as TrackInterval)}
              aria-label="自动追踪间隔"
              style={{ border: '1.5px solid var(--line)', background: 'var(--paper)', padding: '9px 12px', fontFamily: 'var(--mono)', fontSize: 13 }}
            >
              {INTERVALS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <button className="btn btn-primary" disabled={busy || !keyword.trim()} onClick={create}>
              <span className="btn-stack">
                <span>{busy ? '✦ 抓取分析中…' : '✦ 立项追踪'}</span>
                <small>抓取 + AI 分析后自动进入专题</small>
              </span>
            </button>
          </div>
        </section>

        <section className="panel">
          <h3>追踪中的专题</h3>
          <table className="ledger">
            <thead>
              <tr>
                <th>关键词</th>
                <th>素材</th>
                <th>报告</th>
                <th>自动追踪</th>
                <th>更新</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {topics.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ color: 'var(--ink-faint)' }}>暂无专题，在上方输入关键词立项</td>
                </tr>
              )}
              {topics.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link href={`/topics/${t.id}`} style={{ fontWeight: 700, textDecoration: 'underline', textDecorationColor: 'var(--red)', textUnderlineOffset: 3 }}>
                      {t.keyword}
                    </Link>
                    {t.lastError && <div style={{ fontSize: 11, color: 'var(--red)', fontFamily: 'var(--mono)' }}>上次失败：{t.lastError.slice(0, 40)}</div>}
                  </td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{t.itemCount} 条</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>
                    {t.hasReport ? `${t.hotspotCount} 个热点${t.reportMock ? ' · Mock' : ''}` : '—'}
                  </td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>
                    <i className={`lamp ${t.autoTrack ? 'ok' : 'off'}`} /> {t.autoTrack ? `开 · ${t.trackIntervalHours}h` : '关'}
                  </td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{formatTime(t.updatedAt)}</td>
                  <td>
                    <Link className="mini-btn" href={`/topics/${t.id}`}>进入</Link>
                    <button className="mini-btn" onClick={() => remove(t.id, t.keyword)}>撤下</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="hint" style={{ marginTop: 14, color: 'var(--ink-faint)', fontSize: 12, fontFamily: 'var(--mono)' }}>
            自动追踪仅在 dev/start 服务运行时生效；关机即停，重启后按 lastTrackedAt 补跑到期专题
          </p>
        </section>
      </main>
    </>
  );
}

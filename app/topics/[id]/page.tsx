'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Masthead } from '../../_components/Masthead';
import type { Hotspot, KeywordTopic, RawItem, TrackInterval } from '@/lib/types';

const INTERVALS: TrackInterval[] = [1, 6, 12, 24];

type TopicView = KeywordTopic;

function formatTime(ts?: number): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function HotspotCard({ hotspot }: { hotspot: Hotspot }) {
  return (
    <article className="panel" style={{ marginBottom: 0 }}>
      <div className="story-top"><span>No.{hotspot.rank} · {hotspot.category}</span><span>热度 {hotspot.heat}/100</span></div>
      <h3 style={{ fontSize: 18, lineHeight: 1.55, margin: '12px 0 8px' }}>{hotspot.title}</h3>
      <p className="story-summary">{hotspot.summary || '暂无摘要'}</p>
      {hotspot.entities.length > 0 && <div style={{ marginTop: 12 }}>{hotspot.entities.map((entity) => <span key={entity} className="entity-chip">{entity}</span>)}</div>}
      {hotspot.relevanceReason && <p className="story-meta">相关度 {hotspot.relevance ?? 0}/100 · {hotspot.relevanceReason}</p>}
    </article>
  );
}

function ItemRow({ item }: { item: RawItem }) {
  return (
    <tr>
      <td style={{ fontFamily: 'var(--mono)', fontSize: 11, whiteSpace: 'nowrap' }}>{item.sourceName}</td>
      <td>
        {item.url ? <a href={item.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', textDecorationColor: 'var(--red)' }}>{item.title}</a> : item.title}
        {item.text && <div style={{ color: 'var(--ink-faint)', fontSize: 12, lineHeight: 1.6, marginTop: 3 }}>{item.text}</div>}
      </td>
      <td style={{ fontFamily: 'var(--mono)', fontSize: 11, whiteSpace: 'nowrap' }}>{formatTime(item.publishedAt ?? item.fetchedAt)}</td>
    </tr>
  );
}

export default function TopicDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [topic, setTopic] = useState<TopicView | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetch(`/api/topics/${(await params).id}`).then((r) => r.json());
      if (data.ok) setTopic(data.topic);
      else setNotice({ text: data.error, ok: false });
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : String(error), ok: false });
    }
  }, [params]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const timer = setInterval(load, 30_000);
    return () => clearInterval(timer);
  }, [load]);

  const action = async (kind: 'collect' | 'analyze') => {
    if (!topic) return;
    setBusy(kind);
    setNotice(null);
    try {
      const data = await fetch(`/api/topics/${topic.id}/${kind}`, { method: 'POST' }).then((r) => r.json());
      if (!data.ok) throw new Error(data.error);
      setNotice({
        text: kind === 'collect' ? `抓取完成：新增 ${data.added} 条，当前素材 ${data.totalItems} 条` : `分析完成：识别 ${data.hotspots} 个热点（${data.mock ? 'Mock 简报' : 'AI 简报'}）`,
        ok: true,
      });
      await load();
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : String(error), ok: false });
    } finally {
      setBusy(null);
    }
  };

  const updateTracking = async (body: { autoTrack?: boolean; trackIntervalHours?: number }) => {
    if (!topic) return;
    try {
      const data = await fetch(`/api/topics/${topic.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update', ...body }) }).then((r) => r.json());
      if (!data.ok) throw new Error(data.error);
      await load();
      setNotice({ text: body.autoTrack === false ? '已暂停自动追踪' : '自动追踪设置已保存', ok: true });
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : String(error), ok: false });
    }
  };

  if (!topic) {
    return <><Masthead /><main className="page"><div className="empty-state">专题加载中…</div></main></>;
  }

  const report = topic.report;
  // 详情页只负责展示：抓取与 AI 分析都在立项、再次抓取或自动追踪中完成。
  const refreshing = busy !== null;
  return (
    <>
      <Masthead />
      <main className="page">
        {notice && <div className={`notice ${notice.ok ? 'ok' : ''}`}>{notice.text}</div>}
        <div style={{ marginBottom: 18 }}><Link href="/topics" className="mini-btn">← 返回专题列表</Link></div>

        <section className="extra" style={{ textAlign: 'left' }}>
          <div className="extra-kicker"><span className="pulse-dot" aria-hidden /> 专题追踪 · SPECIAL DOSSIER</div>
          <h2 className="extra-title story-underline" style={{ cursor: 'default' }}>{topic.keyword}</h2>
          <p className="extra-summary">定向抓取搜索引擎与微博站内信息，素材和分析报告独立于头版保存。</p>
          <p className="story-meta">素材 {topic.items.length} 条 · 最近更新 {formatTime(topic.updatedAt)} · {report ? `报告 ${formatTime(report.createdAt)}` : '尚未生成报告'}</p>
        </section>

        <section className="panel">
          <h3>自动追踪 — 定时设置</h3>
          <div className="toolbar">
            <label style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>
              <input type="checkbox" checked={topic.autoTrack} onChange={(e) => updateTracking({ autoTrack: e.target.checked })} style={{ marginRight: 8 }} />
              {topic.autoTrack ? '自动追踪已启用' : '自动追踪已暂停'}
            </label>
            <select value={topic.trackIntervalHours} onChange={(e) => updateTracking({ trackIntervalHours: Number(e.target.value) })} aria-label="自动追踪间隔" style={{ border: '1.5px solid var(--line)', background: 'var(--paper)', padding: '8px 10px', fontFamily: 'var(--mono)' }}>
              {INTERVALS.map((hours) => <option key={hours} value={hours}>每 {hours} 小时</option>)}
            </select>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-faint)' }}>
              {topic.autoTrack ? `下次检查约 ${formatTime((topic.lastTrackedAt ?? Date.now()) + topic.trackIntervalHours * 3_600_000)}` : '开启后由应用在运行期间自动抓取 + 分析'}
            </span>
          </div>
          {topic.lastError && <div className="notice">上次自动追踪失败：{topic.lastError}</div>}
          <p className="hint">调度器每分钟检查一次到期专题；应用关闭、电脑休眠期间不会执行，重新启动后会继续检查。</p>
        </section>

        <div className="toolbar">
          <button className="btn" disabled={busy !== null} onClick={() => action('collect')}><span className="btn-stack"><span>{busy === 'collect' ? '⟳ 抓取中…' : '⟳ 再次抓取'}</span><small>5 路来源 · 增量去重</small></span></button>
          <button className="btn btn-primary" disabled={busy !== null || topic.items.length === 0} onClick={() => action('analyze')}><span className="btn-stack"><span>{busy === 'analyze' ? '✦ 分析中…' : '✦ AI 分析专题'}</span><small>独立报告 · 不影响头版刊号</small></span></button>
        </div>

        {report && <section><div className="section-title">专题报告 <span className="count">{report.mock ? 'Mock 规则' : report.model} · {report.hotspots.length} 条</span></div><div className="grid grid-cols-1 gap-5 md:grid-cols-2">{report.hotspots.map((hotspot) => <HotspotCard key={hotspot.id} hotspot={hotspot} />)}</div></section>}

        <section className="panel" style={{ marginTop: 30 }}>
          <h3>素材剪报 — {topic.items.length} 条</h3>
          {topic.items.length === 0 ? <div className="empty-state" style={{ padding: '28px 12px' }}>还没有素材，先点击「再次抓取」</div> : <div style={{ overflowX: 'auto' }}><table className="ledger"><thead><tr><th>来源</th><th>标题 / 摘要</th><th>时间</th></tr></thead><tbody>{topic.items.slice().reverse().map((item) => <ItemRow key={item.id} item={item} />)}</tbody></table></div>}
        </section>
      </main>
    </>
  );
}

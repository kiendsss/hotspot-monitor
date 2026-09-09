'use client';

import { useEffect, useState } from 'react';
import type { Hotspot, RawItem, Snapshot } from '@/lib/types';

const TREND_STAMP: Record<string, { text: string; cls: string }> = {
  new: { text: '新上榜', cls: 'new' },
  up: { text: '↑走热', cls: 'up' },
  down: { text: '↓降温', cls: 'down' },
  flat: { text: '持平', cls: '' },
};

function TrendStamp({ trend, delta }: { trend?: string; delta?: number }) {
  if (!trend) return null;
  const conf = TREND_STAMP[trend];
  if (!conf) return null;
  const suffix =
    typeof delta === 'number' && trend !== 'new' && delta !== 0
      ? ` ${delta > 0 ? '+' : ''}${delta}`
      : '';
  return (
    <span className={`stamp ${conf.cls}`}>
      {conf.text}
      {suffix}
    </span>
  );
}

function ClippingDrawer({
  hotspot,
  onClose,
}: {
  hotspot: Hotspot;
  onClose: () => void;
}) {
  const [linked, setLinked] = useState<RawItem[] | null>(null);

  useEffect(() => {
    if (hotspot.itemIds.length === 0) {
      setLinked([]);
      return;
    }
    fetch(`/api/items?ids=${encodeURIComponent(hotspot.itemIds.join(','))}`)
      .then((r) => r.json())
      .then((d) => (d.ok ? setLinked(d.items) : setLinked([])))
      .catch(() => setLinked([]));
  }, [hotspot]);

  const published = new Date().toLocaleString('zh-CN');

  return (
    <>
      <div className="drawer-mask" onClick={onClose} />
      <aside className="drawer">
        <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--red)', letterSpacing: '0.3em' }}>
          ✂ 剪报 CLIPPING
        </div>
        <h2>{hotspot.title}</h2>
        <div className="drawer-meta">
          No.{hotspot.rank} · {hotspot.category} · 热度 {hotspot.heat}/100 · 情感「{hotspot.sentiment}」
          {hotspot.trend && <TrendStamp trend={hotspot.trend} delta={hotspot.delta} />}
        </div>
        <p className="drawer-summary">{hotspot.summary || '（本条为 Mock 规则简报，暂无摘要。接入 AI 后自动补全。）'}</p>
        {hotspot.entities.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {hotspot.entities.map((e) => (
              <span key={e} className="entity-chip">{e}</span>
            ))}
          </div>
        )}
        <div className="section-title" style={{ marginBottom: 10 }}>来源线索</div>
        {linked === null && <div className="source-line">检索存档中…</div>}
        {linked?.length === 0 && <div className="source-line">（原始条目已滚动淘汰）</div>}
        {linked?.map((item) => (
          <div key={item.id} className="source-line">
            [{item.sourceName}] {item.title}
            {item.heat ? ` · 热度 ${item.heat}` : ''}
            {item.url && (
              <>
                {' '}
                <a href={item.url} target="_blank" rel="noreferrer">原文↗</a>
              </>
            )}
          </div>
        ))}
        <div style={{ marginTop: 18, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)' }}>
          剪报时间 {published}
        </div>
      </aside>
    </>
  );
}

export function GazetteBoard() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [items, setItems] = useState<RawItem[]>([]);
  const [selected, setSelected] = useState<Hotspot | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);

  const loadLatest = () => {
    fetch('/api/snapshots?limit=1')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.snapshots.length > 0) {
          return fetch(`/api/snapshots?id=${d.snapshots[0].id}`).then((r) => r.json());
        }
        return null;
      })
      .then((d) => d?.ok && setSnapshot(d.snapshot))
      .catch(() => {});
  };

  useEffect(() => {
    loadLatest();
    fetch('/api/items?limit=60')
      .then((r) => r.json())
      .then((d) => d.ok && setItems(d.items))
      .catch(() => {});
  }, []);

  const runAction = async (label: string, path: string, done: (data: Record<string, unknown>) => string) => {
    setBusy(label);
    setNotice(null);
    try {
      const res = await fetch(path, { method: 'POST' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? '操作失败');
      setNotice({ text: done(data), ok: true });
      loadLatest();
      const itemsRes = await fetch('/api/items?limit=60');
      const itemsData = await itemsRes.json();
      if (itemsData.ok) setItems(itemsData.items);
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : String(error), ok: false });
    } finally {
      setBusy(null);
    }
  };

  const headline = snapshot?.hotspots[0];
  const rest = snapshot?.hotspots.slice(1) ?? [];

  return (
    <>
      {notice && <div className={`notice ${notice.ok ? 'ok' : ''}`}>{notice.text}</div>}
      <div className="toolbar">
        <button
          className="btn"
          disabled={busy !== null}
          onClick={() => runAction('collect', '/api/collect', (d) => `采集完成：新增 ${d.added} 条，池内共 ${d.totalItems} 条`)}
        >
          {busy === 'collect' ? '采集中…' : '① 走访采集'}
        </button>
        <button
          className="btn btn-primary"
          disabled={busy !== null}
          onClick={() => runAction('analyze', '/api/analyze', (d) => `第 ${d.issue} 期付印：识别 ${d.hotspots} 个热点（${d.mock ? 'Mock 简报' : 'AI 简报'}）`)}
        >
          {busy === 'analyze' ? '分析中…' : '② 编辑付印'}
        </button>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-faint)' }}>
          {snapshot ? `当前为第 ${snapshot.issue} 期 · ${snapshot.mock ? 'Mock 规则' : snapshot.model}` : '尚无刊号，请先采集再付印'}
        </span>
      </div>

      {!snapshot && (
        <div className="extra">
          <div className="extra-kicker">创刊号筹备中</div>
          <p style={{ color: 'var(--ink-soft)' }}>
            点击上方「走访采集」抓取全网热榜，再点「编辑付印」生成第一期热点日报。
          </p>
        </div>
      )}

      {headline && (
        <section className="extra">
          <div className="extra-kicker">号外 · 头版头条</div>
          <div className="extra-title story-underline" onClick={() => setSelected(headline)}>
            {headline.title}
          </div>
          <p className="extra-summary">{headline.summary}</p>
          <div style={{ marginTop: 10 }}>
            <TrendStamp trend={headline.trend} delta={headline.delta} />
          </div>
        </section>
      )}

      {rest.length > 0 && (
        <>
          <hr className="section-rule" />
          <div className="section-title">热点版面 · 第 {snapshot?.issue} 期</div>
          <div className="columns">
            {rest.map((hotspot) => (
              <article key={hotspot.id} className="story">
                <div className="story-top">
                  <span>{hotspot.category}</span>
                  <span>热度 {hotspot.heat}</span>
                </div>
                <h3 className="story-title" onClick={() => setSelected(hotspot)}>
                  <span className="rank-no">No.{hotspot.rank}</span>
                  <span className="story-underline">{hotspot.title}</span>
                  <TrendStamp trend={hotspot.trend} delta={hotspot.delta} />
                </h3>
                <p className="story-summary">{hotspot.summary}</p>
              </article>
            ))}
          </div>
        </>
      )}

      {selected && <ClippingDrawer hotspot={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

export function Ticker({ items }: { items: RawItem[] }) {
  const doubled = [...items, ...items];
  return (
    <div className="ticker-wrap">
      <div className="ticker">
        {doubled.map((item, index) => (
          <span key={`${item.id}_${index}`}>
            <b>[{item.sourceName}]</b> {item.title}
          </span>
        ))}
        {items.length === 0 && <span>暂无存稿，去「采编部」投稿或点「走访采集」。</span>}
      </div>
    </div>
  );
}

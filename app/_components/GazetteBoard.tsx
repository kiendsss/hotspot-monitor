'use client';

import { useEffect, useState } from 'react';
import type { Hotspot, HotspotCategory, RawItem, Snapshot } from '@/lib/types';
import { HoverBorderGradient } from './ui/hover-border-gradient';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { WobbleCard } from './ui/wobble-card';
import { FocusCards, FocusCard } from './ui/focus-cards';

const TREND_STAMP: Record<string, { text: string; cls: string }> = {
  new: { text: '新上榜', cls: 'new' },
  up: { text: '↑走热', cls: 'up' },
  down: { text: '↓降温', cls: 'down' },
  flat: { text: '持平', cls: '' },
};

type TrendFilter = 'all' | 'new' | 'up' | 'down';

const FILTER_LABEL: Record<TrendFilter, string> = {
  all: '全部',
  new: '新上榜',
  up: '↑ 走热',
  down: '↓ 降温',
};

const CATEGORY_ORDER: HotspotCategory[] = ['社会', '科技', '财经', '国际', '娱乐', '体育', '健康', '其他'];

function groupByCategory(hotspots: Hotspot[]) {
  return CATEGORY_ORDER.map((cat) => ({ cat, items: hotspots.filter((h) => h.category === cat) })).filter(
    (g) => g.items.length > 0,
  );
}

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

function buildHotspotText(hotspot: Hotspot) {
  const parts = [`【热点观察哨】${hotspot.title}`];
  if (hotspot.summary) parts.push(hotspot.summary);
  parts.push(`—— 第 ${hotspot.rank} 位 · ${hotspot.category} · 热度 ${hotspot.heat}/100`);
  return parts.join('\n');
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lh: number,
  maxLines: number,
) {
  const chars = [...text];
  const lines: string[] = [];
  let line = '';
  for (const ch of chars) {
    if (ctx.measureText(line + ch).width > maxW) {
      lines.push(line);
      line = ch;
      if (lines.length === maxLines) break;
    } else {
      line += ch;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.join('').length < chars.length && lines.length > 0) {
    const last = lines[lines.length - 1];
    lines[lines.length - 1] = [...last].slice(0, -1).join('') + '…';
  }
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lh));
  return y + lines.length * lh;
}

/** 本地 canvas 生成报纸风分享海报（无外部依赖） */
function renderPoster(h: Hotspot, issue?: number): string {
  const W = 1000;
  const H = 560;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 纸底 + 细网点
  ctx.fillStyle = '#f4efe4';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(26,23,18,0.05)';
  for (let y = 8; y < H; y += 8) {
    for (let x = 8; x < W; x += 8) ctx.fillRect(x, y, 1.2, 1.2);
  }

  // 双细线报框
  ctx.strokeStyle = '#1a1712';
  ctx.lineWidth = 5;
  ctx.strokeRect(12, 12, W - 24, H - 24);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(22, 22, W - 44, H - 44);

  // 朱红号外章
  ctx.fillStyle = '#b3271e';
  ctx.fillRect(42, 46, 268, 40);
  ctx.fillStyle = '#f4efe4';
  ctx.font = 'bold 21px monospace';
  ctx.textBaseline = 'middle';
  ctx.fillText(`号外 · 第 ${issue ?? '—'} 期`, 60, 67);
  ctx.textBaseline = 'alphabetic';

  // 标题与摘要
  ctx.fillStyle = '#1a1712';
  ctx.font = 'bold 46px "Noto Serif SC", serif';
  let y = wrapText(ctx, h.title, 42, 158, W - 84, 60, 3);
  if (h.summary) {
    ctx.fillStyle = '#4a4438';
    ctx.font = '21px "Noto Serif SC", serif';
    y = wrapText(ctx, h.summary, 42, y + 40, W - 84, 34, 4);
  }

  // 页脚
  ctx.fillStyle = '#b3271e';
  ctx.font = 'bold 17px monospace';
  ctx.fillText(`No.${h.rank} · ${h.category} · 热度 ${h.heat}/100`, 42, H - 56);
  ctx.fillStyle = '#857d6c';
  ctx.font = '15px monospace';
  const foot = `热点观察哨 · 热频日报 · ${new Date().toLocaleDateString('zh-CN')}`;
  ctx.fillText(foot, W - 42 - ctx.measureText(foot).width, H - 56);

  return canvas.toDataURL('image/png');
}

function ShareRail({
  headline,
  onCopyHeadline,
  onCopyTop5,
  onPoster,
}: {
  headline?: Hotspot;
  onCopyHeadline: () => void;
  onCopyTop5: () => void;
  onPoster: (h: Hotspot) => void;
}) {
  if (!headline) return null;
  return (
    <div className="share-rail" aria-label="快速分享栏">
      <button className="share-btn" onClick={onCopyHeadline} title="复制头条文字，直接粘贴到群聊/朋友圈">
        ✂ 复制头条
      </button>
      <button className="share-btn" onClick={onCopyTop5} title="复制前 5 条热点清单">
        ≡ 复制 Top5
      </button>
      <button className="share-btn" onClick={() => onPoster(headline)} title="生成报纸风分享海报">
        ▣ 生成海报
      </button>
    </div>
  );
}

function ClippingDrawer({
  hotspot,
  onClose,
  onFeedback,
  onPoster,
}: {
  hotspot: Hotspot;
  onClose: () => void;
  onFeedback: (text: string, ok: boolean) => void;
  onPoster: (h: Hotspot) => void;
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
  const firstUrl = linked?.find((i) => i.url)?.url;

  const copyClipping = async () => {
    const lines = [buildHotspotText(hotspot)];
    if (linked && linked.length > 0) {
      lines.push(
        '来源：' +
          linked
            .filter((i) => i.url)
            .map((i) => `${i.sourceName} ${i.url}`)
            .join(' ｜ '),
      );
    }
    const ok = await copyText(lines.join('\n'));
    onFeedback(ok ? '剪报已复制（含来源链接）' : '复制失败，请手动选择文本', ok);
  };

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
        <div className="drawer-actions">
          <button className="btn" onClick={copyClipping}>
            ✂ 复制本条剪报
          </button>
          <button className="btn" onClick={() => onPoster(hotspot)}>
            ▣ 生成海报
          </button>
          {firstUrl && (
            <a className="btn" href={firstUrl} target="_blank" rel="noreferrer">
              ↗ 打开原文
            </a>
          )}
          <button className="btn" onClick={onClose}>
            收起剪报
          </button>
        </div>
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
  const [filter, setFilter] = useState<TrendFilter>('all');
  const [poster, setPoster] = useState<{ url: string; name: string } | null>(null);

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
  const restAll = snapshot?.hotspots.slice(1) ?? [];
  const rest = filter === 'all' ? restAll : restAll.filter((h) => h.trend === filter);
  const countOf = (key: TrendFilter) =>
    key === 'all' ? snapshot?.hotspots.length ?? 0 : snapshot?.hotspots.filter((h) => h.trend === key).length ?? 0;

  const feedback = (text: string, ok: boolean) => setNotice({ text, ok });

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    if (!selected && !poster) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (poster) setPoster(null);
        else setSelected(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selected, poster]);

  useEffect(() => {
    const locked = !!selected || !!poster;
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [selected, poster]);

  const copyHeadline = async () => {
    if (!headline) return;
    const ok = await copyText(buildHotspotText(headline));
    feedback(ok ? '头条已复制，去粘贴分享吧' : '复制失败，请手动选择文本', ok);
  };

  const copyTop5 = async () => {
    if (!snapshot) return;
    const text = snapshot.hotspots
      .slice(0, 5)
      .map((h, i) => `${i + 1}. ${h.title}（${h.category} · 热度 ${h.heat}）`)
      .join('\n');
    const ok = await copyText(`【热点观察哨 · Top5】\n${text}`);
    feedback(ok ? 'Top5 榜单已复制' : '复制失败，请手动选择文本', ok);
  };

  const makePoster = (h: Hotspot) => {
    const url = renderPoster(h, snapshot?.issue);
    if (url) setPoster({ url, name: `热点海报-第${snapshot?.issue ?? 'x'}期-No${h.rank}.png` });
  };

  return (
    <>
      {notice && <div className={`notice ${notice.ok ? 'ok' : ''}`}>{notice.text}</div>}
      <div className="toolbar">
        <Tooltip>
          <TooltipTrigger>
            <button
              className="btn"
              disabled={busy !== null}
              onClick={() => runAction('collect', '/api/collect', (d) => `采集完成：新增 ${d.added} 条，池内共 ${d.totalItems} 条`)}
            >
              <span className="btn-stack">
                <span>{busy === 'collect' ? '⟳ 正在抓取热榜…' : '⟳ 刷新热点'}</span>
                <small>走访采集 · 抓微博/知乎/百度/GitHub+RSS</small>
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent>一键抓取各平台热榜，新内容并入素材池</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger>
            <HoverBorderGradient
              containerClassName="group"
              className="!tracking-[0.2em]"
              disabled={busy !== null}
              onClick={() =>
                runAction('analyze', '/api/analyze', (d) => `第 ${d.issue} 期付印：识别 ${d.hotspots} 个热点（${d.mock ? 'Mock 简报' : 'AI 简报'}）`)
              }
            >
              <span className="btn-stack">
                <span>{busy === 'analyze' ? '✦ 正在生成日报…' : '✦ 生成日报'}</span>
                <small>编辑付印 · AI 聚合识别热点 刊号+1</small>
              </span>
            </HoverBorderGradient>
          </TooltipTrigger>
          <TooltipContent>把素材池聚合成新一期热点日报（刊号 +1）</TooltipContent>
        </Tooltip>

        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-faint)' }}>
          {snapshot ? `当前为第 ${snapshot.issue} 期 · ${snapshot.mock ? 'Mock 规则' : snapshot.model}` : '尚无刊号：先「刷新热点」再「生成日报」'}
        </span>
      </div>

      {snapshot && (
        <div className="tabs" role="tablist" aria-label="热点分级筛选">
          {(Object.keys(FILTER_LABEL) as TrendFilter[]).map((key) => (
            <button
              key={key}
              role="tab"
              aria-selected={filter === key}
              className={`tab ${filter === key ? 'active' : ''}`}
              onClick={() => setFilter(key)}
            >
              {FILTER_LABEL[key]}
              <span className="n">{countOf(key)}</span>
            </button>
          ))}
        </div>
      )}

      {!snapshot && (
        <div className="empty-state">
          <div className="empty-kicker">创刊号筹备中</div>
          <p>
            第一步：点上方「⟳ 刷新热点」抓取全网热榜入池；<br />
            第二步：点「✦ 生成日报」让 AI 聚合成第一期热点日报。
          </p>
        </div>
      )}

      {snapshot && !headline && (
        <div className="empty-state" aria-busy="true">
          <div className="empty-kicker">正在开印…</div>
          <p>日报数据加载中，请稍候；若长时间无响应，请检查 API 服务。</p>
        </div>
      )}

      {headline && (
        <section className="extra">
          <div className="extra-kicker">
            <span className="pulse-dot" aria-hidden />
            号外 · 头版头条
          </div>
          <div className="extra-title story-underline" onClick={() => setSelected(headline)}>
            {headline.title}
          </div>
          <p className="extra-summary">{headline.summary}</p>
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <TrendStamp trend={headline.trend} delta={headline.delta} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)' }}>点击标题查看剪报 / 右侧可一键分享</span>
          </div>
        </section>
      )}

      {rest.length > 0 && (() => {
        const grouped = groupByCategory(rest);
        return (
          <>
            <hr className="section-rule" />
            <div className="section-title">
              热点版面 · 第 {snapshot?.issue} 期
              <span className="count">{rest.length} 条 · {grouped.length} 版</span>
            </div>
            {grouped.length > 1 && (
              <nav className="plate-toc" aria-label="分区快速导航">
                {grouped.map(({ cat, items: g }) => (
                  <a
                    key={cat}
                    href={`#plate-${cat}`}
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(`plate-${cat}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                  >
                    {cat}
                    <span>{g.length}</span>
                  </a>
                ))}
              </nav>
            )}
            {grouped.map(({ cat, items: group }) => {
            const [lead, ...tail] = group;
            return (
              <section key={cat} id={`plate-${cat}`} className="plate" aria-label={`${cat}版块`}>
                <header className="plate-hd">
                  <h2>
                    <i aria-hidden />
                    {cat}
                  </h2>
                  <span className="more">{group.length} 条 · 热度 {group.reduce((s, h) => s + h.heat, 0)}</span>
                </header>
                <div className="plate-body">
                  <div style={{ borderLeft: '3px solid var(--red)', paddingLeft: 14, marginBottom: 2 }}>
                    <WobbleCard containerClassName="bg-[var(--paper)]">
                      <div className="lead-meta">
                        <span>No.{lead.rank} · 头条</span>
                        <span>热度 {lead.heat}/100</span>
                      </div>
                      <h3 className="lead-title story-underline" onClick={() => setSelected(lead)}>
                        {lead.title}
                        <TrendStamp trend={lead.trend} delta={lead.delta} />
                      </h3>
                      <p className="lead-summary">{lead.summary}</p>
                    </WobbleCard>
                  </div>
                  {tail.length > 0 && (
                    <FocusCards className="!grid-cols-1 md:!grid-cols-2 lg:!grid-cols-3">
                      {tail.map((hotspot) => (
                        <FocusCard key={hotspot.id}>
                          <div className="story-top">
                            <span>No.{hotspot.rank}</span>
                            <span>热度 {hotspot.heat}</span>
                          </div>
                          <h3
                            className="story-title"
                            onClick={() => setSelected(hotspot)}
                          >
                            <span className="story-underline min-w-0 flex-1">{hotspot.title}</span>
                            <TrendStamp trend={hotspot.trend} delta={hotspot.delta} />
                          </h3>
                          <p className="story-summary">{hotspot.summary}</p>
                        </FocusCard>
                      ))}
                    </FocusCards>
                  )}
                </div>
              </section>
            );
          })}
          </>
        );
      })()}

      {rest.length === 0 && snapshot && filter !== 'all' && (
        <div className="empty-state" style={{ padding: '26px 16px' }}>
          <p>「{FILTER_LABEL[filter]}」分类下暂时没有热点，切回「全部」看看其他条目。</p>
        </div>
      )}

      <ShareRail
        headline={headline}
        onCopyHeadline={copyHeadline}
        onCopyTop5={copyTop5}
        onPoster={makePoster}
      />

      <div className="share-bottom" aria-label="移动端分享条">
        <button className="share-btn" onClick={copyHeadline}>✂ 头条</button>
        <button className="share-btn" onClick={copyTop5}>≡ Top5</button>
        {headline && (
          <button className="share-btn" onClick={() => makePoster(headline)}>▣ 海报</button>
        )}
      </div>

      {selected && (
        <ClippingDrawer
          hotspot={selected}
          onClose={() => setSelected(null)}
          onFeedback={feedback}
          onPoster={makePoster}
        />
      )}

      {poster && (
        <div className="poster-mask" onClick={() => setPoster(null)}>
          <div className="poster-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.3em', color: 'var(--red)', marginBottom: 10 }}>
              ▣ 分享海报预览 · 手机长按或下载转发
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={poster.url} alt="热点分享海报" />
            <div className="drawer-actions" style={{ justifyContent: 'center', marginBottom: 4 }}>
              <a className="btn btn-primary" href={poster.url} download={poster.name}>
                ⬇ 下载 PNG
              </a>
              <button className="btn" onClick={() => setPoster(null)}>
                关闭预览
              </button>
            </div>
          </div>
        </div>
      )}
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
        {items.length === 0 && <span>暂无存稿，去「采编部」投稿或点「刷新热点」。</span>}
      </div>
    </div>
  );
}

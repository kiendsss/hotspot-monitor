'use client';

import { useCallback, useEffect, useState } from 'react';
import { Masthead } from '../_components/Masthead';
import type { RssFeed } from '@/lib/types';

interface SourceStatus {
  id: string;
  name: string;
  ok: boolean;
  count: number;
  error?: string;
  filteredOut?: number;
}

interface SourceLimit {
  topN: number;
  minHeat: number;
}

const BUILTIN = [
  { key: 'weibo', name: '微博热搜' },
  { key: 'zhihu', name: '知乎热榜' },
  { key: 'baidu', name: '百度热搜' },
  { key: 'github', name: 'GitHub Trending' },
] as const;

export default function SourcesPage() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [limits, setLimits] = useState<Record<string, SourceLimit>>({});
  const [feeds, setFeeds] = useState<RssFeed[]>([]);
  const [rssName, setRssName] = useState('');
  const [rssUrl, setRssUrl] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [postText, setPostText] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);

  const loadAll = useCallback(async () => {
    const [settingsRes, feedsRes] = await Promise.all([
      fetch('/api/settings').then((r) => r.json()),
      fetch('/api/rss').then((r) => r.json()),
    ]);
    if (settingsRes.ok) {
      setEnabled(settingsRes.settings.builtinSources);
      if (settingsRes.settings.sourceLimits) setLimits(settingsRes.settings.sourceLimits);
    }
    if (feedsRes.ok) setFeeds(feedsRes.feeds);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const toggleSource = async (key: string) => {
    const next = { ...enabled, [key]: !enabled[key] };
    setEnabled(next);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ builtinSources: { [key]: next[key] } }),
    });
  };

  const collect = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const data = await fetch('/api/collect', { method: 'POST' }).then((r) => r.json());
      if (!data.ok) throw new Error(data.error);
      const failed = (data.sources as SourceStatus[]).filter((s) => !s.ok);
      const dropped = (data.sources as SourceStatus[]).reduce((sum, s) => sum + (s.filteredOut ?? 0), 0);
      setNotice({
        text: failed.length
          ? `新增 ${data.added} 条；失败源：${failed.map((f) => f.name).join('、')}${dropped > 0 ? `；已滤除榜单尾部 ${dropped} 条` : ''}`
          : `走访完成：新增 ${data.added} 条，池内共 ${data.totalItems} 条${dropped > 0 ? `，已滤除榜单尾部 ${dropped} 条` : ''}`,
        ok: true,
      });
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : String(error), ok: false });
    } finally {
      setBusy(false);
    }
  };

  const rssAction = async (body: Record<string, unknown>, successText: string) => {
    setNotice(null);
    try {
      const data = await fetch('/api/rss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => r.json());
      if (!data.ok) throw new Error(data.error);
      setFeeds(data.feeds);
      setNotice({ text: successText, ok: true });
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : String(error), ok: false });
    }
  };

  const setLimit = (key: string, field: keyof SourceLimit, value: number) => {
    setLimits((prev) => {
      const current: SourceLimit = { topN: prev[key]?.topN ?? 30, minHeat: prev[key]?.minHeat ?? 0 };
      current[field] = value;
      return { ...prev, [key]: current };
    });
  };

  const saveLimits = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const data = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceLimits: limits }),
      }).then((r) => r.json());
      if (!data.ok) throw new Error(data.error);
      setLimits(data.settings.sourceLimits ?? {});
      setNotice({ text: '阈值已保存，下次走访即生效', ok: true });
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : String(error), ok: false });
    } finally {
      setBusy(false);
    }
  };

  const submitPost = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const data = await fetch('/api/items/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: postTitle, text: postText }),
      }).then((r) => r.json());
      if (!data.ok) throw new Error(data.error);
      setPostTitle('');
      setPostText('');
      setNotice({ text: '投稿已入库，可回头版「生成日报」', ok: true });
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : String(error), ok: false });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Masthead />
      <main className="page">
        {notice && <div className={`notice ${notice.ok ? 'ok' : ''}`}>{notice.text}</div>}

        <section className="panel">
          <h3>外勤采集 — 内置榜单</h3>
          <p className="hint" style={{ marginBottom: 14, color: 'var(--ink-faint)', fontSize: 12, fontFamily: 'var(--mono)' }}>
            按需开关榜单源；超出 TopN 或低于最低热度的尾部词条走访时直接滤除，不入池。RSS/手动来稿不受阈值限制，改由搜索引擎佐证把关
          </p>
          <table className="ledger">
            <thead>
              <tr>
                <th>内置榜单源</th>
                <th>保留 TopN</th>
                <th>最低热度</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {BUILTIN.map((s) => (
                <tr key={s.key}>
                  <td>{s.name}</td>
                  <td>
                    <input
                      type="number"
                      min={5}
                      max={50}
                      value={limits[s.key]?.topN ?? ''}
                      placeholder="30"
                      onChange={(e) => setLimit(s.key, 'topN', Number(e.target.value))}
                      style={{ width: 72 }}
                      aria-label={`${s.name}保留条数`}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      step={10000}
                      value={limits[s.key]?.minHeat ?? ''}
                      placeholder="0"
                      onChange={(e) => setLimit(s.key, 'minHeat', Number(e.target.value))}
                      style={{ width: 110 }}
                      aria-label={`${s.name}最低热度`}
                    />
                  </td>
                  <td>
                    <button className="mini-btn" onClick={() => toggleSource(s.key)} aria-label={`切换${s.name}`}>
                      {enabled[s.key] ? '启用中' : '已停用'}
                    </button>
                    <i className={`lamp ${enabled[s.key] ? 'ok' : 'off'}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="toolbar">
            <button className="btn" disabled={busy} onClick={saveLimits}>
              保存阈值
            </button>
            <button className="btn btn-primary" disabled={busy} onClick={collect}>
              <span className="btn-stack">
                <span>{busy ? '⟳ 走访中…' : '⟳ 立即走访'}</span>
                <small>抓取启用源 + 全部启用 RSS</small>
              </span>
            </button>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-faint)' }}>
              走访结果直接入池，回头版即可「生成日报」
            </span>
          </div>
        </section>

        <section className="panel">
          <h3>订阅科（RSS）</h3>
          <p className="hint" style={{ marginBottom: 14, color: 'var(--ink-faint)', fontSize: 12, fontFamily: 'var(--mono)' }}>
            支持任意 RSS/Atom；停用不删除，可随时恢复走访
          </p>
          <table className="ledger">
            <thead>
              <tr>
                <th>名称</th>
                <th>地址</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {feeds.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ color: 'var(--ink-faint)' }}>暂无订阅，在下方粘贴 RSS 地址即可添加</td>
                </tr>
              )}
              {feeds.map((feed) => (
                <tr key={feed.id}>
                  <td>{feed.name}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 12, wordBreak: 'break-all' }}>{feed.url}</td>
                  <td>
                    <button
                      className="mini-btn"
                      onClick={() => rssAction({ action: 'toggle', id: feed.id, enabled: !feed.enabled }, `已${feed.enabled ? '停用' : '启用'}「${feed.name}」`)}
                    >
                      {feed.enabled ? '启用中' : '已停用'}
                    </button>
                    <button
                      className="mini-btn"
                      onClick={() => rssAction({ action: 'remove', id: feed.id }, `已退订「${feed.name}」`)}
                    >
                      退订
                    </button>
                    <i className={`lamp ${feed.enabled ? 'ok' : 'off'}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="toolbar">
            <input
              type="text"
              placeholder="订阅名称（可选）"
              value={rssName}
              onChange={(e) => setRssName(e.target.value)}
              style={{ width: 160 }}
            />
            <input
              type="text"
              placeholder="RSS 地址，如 https://www.solidot.org/index.rss"
              value={rssUrl}
              onChange={(e) => setRssUrl(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              className="btn"
              disabled={!rssUrl}
              onClick={() => rssAction({ action: 'add', name: rssName, url: rssUrl }, '订阅成功').then(() => { setRssName(''); setRssUrl(''); })}
            >
              添加订阅
            </button>
          </div>
        </section>

        <section className="panel">
          <h3>读者来稿（手动投稿）</h3>
          <p className="hint" style={{ marginBottom: 14, color: 'var(--ink-faint)', fontSize: 12, fontFamily: 'var(--mono)' }}>
            粘贴群聊记录/推文/笔记，标题可空（自动截取前 30 字）
          </p>
          <div className="field">
            <label>标题（可选）</label>
            <input type="text" value={postTitle} onChange={(e) => setPostTitle(e.target.value)} placeholder="留空则自动截取正文开头" />
          </div>
          <div className="field">
            <label>正文 / 群聊记录 / 推文等任意文本</label>
            <textarea rows={6} value={postText} onChange={(e) => setPostText(e.target.value)} placeholder="粘贴后点「递交来稿」即入池" />
            <span className="hint">递交后回头版「生成日报」即可把来稿聚合成热点</span>
          </div>
          <button className="btn btn-primary" disabled={busy || !postText.trim()} onClick={submitPost}>
            {busy ? '递交中…' : '递交来稿'}
          </button>
        </section>
      </main>
    </>
  );
}

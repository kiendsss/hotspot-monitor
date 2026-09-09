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
}

const BUILTIN = [
  { key: 'weibo', name: '微博热搜' },
  { key: 'zhihu', name: '知乎热榜' },
  { key: 'baidu', name: '百度热搜' },
  { key: 'github', name: 'GitHub Trending' },
] as const;

export default function SourcesPage() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
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
    if (settingsRes.ok) setEnabled(settingsRes.settings.builtinSources);
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
      setNotice({
        text: failed.length
          ? `新增 ${data.added} 条；失败源：${failed.map((f) => f.name).join('、')}`
          : `走访完成：新增 ${data.added} 条，池内共 ${data.totalItems} 条（5 源全通）`,
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
      setNotice({ text: '投稿已入库，可回头版付印', ok: true });
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
          <h3>外勤采集</h3>
          <table className="ledger">
            <thead>
              <tr>
                <th>内置榜单源</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {BUILTIN.map((s) => (
                <tr key={s.key}>
                  <td>{s.name}</td>
                  <td>
                    <button className="mini-btn" onClick={() => toggleSource(s.key)}>
                      {enabled[s.key] ? '启用中' : '已停用'}
                    </button>
                    <i className={`lamp ${enabled[s.key] ? 'ok' : 'off'}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="toolbar">
            <button className="btn btn-primary" disabled={busy} onClick={collect}>
              {busy ? '走访中…' : '立即走访采集'}
            </button>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-faint)' }}>
              抓取以上启用源 + 全部启用中的 RSS
            </span>
          </div>
        </section>

        <section className="panel">
          <h3>订阅科（RSS）</h3>
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
                  <td colSpan={3} style={{ color: 'var(--ink-faint)' }}>暂无订阅，试试下方快速添加</td>
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
              style={{ width: 160, border: '1.5px solid var(--line)', background: 'var(--paper)', padding: '7px 10px', fontFamily: 'var(--serif)' }}
            />
            <input
              type="text"
              placeholder="RSS 地址，如 https://www.solidot.org/index.rss"
              value={rssUrl}
              onChange={(e) => setRssUrl(e.target.value)}
              style={{ flex: 1, border: '1.5px solid var(--line)', background: 'var(--paper)', padding: '7px 10px', fontFamily: 'var(--serif)' }}
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
          <div className="field">
            <label>标题（可选，留空自动截取）</label>
            <input type="text" value={postTitle} onChange={(e) => setPostTitle(e.target.value)} />
          </div>
          <div className="field">
            <label>正文 / 群聊记录 / 推文等任意文本</label>
            <textarea rows={6} value={postText} onChange={(e) => setPostText(e.target.value)} />
          </div>
          <button className="btn btn-primary" disabled={busy || !postText.trim()} onClick={submitPost}>
            {busy ? '递交中…' : '递交来稿'}
          </button>
        </section>
      </main>
    </>
  );
}

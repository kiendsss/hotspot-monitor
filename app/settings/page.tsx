'use client';

import { useEffect, useState } from 'react';
import { Masthead } from '../_components/Masthead';

interface SettingsView {
  model: string;
  mockMode: boolean;
  hasKey: boolean;
  openrouterKey?: string;
}

const PRESET_MODELS = [
  'deepseek-chat',
  'deepseek-reasoner',
  'deepseek/deepseek-chat',
  'qwen/qwen-2.5-72b-instruct',
  'google/gemini-2.0-flash-001',
  'openai/gpt-4.1-mini',
  'anthropic/claude-sonnet-4.5',
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsView | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [model, setModel] = useState('');
  const [mockMode, setMockMode] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setSettings(d.settings);
          setModel(d.settings.model);
          setMockMode(d.settings.mockMode);
        }
      })
      .catch(() => {});
  }, []);

  const save = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const body: Record<string, unknown> = { model, mockMode };
      if (keyInput.trim()) body.openrouterKey = keyInput.trim();
      const data = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => r.json());
      if (!data.ok) throw new Error(data.error);
      setSettings(data.settings);
      setKeyInput('');
      setNotice({ text: '设置已保存', ok: true });
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : String(error), ok: false });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Masthead />
      <main className="page" style={{ maxWidth: 760 }}>
        {notice && <div className={`notice ${notice.ok ? 'ok' : ''}`}>{notice.text}</div>}

        <section className="panel">
          <h3>AI 印房 — 模型与密钥</h3>
          <div className="field">
            <label>API Key {settings?.hasKey ? `（已存 ${settings.openrouterKey}）` : '（未设置：当前只能用 Mock 规则简报）'}</label>
            <input
              type="password"
              placeholder="sk-...（DeepSeek 官方）或 sk-or-v1-...（OpenRouter）"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
            />
            <span className="hint">
              Key 仅保存在本机 data/settings.json，由服务端持有，前端只显示脱敏值。按前缀自动路由：sk- → DeepSeek 官方，sk-or-v1- → OpenRouter。
            </span>
          </div>
          <div className="field">
            <label>模型</label>
            <select value={model} onChange={(e) => setModel(e.target.value)}>
              {PRESET_MODELS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
              {!PRESET_MODELS.includes(model) && <option value={model}>{model}</option>}
            </select>
            <span className="hint">生成日报时由该模型聚合识别热点；不选则使用默认 deepseek-chat</span>
          </div>
          <div className="field">
            <label>
              <input
                type="checkbox"
                checked={mockMode}
                onChange={(e) => setMockMode(e.target.checked)}
                style={{ marginRight: 8 }}
              />
              Mock 模式（勾选 = 不调 AI，用规则简报；取消勾选且已存 Key = 真实 AI 分析）
            </label>
          </div>
          <button className="btn btn-primary" disabled={busy} onClick={save}>
            {busy ? '保存中…' : '保存设置'}
          </button>
          <p style={{ marginTop: 14, fontSize: 13, color: 'var(--ink-faint)', lineHeight: 1.8 }}>
            获取 Key：platform.deepseek.com 或 openrouter.ai/keys
          </p>
        </section>

        <section className="panel">
          <h3>流程说明</h3>
          <p style={{ fontSize: 14, lineHeight: 2.1, color: 'var(--ink-soft)' }}>
            头版「⟳ 刷新热点」= 抓取榜单/RSS 入素材池（同采编部「立即走访」）；<br />
            头版「✦ 生成日报」= AI 聚合识别热点，生成新一期并对比上期趋势，刊号 +1；<br />
            点任意热点标题可查看剪报（摘要+来源），抽屉内可一键复制分享。
          </p>
        </section>
      </main>
    </>
  );
}

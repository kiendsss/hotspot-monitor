'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { RawItem } from '@/lib/types';
import { Masthead } from './_components/Masthead';
import { GazetteBoard, Ticker } from './_components/GazetteBoard';

export default function Home() {
  const [items, setItems] = useState<RawItem[]>([]);
  const [mockMode, setMockMode] = useState(true);

  useEffect(() => {
    const load = () =>
      fetch('/api/items?limit=40')
        .then((r) => r.json())
        .then((d) => d.ok && setItems(d.items))
        .catch(() => {});
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => d.ok && setMockMode(d.effectiveMock ?? d.mockMode ?? true))
      .catch(() => {});
    load();
    const timer = setInterval(load, 60_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <Masthead />
      <Ticker items={items} />
      <main className="page">
        {/* 导语牌：四步开印（含专题追踪）+ 真实 AI 提示（Mock 时才强调 Key 入口） */}
        <section className="howto" aria-label="如何使用">
          <div className="howto-hd">
            <span className="kicker">本期导读 · 如何开印</span>
            <span className="sub">四步玩转 / 约两分钟</span>
          </div>
          <ol className="howto-steps">
            <li>
              <span>
                <b>① 走访采集</b>
                点下方「⟳ 刷新热点」，抓微博 / 知乎 / 百度 / GitHub / RSS 入素材池。
              </span>
            </li>
            <li>
              <span>
                <b>② 编辑付印</b>
                点「✦ 生成日报」，{mockMode ? '当前为 Mock 规则简报' : 'AI 正在值班'}，即出一期带刊号的热点日报。
              </span>
            </li>
            <li>
              <span>
                <b>③ 剪报分享</b>
                点任意标题看剪报抽屉，可复制 Top5 或生成报纸风海报。
                {mockMode ? (
                  <>
                    {' '}想要真实 AI？去 <Link className="key-link" href="/settings">印务设置</Link> 填 Key。
                  </>
                ) : (
                  <> 当前 AI 已值班，日报为真实模型产出。</>
                )}
              </span>
            </li>
            <li>
              <span>
                <b>④ 专题追踪</b>
                <Link className="key-link" href="/topics">专题追踪</Link> 页输入关键词立项（如「固态电池」），
                AI 围绕该词独立抓取四引擎 + 微博站内搜索，产出专题专属报告，不混入头版刊号。
              </span>
            </li>
          </ol>
        </section>
        <GazetteBoard />
      </main>
    </>
  );
}

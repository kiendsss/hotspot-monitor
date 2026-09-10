import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '热点观察哨·热频日报',
  description: '多来源热点采集 × OpenRouter AI 识别的复古报刊风热点监控站',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      {/* 强制 zh-CN 与显式 charset，杜绝浏览器回退到 windows-1252 导致的乱码 */}
      <body>{children}</body>
    </html>
  );
}
